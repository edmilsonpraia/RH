const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar avaliacoes
router.get('/', verifyToken, (req, res) => {
    const { employee_id, period, status } = req.query;
    let sql = `SELECT ev.*, e.name as employee_name, e.meca, e.department, e.position,
                      u.username as evaluator_name
               FROM employee_evaluations ev
               JOIN employees e ON ev.employee_id = e.id
               LEFT JOIN users u ON ev.evaluator_id = u.id
               WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') {
        sql += ' AND ev.employee_id = ?';
        params.push(req.user.employeeId);
    } else if (employee_id) {
        sql += ' AND ev.employee_id = ?';
        params.push(employee_id);
    }
    if (period) { sql += ' AND ev.period = ?'; params.push(period); }
    if (status) { sql += ' AND ev.status = ?'; params.push(status); }
    sql += ' ORDER BY ev.evaluation_date DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        res.json(rows);
    });
});

// 9-Box matrix - posicao mais recente de cada colaborador
router.get('/nine-box', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT e.id as employee_id, e.name, e.meca, e.department, e.position, e.site,
                ev.performance_rating, ev.potential_rating, ev.evaluation_date, ev.period
         FROM employees e
         LEFT JOIN employee_evaluations ev ON ev.id = (
             SELECT id FROM employee_evaluations
             WHERE employee_id = e.id AND status IN ('partilhado','assinado','fechado')
             ORDER BY evaluation_date DESC LIMIT 1
         )
         WHERE e.status = 'active' AND ev.performance_rating IS NOT NULL AND ev.potential_rating IS NOT NULL
         ORDER BY ev.performance_rating DESC, ev.potential_rating DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json(rows);
        }
    );
});

// Historial de um colaborador
router.get('/employee/:id/history', verifyToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.employeeId != req.params.id) {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    db.all(
        `SELECT ev.*, u.username as evaluator_name
         FROM employee_evaluations ev
         LEFT JOIN users u ON ev.evaluator_id = u.id
         WHERE ev.employee_id = ?
         ORDER BY ev.evaluation_date DESC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json(rows);
        }
    );
});

// Detalhe
router.get('/:id', verifyToken, (req, res) => {
    db.get(
        `SELECT ev.*, e.name as employee_name, e.meca, e.department, e.position,
                u.username as evaluator_name
         FROM employee_evaluations ev
         JOIN employees e ON ev.employee_id = e.id
         LEFT JOIN users u ON ev.evaluator_id = u.id
         WHERE ev.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Avaliacao nao encontrada' });
            if (req.user.role !== 'admin' && req.user.employeeId !== row.employee_id) {
                return res.status(403).json({ error: 'Acesso negado' });
            }
            res.json(row);
        }
    );
});

// Criar
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const allowed = ['employee_id','period','evaluation_date','performance_rating','potential_rating',
        'technical_score','behavioral_score','leadership_score','results_score',
        'strengths','areas_to_improve','goals_set','goals_achieved','development_plan',
        'feedback_summary','manager_comments','status'];
    if (!req.body.employee_id || !req.body.period || !req.body.evaluation_date) {
        return res.status(400).json({ error: 'Campos obrigatorios: employee_id, period, evaluation_date' });
    }
    const cols = ['evaluator_id'];
    const vals = [req.user.id];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) { cols.push(f); vals.push(req.body[f]); }
    });
    const placeholders = cols.map(() => '?').join(', ');
    db.run(
        `INSERT INTO employee_evaluations (${cols.join(', ')}) VALUES (${placeholders})`,
        vals,
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            addAuditLog(req.user.id, 'CREATE', 'employee_evaluations', this.lastID,
                `Avaliacao do colaborador ${req.body.employee_id} - ${req.body.period}`);
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Atualizar
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const allowed = ['period','evaluation_date','performance_rating','potential_rating',
        'technical_score','behavioral_score','leadership_score','results_score',
        'strengths','areas_to_improve','goals_set','goals_achieved','development_plan',
        'feedback_summary','manager_comments','employee_comments','status',
        'signed_by_employee','signed_by_manager'];
    const sets = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);
    db.run(`UPDATE employee_evaluations SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrado' });
        addAuditLog(req.user.id, 'UPDATE', 'employee_evaluations', req.params.id, 'Avaliacao atualizada');
        res.json({ message: 'Atualizado' });
    });
});

// Estatisticas globais
router.get('/stats/global', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT performance_rating, COUNT(*) as n FROM employee_evaluations
         WHERE status IN ('partilhado','assinado','fechado')
         GROUP BY performance_rating`,
        (err, byPerf) => {
            db.all(
                `SELECT department, AVG(performance_rating) as avg_perf, COUNT(*) as n
                 FROM employee_evaluations ev JOIN employees e ON ev.employee_id = e.id
                 WHERE ev.status IN ('partilhado','assinado','fechado')
                 GROUP BY department ORDER BY avg_perf DESC`,
                (e2, byDept) => {
                    res.json({ byPerformance: byPerf || [], byDepartment: byDept || [] });
                }
            );
        }
    );
});

module.exports = router;
