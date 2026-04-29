const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar candidaturas (sem o blob do CV, so metadata)
router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { status } = req.query;

    let query = `SELECT id, position_title, candidate_name, candidate_email, candidate_phone,
                        status, applied_date, notes, updated_at, cv_file_name, cv_mime_type,
                        (CASE WHEN cv_file_data IS NOT NULL THEN 1 ELSE 0 END) as has_cv,
                        documents
                 FROM recruitment`;
    const params = [];

    if (status) {
        query += " WHERE status = ?";
        params.push(status);
    }

    query += " ORDER BY applied_date DESC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar candidaturas' });
        // Parsear documents JSON e contar apenas
        const out = (rows || []).map(r => {
            let docCount = 0;
            try { docCount = (JSON.parse(r.documents || '[]')).length; } catch {}
            return { ...r, documents_count: docCount, documents: undefined };
        });
        res.json(out);
    });
});

// Detalhe (sem blob, com metadata dos docs)
router.get('/:id', verifyToken, requireAdmin, (req, res) => {
    db.get(
        `SELECT id, position_title, candidate_name, candidate_email, candidate_phone,
                status, applied_date, notes, updated_at, cv_file_name, cv_mime_type,
                (CASE WHEN cv_file_data IS NOT NULL THEN 1 ELSE 0 END) as has_cv,
                documents
         FROM recruitment WHERE id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Candidato nao encontrado' });
            let docs = [];
            try {
                docs = (JSON.parse(row.documents || '[]')).map((d, idx) => ({
                    idx, name: d.name, mime: d.mime, size: d.size
                }));
            } catch {}
            res.json({ ...row, documents: docs });
        }
    );
});

// Criar
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const {
        positionTitle, candidateName, candidateEmail, candidatePhone, notes,
        cv_file_name, cv_file_data, cv_mime_type, documents
    } = req.body;

    if (!positionTitle || !candidateName || !candidateEmail) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    const docsJson = Array.isArray(documents) ? JSON.stringify(documents) : null;

    db.run(
        `INSERT INTO recruitment (position_title, candidate_name, candidate_email, candidate_phone,
                                  notes, cv_file_name, cv_file_data, cv_mime_type, documents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [positionTitle, candidateName, candidateEmail, candidatePhone, notes,
         cv_file_name || null, cv_file_data || null, cv_mime_type || null, docsJson],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao criar: ' + err.message });
            addAuditLog(req.user.id, 'CREATE', 'recruitment', this.lastID, `Candidato: ${candidateName}`);
            res.status(201).json({ message: 'Criado', candidateId: this.lastID });
        }
    );
});

// Atualizar
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const allowed = ['status', 'notes', 'position_title', 'candidate_name', 'candidate_email',
                     'candidate_phone', 'cv_file_name', 'cv_file_data', 'cv_mime_type'];
    const sets = [];
    const vals = [];

    // Suporta legacy keys (positionTitle...)
    const map = {
        positionTitle: 'position_title',
        candidateName: 'candidate_name',
        candidateEmail: 'candidate_email',
        candidatePhone: 'candidate_phone'
    };
    Object.entries(req.body).forEach(([k, v]) => {
        const col = map[k] || k;
        if (allowed.includes(col) && v !== undefined) {
            sets.push(`${col} = ?`);
            vals.push(v);
        }
    });

    if (req.body.documents !== undefined) {
        sets.push('documents = ?');
        vals.push(Array.isArray(req.body.documents) ? JSON.stringify(req.body.documents) : null);
    }

    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);

    db.run(`UPDATE recruitment SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrado' });
        addAuditLog(req.user.id, 'UPDATE', 'recruitment', req.params.id, 'Atualizado');
        res.json({ message: 'Atualizado' });
    });
});

// Eliminar
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    db.run("DELETE FROM recruitment WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrado' });
        addAuditLog(req.user.id, 'DELETE', 'recruitment', req.params.id, 'Candidatura eliminada');
        res.json({ message: 'Eliminada' });
    });
});

// Download do CV (binario)
router.get('/:id/cv', verifyToken, requireAdmin, (req, res) => {
    db.get(
        "SELECT cv_file_name, cv_file_data, cv_mime_type, candidate_name FROM recruitment WHERE id = ?",
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
    db.get("SELECT documents FROM recruitment WHERE id = ?", [req.params.id], (err, row) => {
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

module.exports = router;
