const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Relatório de headcount
router.get('/headcount', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT
            department,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
         FROM employees
         GROUP BY department`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao gerar relatório' });
            }

            db.get("SELECT COUNT(*) as total FROM employees WHERE status = 'active'", (err, total) => {
                res.json({
                    byDepartment: rows,
                    totalActive: total.total
                });
            });
        }
    );
});

// Relatório de absentismo
router.get('/absenteeism', verifyToken, requireAdmin, (req, res) => {
    const { month, year } = req.query;

    let query = `SELECT
                    e.name,
                    e.department,
                    COUNT(*) as absences,
                    SUM(CASE WHEN a.status = 'falta' THEN 1 ELSE 0 END) as unexcused,
                    SUM(CASE WHEN a.status = 'doenca' THEN 1 ELSE 0 END) as sick
                 FROM attendance a
                 JOIN employees e ON a.employee_id = e.id
                 WHERE a.status IN ('falta', 'doenca')`;

    const params = [];

    if (month && year) {
        query += " AND strftime('%m', a.date) = ? AND strftime('%Y', a.date) = ?";
        params.push(month.toString().padStart(2, '0'), year.toString());
    }

    query += " GROUP BY e.id ORDER BY absences DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao gerar relatório' });
        }
        res.json(rows);
    });
});

// Relatório de custos salariais
router.get('/payroll-costs', verifyToken, requireAdmin, (req, res) => {
    const { year } = req.query;

    let query = `SELECT
                    month,
                    year,
                    SUM(base_salary) as total_base,
                    SUM(bonuses) as total_bonuses,
                    SUM(deductions) as total_deductions,
                    SUM(net_salary) as total_net,
                    COUNT(*) as employees_count
                 FROM payroll`;

    const params = [];

    if (year) {
        query += " WHERE year = ?";
        params.push(year);
    }

    query += " GROUP BY year, month ORDER BY year DESC, month DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao gerar relatório' });
        }
        res.json(rows);
    });
});

// Relatório de recrutamento
router.get('/recruitment', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT
            status,
            COUNT(*) as count,
            position_title
         FROM recruitment
         GROUP BY status, position_title
         ORDER BY position_title, status`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao gerar relatório' });
            }
            res.json(rows);
        }
    );
});

// Logs de auditoria
router.get('/audit-logs', verifyToken, requireAdmin, (req, res) => {
    const { limit = 100 } = req.query;

    db.all(
        `SELECT al.*, u.username
         FROM audit_logs al
         JOIN users u ON al.user_id = u.id
         ORDER BY al.timestamp DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar logs' });
            }
            res.json(rows);
        }
    );
});

module.exports = router;
