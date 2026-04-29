const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { limit = 100, action, table_name, user_id } = req.query;
    let sql = `SELECT al.*, u.username
               FROM audit_logs al
               LEFT JOIN users u ON al.user_id = u.id
               WHERE 1=1`;
    const params = [];
    if (action) { sql += ' AND al.action = ?'; params.push(action); }
    if (table_name) { sql += ' AND al.table_name = ?'; params.push(table_name); }
    if (user_id) { sql += ' AND al.user_id = ?'; params.push(user_id); }
    sql += ' ORDER BY al.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json(rows);
    });
});

module.exports = router;
