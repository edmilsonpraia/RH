const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar talentos
router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { status, source, area, search, tag } = req.query;
    let sql = `SELECT id, name, email, phone, position_of_interest, area, source,
                      skills, education, experience_years, current_employer, expected_salary,
                      location, status, tags, rating, consent_given, consent_expiry_date,
                      created_at, last_contacted_at, archived_at,
                      cv_file_name, (CASE WHEN cv_text IS NOT NULL THEN 1 ELSE 0 END) as has_cv
               FROM talent_pool WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (source) { sql += ' AND source = ?'; params.push(source); }
    if (area) { sql += ' AND area = ?'; params.push(area); }
    if (tag) { sql += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
    if (search) {
        sql += ' AND (name LIKE ? OR email LIKE ? OR position_of_interest LIKE ? OR skills LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    sql += ' ORDER BY rating DESC NULLS LAST, created_at DESC LIMIT 500';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        res.json(rows);
    });
});

// Stats
router.get('/stats', verifyToken, requireAdmin, (req, res) => {
    db.all(
        "SELECT status, COUNT(*) as n FROM talent_pool GROUP BY status",
        (err, byStatus) => {
            db.all(
                "SELECT source, COUNT(*) as n FROM talent_pool WHERE source IS NOT NULL GROUP BY source ORDER BY n DESC LIMIT 10",
                (e, bySource) => {
                    db.get(
                        "SELECT COUNT(*) as total FROM talent_pool",
                        (e2, total) => {
                            res.json({
                                total: total ? total.total : 0,
                                byStatus: byStatus || [],
                                bySource: bySource || []
                            });
                        }
                    );
                }
            );
        }
    );
});

// Detalhe (inclui CV completo)
router.get('/:id', verifyToken, requireAdmin, (req, res) => {
    db.get("SELECT * FROM talent_pool WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (!row) return res.status(404).json({ error: 'Talento nao encontrado' });
        res.json(row);
    });
});

// Criar
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const allowed = ['name','email','phone','position_of_interest','area','source',
        'cv_text','cv_file_name','cv_file_data','cv_mime_type','documents',
        'skills','education','experience_years',
        'current_employer','expected_salary','location','status','tags','notes','rating',
        'consent_given','consent_expiry_date'];
    const cols = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) { cols.push(f); vals.push(req.body[f]); }
    });
    if (!req.body.name) return res.status(400).json({ error: 'Nome obrigatorio' });

    const placeholders = cols.map(() => '?').join(', ');
    db.run(
        `INSERT INTO talent_pool (${cols.join(', ')}) VALUES (${placeholders})`,
        vals,
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            addAuditLog(req.user.id, 'CREATE', 'talent_pool', this.lastID, `Talento: ${req.body.name}`);
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Atualizar
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const allowed = ['name','email','phone','position_of_interest','area','source',
        'cv_text','cv_file_name','cv_file_data','cv_mime_type','documents',
        'skills','education','experience_years',
        'current_employer','expected_salary','location','status','tags','notes','rating',
        'consent_given','consent_expiry_date','last_contacted_at','last_contacted_by'];
    const sets = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(req.params.id);

    db.run(`UPDATE talent_pool SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrado' });
        addAuditLog(req.user.id, 'UPDATE', 'talent_pool', req.params.id, 'Talento atualizado');
        res.json({ message: 'Atualizado' });
    });
});

// Marcar como contactado
router.post('/:id/contact', verifyToken, requireAdmin, (req, res) => {
    db.run(
        `UPDATE talent_pool SET last_contacted_at = CURRENT_TIMESTAMP,
                                last_contacted_by = ?,
                                status = CASE WHEN status = 'ativo' THEN 'contactado' ELSE status END
         WHERE id = ?`,
        [req.user.id, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            addAuditLog(req.user.id, 'CONTACT', 'talent_pool', req.params.id, 'Talento contactado');
            res.json({ message: 'Marcado como contactado' });
        }
    );
});

// Converter em candidato (move para tabela recruitment)
router.post('/:id/convert', verifyToken, requireAdmin, (req, res) => {
    const { position_title } = req.body;
    db.get("SELECT * FROM talent_pool WHERE id = ?", [req.params.id], (err, t) => {
        if (err || !t) return res.status(404).json({ error: 'Talento nao encontrado' });
        db.run(
            `INSERT INTO recruitment (position_title, candidate_name, candidate_email, candidate_phone, status, notes)
             VALUES (?, ?, ?, ?, 'novo', ?)`,
            [position_title || t.position_of_interest || 'A definir', t.name, t.email || `talent${t.id}@noemail.local`, t.phone, t.notes],
            function(e) {
                if (e) return res.status(500).json({ error: 'Erro ao converter: ' + e.message });
                db.run("UPDATE talent_pool SET status = 'em_processo' WHERE id = ?", [req.params.id]);
                addAuditLog(req.user.id, 'CONVERT', 'talent_pool', req.params.id, `Convertido em candidato (rec ${this.lastID})`);
                res.status(201).json({ candidateId: this.lastID, message: 'Talento convertido em candidato' });
            }
        );
    });
});

// Download do CV (binario inline)
router.get('/:id/cv', verifyToken, requireAdmin, (req, res) => {
    db.get(
        "SELECT cv_file_name, cv_file_data, cv_mime_type, name FROM talent_pool WHERE id = ?",
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row || !row.cv_file_data) return res.status(404).json({ error: 'CV nao encontrado' });
            const buf = Buffer.from(row.cv_file_data, 'base64');
            res.setHeader('Content-Type', row.cv_mime_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.cv_file_name || 'cv')}"`);
            res.send(buf);
        }
    );
});

// Download de documento individual
router.get('/:id/documents/:idx', verifyToken, requireAdmin, (req, res) => {
    db.get("SELECT documents FROM talent_pool WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Nao encontrado' });
        let docs = [];
        try { docs = JSON.parse(row.documents || '[]'); } catch {}
        const doc = docs[parseInt(req.params.idx)];
        if (!doc || !doc.data) return res.status(404).json({ error: 'Documento nao encontrado' });
        const buf = Buffer.from(doc.data, 'base64');
        res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name || 'documento')}"`);
        res.send(buf);
    });
});

// Eliminar (so arquivados ou indisponiveis - LGPD)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    db.run(
        "DELETE FROM talent_pool WHERE id = ? AND status IN ('arquivado','indisponivel')",
        [req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(400).json({ error: 'Apenas talentos arquivados/indisponiveis podem ser eliminados (LGPD)' });
            addAuditLog(req.user.id, 'DELETE', 'talent_pool', req.params.id, 'Talento eliminado');
            res.json({ message: 'Eliminado' });
        }
    );
});

module.exports = router;
