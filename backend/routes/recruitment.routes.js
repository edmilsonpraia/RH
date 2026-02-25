const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar candidaturas (Admin)
router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { status } = req.query;

    let query = "SELECT * FROM recruitment";
    const params = [];

    if (status) {
        query += " WHERE status = ?";
        params.push(status);
    }

    query += " ORDER BY applied_date DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar candidaturas' });
        }
        res.json(rows);
    });
});

// Criar candidatura (Admin)
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const { positionTitle, candidateName, candidateEmail, candidatePhone, notes } = req.body;

    if (!positionTitle || !candidateName || !candidateEmail) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    db.run(
        `INSERT INTO recruitment (position_title, candidate_name, candidate_email, candidate_phone, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [positionTitle, candidateName, candidateEmail, candidatePhone, notes],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao criar candidatura' });
            }

            addAuditLog(req.user.id, 'CREATE', 'recruitment', this.lastID, `Candidato: ${candidateName}`);

            res.status(201).json({
                message: 'Candidatura criada com sucesso',
                candidateId: this.lastID
            });
        }
    );
});

// Atualizar status de candidatura (Admin)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status é obrigatório' });
    }

    db.run(
        "UPDATE recruitment SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, notes, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar candidatura' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Candidatura não encontrada' });
            }

            addAuditLog(req.user.id, 'UPDATE', 'recruitment', id, `Status: ${status}`);

            res.json({ message: 'Candidatura atualizada' });
        }
    );
});

// Eliminar candidatura (Admin)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM recruitment WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao eliminar candidatura' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Candidatura não encontrada' });
        }

        addAuditLog(req.user.id, 'DELETE', 'recruitment', id, 'Candidatura eliminada');

        res.json({ message: 'Candidatura eliminada' });
    });
});

module.exports = router;
