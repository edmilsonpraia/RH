const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Gera codigo REQ-AAAA-NNN
function generateCode(callback) {
    const year = new Date().getFullYear();
    db.get(
        "SELECT COUNT(*) as n FROM job_requisitions WHERE code LIKE ?",
        [`REQ-${year}-%`],
        (err, row) => {
            const next = ((row && row.n) || 0) + 1;
            callback(`REQ-${year}-${String(next).padStart(3, '0')}`);
        }
    );
}

// Listar pedidos
router.get('/', verifyToken, (req, res) => {
    const { status, department, site } = req.query;
    let sql = `SELECT r.*, u.username as requester_name
               FROM job_requisitions r
               LEFT JOIN users u ON r.requested_by = u.id
               WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    if (department) { sql += ' AND r.department = ?'; params.push(department); }
    if (site) { sql += ' AND r.site = ?'; params.push(site); }
    sql += ' ORDER BY r.created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar pedidos' });
        res.json(rows);
    });
});

// Obter um pedido com aprovacoes
router.get('/:id', verifyToken, (req, res) => {
    db.get(
        `SELECT r.*, u.username as requester_name
         FROM job_requisitions r
         LEFT JOIN users u ON r.requested_by = u.id
         WHERE r.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Pedido nao encontrado' });
            db.all(
                "SELECT * FROM requisition_approvals WHERE requisition_id = ? ORDER BY decided_at DESC",
                [req.params.id],
                (err2, approvals) => {
                    res.json({ ...row, approvals: approvals || [] });
                }
            );
        }
    );
});

// Criar pedido
router.post('/', verifyToken, (req, res) => {
    const {
        department, position_title, activity_type, contract_type, site,
        headcount, justification, description, requirements,
        salary_range_min, salary_range_max, desired_start_date, status
    } = req.body;

    if (!department || !position_title) {
        return res.status(400).json({ error: 'Departamento e cargo sao obrigatorios' });
    }

    generateCode((code) => {
        db.run(
            `INSERT INTO job_requisitions
                (code, requested_by, department, position_title, activity_type, contract_type,
                 site, headcount, justification, description, requirements,
                 salary_range_min, salary_range_max, desired_start_date, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, req.user.id, department, position_title, activity_type, contract_type,
             site, headcount || 1, justification, description, requirements,
             salary_range_min, salary_range_max, desired_start_date, status || 'rascunho'],
            function(err) {
                if (err) return res.status(500).json({ error: 'Erro ao criar pedido: ' + err.message });
                addAuditLog(req.user.id, 'CREATE', 'job_requisitions', this.lastID, `Pedido ${code}: ${position_title}`);
                res.status(201).json({ id: this.lastID, code });
            }
        );
    });
});

// Atualizar pedido
router.put('/:id', verifyToken, (req, res) => {
    const allowed = ['department', 'position_title', 'activity_type', 'contract_type',
                     'site', 'headcount', 'justification', 'description', 'requirements',
                     'salary_range_min', 'salary_range_max', 'desired_start_date', 'status'];
    const sets = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);

    db.run(`UPDATE job_requisitions SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
        if (this.changes === 0) return res.status(404).json({ error: 'Pedido nao encontrado' });
        addAuditLog(req.user.id, 'UPDATE', 'job_requisitions', req.params.id, 'Pedido atualizado');
        res.json({ message: 'Atualizado' });
    });
});

// Submeter para aprovacao (rascunho -> submetido)
router.post('/:id/submit', verifyToken, (req, res) => {
    db.run(
        "UPDATE job_requisitions SET status = 'submetido', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'rascunho'",
        [req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(400).json({ error: 'So pedidos em rascunho podem ser submetidos' });
            addAuditLog(req.user.id, 'SUBMIT', 'job_requisitions', req.params.id, 'Submetido para aprovacao');
            res.json({ message: 'Submetido' });
        }
    );
});

// Decisao DCH ou Administracao
router.post('/:id/decision', verifyToken, requireAdmin, (req, res) => {
    const { role, decision, comments } = req.body;
    if (!['dch', 'administracao'].includes(role)) {
        return res.status(400).json({ error: 'Role invalido' });
    }
    if (!['aprovado', 'rejeitado'].includes(decision)) {
        return res.status(400).json({ error: 'Decisao invalida' });
    }

    db.run(
        `INSERT INTO requisition_approvals (requisition_id, approver_id, role, decision, comments)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, req.user.id, role, decision, comments || null],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });

            // Atualizar status do pedido
            let newStatus;
            if (decision === 'rejeitado') newStatus = 'rejeitado';
            else if (role === 'dch') newStatus = 'aprovado_dch';
            else if (role === 'administracao') newStatus = 'aprovado_admin';

            db.run(
                "UPDATE job_requisitions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [newStatus, req.params.id],
                () => {
                    addAuditLog(req.user.id, 'DECISION', 'job_requisitions', req.params.id,
                        `${role}: ${decision}`);
                    res.json({ message: 'Decisao registada', status: newStatus });
                }
            );
        }
    );
});

// Publicar (aprovado_admin -> publicado)
router.post('/:id/publish', verifyToken, requireAdmin, (req, res) => {
    db.run(
        "UPDATE job_requisitions SET status = 'publicado', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'aprovado_admin'",
        [req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(400).json({ error: 'Pedido tem de estar aprovado pela Administracao' });
            addAuditLog(req.user.id, 'PUBLISH', 'job_requisitions', req.params.id, 'Vaga publicada');
            res.json({ message: 'Publicada' });
        }
    );
});

// Eliminar (so rascunho)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    db.run(
        "DELETE FROM job_requisitions WHERE id = ? AND status IN ('rascunho','rejeitado','cancelado')",
        [req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(400).json({ error: 'So pedidos em rascunho/rejeitado/cancelado podem ser eliminados' });
            addAuditLog(req.user.id, 'DELETE', 'job_requisitions', req.params.id, 'Pedido eliminado');
            res.json({ message: 'Eliminado' });
        }
    );
});

module.exports = router;
