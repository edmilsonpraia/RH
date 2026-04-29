const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar terminations
router.get('/', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT t.*, e.name as employee_name, e.meca, e.department, e.position
         FROM terminations t
         JOIN employees e ON t.employee_id = e.id
         ORDER BY t.effective_date DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json(rows);
        }
    );
});

// Criar termination
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const {
        employee_id, type, notice_date, effective_date, notice_period_days,
        severance_amount, final_settlement, reason
    } = req.body;

    if (!employee_id || !type || !effective_date) {
        return res.status(400).json({ error: 'Campos obrigatorios: employee_id, type, effective_date' });
    }

    db.run(
        `INSERT INTO terminations
            (employee_id, type, initiated_by, notice_date, effective_date,
             notice_period_days, severance_amount, final_settlement, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee_id, type, req.user.id, notice_date, effective_date,
         notice_period_days, severance_amount, final_settlement, reason],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Colaborador ja tem processo de saida ativo' });
                }
                return res.status(500).json({ error: 'Erro: ' + err.message });
            }

            // Marcar colaborador como inactive
            db.run("UPDATE employees SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [employee_id]);

            addAuditLog(req.user.id, 'CREATE', 'terminations', this.lastID, `Saida iniciada: tipo ${type}`);
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Atualizar checklist (entregas, certificados, etc.)
router.put('/:id/checklist', verifyToken, requireAdmin, (req, res) => {
    const allowed = ['work_certificate_issued', 'equipment_returned', 'equipment_pending_value',
                     'internal_communication_sent', 'inspection_notified', 'final_settlement'];
    const sets = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(req.params.id);

    db.run(`UPDATE terminations SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro' });
        addAuditLog(req.user.id, 'UPDATE', 'terminations', req.params.id, 'Checklist atualizado');
        res.json({ message: 'Atualizado' });
    });
});

module.exports = router;
