const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// KPIs do dashboard de R&S
router.get('/kpis', verifyToken, requireAdmin, (req, res) => {
    const result = {};

    const queries = [
        ['active_requisitions', "SELECT COUNT(*) as n FROM job_requisitions WHERE status IN ('publicado','aprovado_admin')"],
        ['pending_requisitions', "SELECT COUNT(*) as n FROM job_requisitions WHERE status IN ('submetido','aprovado_dch')"],
        ['filled_requisitions', "SELECT COUNT(*) as n FROM job_requisitions WHERE status = 'preenchido'"],
        ['active_candidates', "SELECT COUNT(*) as n FROM recruitment WHERE status IN ('novo','triagem','entrevista')"],
        ['hired_this_month', "SELECT COUNT(*) as n FROM recruitment WHERE status = 'aprovado' AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')"],
        ['rejected_this_month', "SELECT COUNT(*) as n FROM recruitment WHERE status = 'rejeitado' AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')"]
    ];

    let pending = queries.length;
    queries.forEach(([key, sql]) => {
        db.get(sql, (err, row) => {
            result[key] = err ? 0 : (row ? row.n : 0);
            if (--pending === 0) {
                // Funil de conversao
                db.all(
                    "SELECT status, COUNT(*) as n FROM recruitment GROUP BY status",
                    (e, rows) => {
                        result.funnel = (rows || []).reduce((acc, r) => { acc[r.status] = r.n; return acc; }, {});
                        res.json(result);
                    }
                );
            }
        });
    });
});

// Tempo medio entre submissao e aprovacao
router.get('/time-to-approve', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT r.code, r.created_at, r.updated_at,
                CAST((julianday(r.updated_at) - julianday(r.created_at)) AS INTEGER) as days
         FROM job_requisitions r
         WHERE r.status IN ('publicado','preenchido','aprovado_admin')
         ORDER BY r.updated_at DESC LIMIT 50`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            const avg = rows.length ? (rows.reduce((s, r) => s + (r.days || 0), 0) / rows.length).toFixed(1) : 0;
            res.json({ items: rows, average_days: avg });
        }
    );
});

module.exports = router;
