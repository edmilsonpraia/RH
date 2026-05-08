const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, addAuditLog } = require('../database');
const { generateToken } = require('../auth');

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Erro no servidor' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const token = generateToken(user);

            addAuditLog(user.id, 'LOGIN', 'users', user.id, `Login bem-sucedido para ${username}`);

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    employeeId: user.employee_id
                }
            });
        }
    );
});

// Registo publico (signup) - cria colaborador + utilizador com role='user'
// O admin pode depois promover utilizadores via /api/users/:id/role
router.post('/signup', async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e password são obrigatórios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
        const hash = await bcrypt.hash(password, 10);

        // Verificar duplicados (email no employees, username no users)
        db.get("SELECT id FROM users WHERE username = ?", [cleanEmail], (err, existingUser) => {
            if (err) return res.status(500).json({ error: 'Erro no servidor' });
            if (existingUser) return res.status(400).json({ error: 'Email já registado' });

            db.get("SELECT id FROM employees WHERE email = ?", [cleanEmail], (err2, existingEmp) => {
                if (err2) return res.status(500).json({ error: 'Erro no servidor' });

                const proceedWithUser = (employeeId) => {
                    db.run(
                        "INSERT INTO users (username, password_hash, role, employee_id) VALUES (?, ?, 'user', ?)",
                        [cleanEmail, hash, employeeId],
                        function(err4) {
                            if (err4) {
                                if (String(err4.message).includes('UNIQUE')) {
                                    return res.status(400).json({ error: 'Email já registado' });
                                }
                                return res.status(500).json({ error: 'Erro ao criar utilizador' });
                            }

                            const userId = this.lastID;
                            const userPayload = {
                                id: userId,
                                username: cleanEmail,
                                role: 'user',
                                employee_id: employeeId
                            };
                            const token = generateToken(userPayload);

                            addAuditLog(userId, 'SIGNUP', 'users', userId, `Auto-registo: ${cleanEmail}`);

                            res.status(201).json({
                                message: 'Conta criada com sucesso',
                                token,
                                user: { id: userId, username: cleanEmail, role: 'user', employeeId }
                            });
                        }
                    );
                };

                if (existingEmp) {
                    // Reusa colaborador existente
                    proceedWithUser(existingEmp.id);
                } else {
                    // Cria colaborador minimal (admin completara depois)
                    db.run(
                        `INSERT INTO employees (name, email, phone, position, department, salary, hire_date, status)
                         VALUES (?, ?, ?, 'A definir', 'A definir', 0, CURRENT_DATE, 'active')`,
                        [name.trim(), cleanEmail, phone || null],
                        function(err3) {
                            if (err3) {
                                return res.status(500).json({ error: 'Erro ao criar colaborador: ' + err3.message });
                            }
                            proceedWithUser(this.lastID);
                        }
                    );
                }
            });
        });
    } catch (e) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;
