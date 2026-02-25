const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar todos os colaboradores (Admin) ou apenas o próprio (User)
router.get('/', verifyToken, (req, res) => {
    if (req.user.role === 'admin') {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const searchQuery = `%${search}%`;

        db.all(
            `SELECT * FROM employees
             WHERE name LIKE ? OR email LIKE ? OR department LIKE ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [searchQuery, searchQuery, searchQuery, limit, offset],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar colaboradores' });
                }

                db.get("SELECT COUNT(*) as total FROM employees", (err, count) => {
                    res.json({
                        employees: rows,
                        pagination: {
                            total: count.total,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            pages: Math.ceil(count.total / limit)
                        }
                    });
                });
            }
        );
    } else {
        // Usuário comum vê apenas seus próprios dados
        db.get(
            "SELECT * FROM employees WHERE id = ?",
            [req.user.employeeId],
            (err, row) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar dados' });
                }
                res.json({ employees: row ? [row] : [] });
            }
        );
    }
});

// Obter colaborador por ID
router.get('/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    // Usuário comum só pode ver seus próprios dados
    if (req.user.role !== 'admin' && req.user.employeeId != id) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    db.get("SELECT * FROM employees WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar colaborador' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Colaborador não encontrado' });
        }
        res.json(row);
    });
});

// Criar colaborador (apenas Admin)
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const { name, email, phone, position, department, salary, hireDate } = req.body;

    if (!name || !email || !position || !department || !salary || !hireDate) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    db.run(
        `INSERT INTO employees (name, email, phone, position, department, salary, hire_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, position, department, salary, hireDate],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Email já existe' });
                }
                return res.status(500).json({ error: 'Erro ao criar colaborador' });
            }

            addAuditLog(req.user.id, 'CREATE', 'employees', this.lastID, `Criado colaborador: ${name}`);

            res.status(201).json({
                message: 'Colaborador criado com sucesso',
                employeeId: this.lastID
            });
        }
    );
});

// Atualizar colaborador (apenas Admin)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, email, phone, position, department, salary, status } = req.body;

    db.run(
        `UPDATE employees
         SET name = ?, email = ?, phone = ?, position = ?, department = ?, salary = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, phone, position, department, salary, status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar colaborador' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }

            addAuditLog(req.user.id, 'UPDATE', 'employees', id, `Atualizado colaborador: ${name}`);

            res.json({ message: 'Colaborador atualizado com sucesso' });
        }
    );
});

// Eliminar colaborador (soft delete - apenas Admin)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run(
        "UPDATE employees SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao eliminar colaborador' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }

            addAuditLog(req.user.id, 'DELETE', 'employees', id, 'Colaborador marcado como inativo');

            res.json({ message: 'Colaborador eliminado com sucesso' });
        }
    );
});

module.exports = router;
