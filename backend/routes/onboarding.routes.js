const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar processos de onboarding/offboarding
router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { type, status } = req.query;

    let query = `SELECT o.*, e.name as employee_name, e.position, e.department
                 FROM onboarding o
                 JOIN employees e ON o.employee_id = e.id
                 WHERE 1=1`;
    const params = [];

    if (type) {
        query += " AND o.type = ?";
        params.push(type);
    }

    if (status) {
        query += " AND o.status = ?";
        params.push(status);
    }

    query += " ORDER BY o.started_at DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar processos' });
        }

        // Parse checklist JSON
        const processedRows = rows.map(row => ({
            ...row,
            checklist: JSON.parse(row.checklist || '[]')
        }));

        res.json(processedRows);
    });
});

// Criar processo de onboarding
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const { employeeId, type, checklist } = req.body;

    if (!employeeId || !type || !checklist) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    if (!['onboarding', 'offboarding'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido' });
    }

    db.run(
        "INSERT INTO onboarding (employee_id, type, checklist, status) VALUES (?, ?, ?, 'pendente')",
        [employeeId, type, JSON.stringify(checklist)],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao criar processo' });
            }

            addAuditLog(req.user.id, 'CREATE', 'onboarding', this.lastID, `Processo ${type} criado`);

            res.status(201).json({
                message: 'Processo criado com sucesso',
                processId: this.lastID
            });
        }
    );
});

// Atualizar checklist
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { checklist, status } = req.body;

    if (!checklist) {
        return res.status(400).json({ error: 'Checklist é obrigatória' });
    }

    // Calcular se está concluído
    const allCompleted = checklist.every(item => item.completed);
    const finalStatus = status || (allCompleted ? 'concluido' : 'em_progresso');
    const completedAt = allCompleted ? new Date().toISOString() : null;

    db.run(
        "UPDATE onboarding SET checklist = ?, status = ?, completed_at = ? WHERE id = ?",
        [JSON.stringify(checklist), finalStatus, completedAt, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar processo' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Processo não encontrado' });
            }

            addAuditLog(req.user.id, 'UPDATE', 'onboarding', id, `Status: ${finalStatus}`);

            res.json({ message: 'Processo atualizado', status: finalStatus });
        }
    );
});

// Eliminar processo
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM onboarding WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao eliminar processo' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Processo não encontrado' });
        }

        addAuditLog(req.user.id, 'DELETE', 'onboarding', id, 'Processo eliminado');

        res.json({ message: 'Processo eliminado' });
    });
});

module.exports = router;
