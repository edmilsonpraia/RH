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

// Criar novo utilizador (apenas admin)
router.post('/register', (req, res) => {
    const { username, password, role, employeeId } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao processar password' });
        }

        db.run(
            "INSERT INTO users (username, password_hash, role, employee_id) VALUES (?, ?, ?, ?)",
            [username, hash, role, employeeId || null],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Username já existe' });
                    }
                    return res.status(500).json({ error: 'Erro ao criar utilizador' });
                }

                res.status(201).json({
                    message: 'Utilizador criado com sucesso',
                    userId: this.lastID
                });
            }
        );
    });
});

module.exports = router;
