const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar avaliações
router.get('/', verifyToken, (req, res) => {
    const { employeeId } = req.query;

    let query = `SELECT p.*, e.name as employee_name, u.username as reviewer_name
                 FROM performance p
                 JOIN employees e ON p.employee_id = e.id
                 JOIN users u ON p.reviewer_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (req.user.role !== 'admin') {
        query += " AND p.employee_id = ?";
        params.push(req.user.employeeId);
    } else if (employeeId) {
        query += " AND p.employee_id = ?";
        params.push(employeeId);
    }

    query += " ORDER BY p.review_date DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar avaliações' });
        }
        res.json(rows);
    });
});

// Criar avaliação (Admin)
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const { employeeId, reviewDate, rating, feedback, goals } = req.body;

    if (!employeeId || !reviewDate || !rating) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating deve estar entre 1 e 5' });
    }

    db.run(
        `INSERT INTO performance (employee_id, review_date, reviewer_id, rating, feedback, goals)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [employeeId, reviewDate, req.user.id, rating, feedback, goals],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao criar avaliação' });
            }

            addAuditLog(req.user.id, 'CREATE', 'performance', this.lastID, `Avaliação: Rating ${rating}`);

            res.status(201).json({
                message: 'Avaliação criada com sucesso',
                reviewId: this.lastID
            });
        }
    );
});

// Atualizar avaliação (Admin)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { rating, feedback, goals } = req.body;

    db.run(
        "UPDATE performance SET rating = ?, feedback = ?, goals = ? WHERE id = ?",
        [rating, feedback, goals, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar avaliação' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Avaliação não encontrada' });
            }

            addAuditLog(req.user.id, 'UPDATE', 'performance', id, 'Avaliação atualizada');

            res.json({ message: 'Avaliação atualizada' });
        }
    );
});

module.exports = router;
