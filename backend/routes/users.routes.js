const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Criar utilizador para colaborador (apenas Admin)
router.post('/create-user', verifyToken, requireAdmin, async (req, res) => {
    const { employeeId, username, password } = req.body;

    if (!employeeId || !username || !password) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    try {
        // Verificar se colaborador existe
        db.get("SELECT * FROM employees WHERE id = ?", [employeeId], async (err, employee) => {
            if (err || !employee) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }

            // Verificar se já tem utilizador
            db.get("SELECT * FROM users WHERE employee_id = ?", [employeeId], async (err, existing) => {
                if (existing) {
                    return res.status(400).json({ error: 'Este colaborador já tem utilizador' });
                }

                // Criar hash da password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Criar utilizador
                db.run(
                    "INSERT INTO users (username, password_hash, role, employee_id) VALUES (?, ?, 'user', ?)",
                    [username, hashedPassword, employeeId],
                    function(err) {
                        if (err) {
                            if (err.message.includes('UNIQUE')) {
                                return res.status(400).json({ error: 'Username já existe' });
                            }
                            return res.status(500).json({ error: 'Erro ao criar utilizador' });
                        }

                        addAuditLog(req.user.id, 'CREATE', 'users', this.lastID, `Utilizador criado para ${employee.name}`);

                        res.status(201).json({
                            message: 'Utilizador criado com sucesso',
                            userId: this.lastID,
                            username,
                            employee: employee.name
                        });
                    }
                );
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Listar todos os utilizadores (Admin)
router.get('/', verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT u.id, u.username, u.role, u.created_at, e.name as employee_name, e.position
         FROM users u
         LEFT JOIN employees e ON u.employee_id = e.id
         ORDER BY u.created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar utilizadores' });
            }
            res.json(rows);
        }
    );
});

// Alterar password (próprio utilizador)
router.put('/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Passwords são obrigatórias' });
    }

    try {
        db.get("SELECT * FROM users WHERE id = ?", [req.user.id], async (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'Utilizador não encontrado' });
            }

            // Verificar password atual
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Password atual incorreta' });
            }

            // Hash da nova password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Atualizar
            db.run(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                [hashedPassword, req.user.id],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Erro ao atualizar password' });
                    }

                    addAuditLog(req.user.id, 'UPDATE', 'users', req.user.id, 'Password alterada');

                    res.json({ message: 'Password alterada com sucesso' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;
