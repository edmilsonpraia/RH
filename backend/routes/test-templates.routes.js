const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Helper: parse questions JSON (Supabase devolve objecto; SQLite devolve string)
function parseQuestions(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return []; }
    }
    if (typeof v === 'object') return v;
    return [];
}

// GET /api/test-templates - listar templates
router.get('/', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT id, code, title, description, type, questions, is_active, is_builtin,
                created_by, created_at, updated_at
         FROM test_templates
         WHERE is_active = TRUE
         ORDER BY is_builtin DESC, title ASC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            const out = (rows || []).map(r => {
                const questions = parseQuestions(r.questions);
                return {
                    ...r,
                    questions,
                    questions_count: questions.length
                };
            });
            res.json(out);
        }
    );
});

// GET /api/test-templates/:id
router.get('/:id(\\d+)', verifyToken, requireAdmin, (req, res) => {
    db.get(
        `SELECT * FROM test_templates WHERE id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Não encontrado' });
            row.questions = parseQuestions(row.questions);
            res.json(row);
        }
    );
});

// POST /api/test-templates - criar
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const { code, title, description, type, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Título obrigatório' });
    if (!['vf', 'mc'].includes(type)) return res.status(400).json({ error: 'Tipo deve ser "vf" ou "mc"' });
    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Inclua pelo menos 1 pergunta' });
    }

    // Validar perguntas
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q || typeof q !== 'object' || !q.q) {
            return res.status(400).json({ error: `Pergunta ${i + 1} inválida (falta texto)` });
        }
        if (type === 'vf') {
            if (q.correct !== 'V' && q.correct !== 'F') {
                return res.status(400).json({ error: `Pergunta ${i + 1}: resposta deve ser "V" ou "F"` });
            }
        } else {
            if (!Array.isArray(q.options) || q.options.length < 2) {
                return res.status(400).json({ error: `Pergunta ${i + 1}: precisa pelo menos 2 opções` });
            }
            const c = parseInt(q.correct);
            if (isNaN(c) || c < 0 || c >= q.options.length) {
                return res.status(400).json({ error: `Pergunta ${i + 1}: índice de resposta inválido` });
            }
        }
    }

    // Gerar code se nao fornecido
    const finalCode = (code || ('custom_' + Date.now())).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    db.run(
        `INSERT INTO test_templates (code, title, description, type, questions, is_active, is_builtin, created_by)
         VALUES (?, ?, ?, ?, ?, TRUE, FALSE, ?)`,
        [finalCode, title, description || null, type, JSON.stringify(questions), req.user.id],
        function(err) {
            if (err) {
                if (err.message && err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Código de teste já existe. Use outro.' });
                }
                return res.status(500).json({ error: 'Erro: ' + err.message });
            }
            addAuditLog(req.user.id, 'CREATE', 'test_templates', this.lastID,
                `Template "${title}" criado (${questions.length} perguntas)`);
            res.status(201).json({ id: this.lastID, code: finalCode });
        }
    );
});

// PUT /api/test-templates/:id - atualizar
router.put('/:id(\\d+)', verifyToken, requireAdmin, (req, res) => {
    const { title, description, type, questions, is_active } = req.body;

    // Verificar se eh builtin (so admin pode editar metadata, nao questoes)
    db.get('SELECT is_builtin FROM test_templates WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (!row) return res.status(404).json({ error: 'Não encontrado' });

        const sets = [];
        const vals = [];

        if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
        if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
        if (is_active !== undefined) { sets.push('is_active = ?'); vals.push(is_active ? true : false); }

        // So permite alterar tipo/questions se nao for builtin
        if (!row.is_builtin) {
            if (type !== undefined) {
                if (!['vf', 'mc'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
                sets.push('type = ?'); vals.push(type);
            }
            if (questions !== undefined) {
                if (!Array.isArray(questions) || questions.length === 0) {
                    return res.status(400).json({ error: 'Questões inválidas' });
                }
                sets.push('questions = ?'); vals.push(JSON.stringify(questions));
            }
        }

        if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
        sets.push('updated_at = CURRENT_TIMESTAMP');
        vals.push(req.params.id);

        db.run(`UPDATE test_templates SET ${sets.join(', ')} WHERE id = ?`, vals, function(err2) {
            if (err2) return res.status(500).json({ error: 'Erro: ' + err2.message });
            addAuditLog(req.user.id, 'UPDATE', 'test_templates', req.params.id, 'Template atualizado');
            res.json({ message: 'Atualizado' });
        });
    });
});

// DELETE /api/test-templates/:id - so custom (nao builtin)
router.delete('/:id(\\d+)', verifyToken, requireAdmin, (req, res) => {
    db.get('SELECT is_builtin, title FROM test_templates WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (!row) return res.status(404).json({ error: 'Não encontrado' });
        if (row.is_builtin) return res.status(400).json({ error: 'Templates built-in não podem ser eliminados (use desativar)' });

        db.run('DELETE FROM test_templates WHERE id = ?', [req.params.id], function(err2) {
            if (err2) return res.status(500).json({ error: 'Erro' });
            addAuditLog(req.user.id, 'DELETE', 'test_templates', req.params.id, `Template "${row.title}" eliminado`);
            res.json({ message: 'Eliminado' });
        });
    });
});

module.exports = router;
