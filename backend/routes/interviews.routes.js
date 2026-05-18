const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

const VALID_STATUS = ['agendada', 'em_andamento', 'concluida', 'cancelada'];

// Lista entrevistas (admin) com info do candidato
router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { status, candidate_id } = req.query;
    let sql = `SELECT i.id, i.candidate_id, i.phase, i.method, i.interviewer_id,
                      i.scheduled_at, i.completed_at, i.status, i.score,
                      i.technical_score, i.behavioral_score, i.cultural_fit_score,
                      i.recommendation, i.notes, i.test_template, i.test_score,
                      i.test_total, i.test_correct, i.candidate_name_snapshot,
                      i.created_at, i.report,
                      r.candidate_name, r.position_title, r.candidate_email
               FROM interviews i
               LEFT JOIN recruitment r ON i.candidate_id = r.id
               WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (candidate_id) { sql += ' AND i.candidate_id = ?'; params.push(parseInt(candidate_id)); }
    sql += ' ORDER BY COALESCE(i.scheduled_at, i.created_at) DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        res.json(rows);
    });
});

// Detalhe de uma entrevista
router.get('/:id', verifyToken, requireAdmin, (req, res) => {
    db.get(
        `SELECT i.*, r.candidate_name, r.position_title, r.candidate_email,
                r.candidate_phone
         FROM interviews i
         LEFT JOIN recruitment r ON i.candidate_id = r.id
         WHERE i.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Nao encontrada' });
            res.json(row);
        }
    );
});

// Criar / agendar entrevista
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const {
        candidate_id, candidate_name_snapshot, phase, method,
        scheduled_at, notes, status
    } = req.body;

    if (!phase) return res.status(400).json({ error: 'Fase obrigatoria (1, 2 ou 3)' });
    if (!candidate_id && !candidate_name_snapshot) {
        return res.status(400).json({ error: 'Forneca candidate_id ou candidate_name_snapshot' });
    }

    const st = VALID_STATUS.includes(status) ? status : 'agendada';

    db.run(
        `INSERT INTO interviews (candidate_id, candidate_name_snapshot, phase, method,
                                  interviewer_id, scheduled_at, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            candidate_id || null, candidate_name_snapshot || null,
            parseInt(phase), method || null, req.user.id,
            scheduled_at || null, st, notes || null
        ],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            addAuditLog(req.user.id, 'CREATE', 'interviews', this.lastID,
                `Entrevista agendada - fase ${phase}`);
            res.status(201).json({ id: this.lastID, status: st });
        }
    );
});

// Atualizar entrevista (notes, scores, recommendation, scheduled_at, etc.)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const allowed = [
        'phase', 'method', 'scheduled_at', 'completed_at', 'status',
        'score', 'technical_score', 'behavioral_score', 'cultural_fit_score',
        'report', 'recommendation', 'notes', 'candidate_name_snapshot'
    ];
    const sets = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) {
            if (f === 'status' && !VALID_STATUS.includes(req.body[f])) return;
            sets.push(`${f} = ?`);
            vals.push(req.body[f] === '' ? null : req.body[f]);
        }
    });
    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(req.params.id);

    db.run(`UPDATE interviews SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
        addAuditLog(req.user.id, 'UPDATE', 'interviews', req.params.id, 'Entrevista atualizada');
        res.json({ message: 'Atualizada' });
    });
});

// Mudar status rapidamente
router.patch('/:id/status', verifyToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Status invalido' });

    const completedAt = status === 'concluida' ? "datetime('now')" : 'completed_at';
    // Usar UPDATE com CURRENT_TIMESTAMP literal para compatibilidade
    db.run(
        `UPDATE interviews SET status = ?, completed_at = CASE WHEN ? = 'concluida' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ?`,
        [status, status, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
            addAuditLog(req.user.id, 'UPDATE', 'interviews', req.params.id, `Status -> ${status}`);
            res.json({ message: 'Atualizada', status });
        }
    );
});

// Submeter resultado de teste (auto-calcula score)
router.post('/:id/test', verifyToken, requireAdmin, (req, res) => {
    const { test_template, answers } = req.body;
    if (!test_template) return res.status(400).json({ error: 'test_template obrigatorio' });
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers deve ser array' });

    const correctAnswers = TEST_CORRECTIONS[test_template];
    if (!correctAnswers) return res.status(400).json({ error: 'Template de teste desconhecido' });

    const total = correctAnswers.length;
    let correct = 0;
    for (let i = 0; i < total; i++) {
        if (answers[i] !== undefined && answers[i] !== null &&
            String(answers[i]) === String(correctAnswers[i])) {
            correct++;
        }
    }
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    db.run(
        `UPDATE interviews
         SET test_template = ?, test_answers = ?, test_score = ?,
             test_total = ?, test_correct = ?,
             status = CASE WHEN status = 'agendada' THEN 'concluida' ELSE status END,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE id = ?`,
        [test_template, JSON.stringify(answers), score, total, correct, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
            addAuditLog(req.user.id, 'TEST', 'interviews', req.params.id,
                `Teste ${test_template}: ${correct}/${total} (${score}%)`);
            res.json({ message: 'Teste registado', score, correct, total });
        }
    );
});

// Eliminar entrevista
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM interviews WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
        addAuditLog(req.user.id, 'DELETE', 'interviews', req.params.id, 'Entrevista eliminada');
        res.json({ message: 'Eliminada' });
    });
});

// === GABARITOS DOS TESTES (server-side, nao expostos ao frontend) ===
// Frontend so envia respostas, server calcula score.
const TEST_CORRECTIONS = {
    // 20 V/F. V=true, F=false
    admin_ch: [
        'V', 'F', 'V', 'V', 'V', 'F', 'V', 'F', 'V', 'V',
        'F', 'V', 'V', 'V', 'F', 'V', 'V', 'F', 'V', 'V'
    ],
    // 20 perguntas, indice 0-3 da resposta correcta
    ti: [
        1,  // Reverter a atualização
        2,  // DHCP
        2,  // SELECT
        0,  // 2 MB
        1,  // 18 000
        1,  // Switch
        1,  // Central Processing Unit
        0,  // Linux
        1,  // Proteger sistema
        2,  // .xlsx
        1,  // Lentidao
        1,  // Ping
        1,  // Bloquear acessos
        1,  // Sofrer ataques
        2,  // Teclado
        1,  // Recuperar dados
        0,  // HTML
        1,  // Traduzir DNS
        0,  // Verdadeiro
        0   // Verdadeiro
    ]
};

module.exports = router;
