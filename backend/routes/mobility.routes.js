const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar pedidos de mobilidade
router.get('/', verifyToken, (req, res) => {
    let sql = `SELECT m.*, e.name as employee_name, e.meca
               FROM mobility_requests m
               JOIN employees e ON m.employee_id = e.id`;
    const params = [];
    if (req.user.role !== 'admin') {
        sql += ' WHERE m.employee_id = ?';
        params.push(req.user.employeeId);
    }
    sql += ' ORDER BY m.requested_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json(rows);
    });
});

// Criar pedido
router.post('/', verifyToken, (req, res) => {
    const {
        employee_id, from_department, to_department, from_site, to_site,
        from_position, to_position, reason, qhsa_required
    } = req.body;

    const empId = employee_id || req.user.employeeId;
    if (!empId || !from_department || !to_department) {
        return res.status(400).json({ error: 'Campos obrigatorios em falta' });
    }

    db.run(
        `INSERT INTO mobility_requests
            (employee_id, from_department, to_department, from_site, to_site,
             from_position, to_position, reason, qhsa_required)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [empId, from_department, to_department, from_site, to_site,
         from_position, to_position, reason, qhsa_required ? 1 : 0],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            addAuditLog(req.user.id, 'CREATE', 'mobility_requests', this.lastID,
                `Mobilidade: ${from_department} -> ${to_department}`);
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Decidir (admin)
router.put('/:id/decide', verifyToken, requireAdmin, (req, res) => {
    const { status, decision_comments, qhsa_assessment } = req.body;
    if (!['aprovado', 'rejeitado'].includes(status)) {
        return res.status(400).json({ error: 'Status invalido' });
    }

    db.run(
        `UPDATE mobility_requests
         SET status = ?, decision_comments = ?, qhsa_assessment = ?,
             decided_at = CURRENT_TIMESTAMP, decided_by = ?
         WHERE id = ?`,
        [status, decision_comments || null, qhsa_assessment || null, req.user.id, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrado' });

            // Se aprovado, atualizar departamento do colaborador
            if (status === 'aprovado') {
                db.get("SELECT * FROM mobility_requests WHERE id = ?", [req.params.id], (e, mob) => {
                    if (mob) {
                        db.run(
                            "UPDATE employees SET department = ?, site = COALESCE(?, site), position = COALESCE(?, position), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                            [mob.to_department, mob.to_site, mob.to_position, mob.employee_id]
                        );
                    }
                });
            }

            addAuditLog(req.user.id, 'DECISION', 'mobility_requests', req.params.id, `Status: ${status}`);
            res.json({ message: `Mobilidade ${status}` });
        }
    );
});

module.exports = router;
