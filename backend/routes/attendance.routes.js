const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar assiduidade
router.get('/', verifyToken, (req, res) => {
    const { month, year, employeeId } = req.query;

    let query = "SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE 1=1";
    const params = [];

    if (req.user.role !== 'admin') {
        query += " AND a.employee_id = ?";
        params.push(req.user.employeeId);
    } else if (employeeId) {
        query += " AND a.employee_id = ?";
        params.push(employeeId);
    }

    if (month && year) {
        query += " AND strftime('%m', a.date) = ? AND strftime('%Y', a.date) = ?";
        params.push(month.toString().padStart(2, '0'), year.toString());
    }

    query += " ORDER BY a.date DESC LIMIT 100";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar assiduidade' });
        }
        res.json(rows);
    });
});

// Registar entrada/saída
router.post('/check', verifyToken, (req, res) => {
    const { type } = req.body; // 'in' ou 'out'
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];

    db.get(
        "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
        [employeeId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao processar' });
            }

            if (type === 'in') {
                if (row) {
                    return res.status(400).json({ error: 'Já registou entrada hoje' });
                }

                const checkIn = new Date().toTimeString().split(' ')[0];

                db.run(
                    "INSERT INTO attendance (employee_id, date, check_in, status) VALUES (?, ?, ?, 'presente')",
                    [employeeId, today, checkIn],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Erro ao registar entrada' });
                        }

                        addAuditLog(req.user.id, 'CHECK_IN', 'attendance', this.lastID, `Entrada: ${checkIn}`);

                        res.json({ message: 'Entrada registada', checkIn });
                    }
                );
            } else if (type === 'out') {
                if (!row || row.check_out) {
                    return res.status(400).json({ error: 'Registo inválido' });
                }

                const checkOut = new Date().toTimeString().split(' ')[0];
                const checkIn = new Date(`2000-01-01 ${row.check_in}`);
                const checkOutDate = new Date(`2000-01-01 ${checkOut}`);
                const hoursWorked = ((checkOutDate - checkIn) / (1000 * 60 * 60)).toFixed(2);

                db.run(
                    "UPDATE attendance SET check_out = ?, hours_worked = ? WHERE id = ?",
                    [checkOut, hoursWorked, row.id],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Erro ao registar saída' });
                        }

                        addAuditLog(req.user.id, 'CHECK_OUT', 'attendance', row.id, `Saída: ${checkOut}, Horas: ${hoursWorked}`);

                        res.json({ message: 'Saída registada', checkOut, hoursWorked });
                    }
                );
            }
        }
    );
});

// Pedidos de férias
router.get('/leave-requests', verifyToken, (req, res) => {
    let query = "SELECT lr.*, e.name as employee_name FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id";
    const params = [];

    if (req.user.role !== 'admin') {
        query += " WHERE lr.employee_id = ?";
        params.push(req.user.employeeId);
    }

    query += " ORDER BY lr.requested_at DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar pedidos' });
        }
        res.json(rows);
    });
});

// Solicitar férias
router.post('/leave-requests', verifyToken, (req, res) => {
    const { startDate, endDate, reason } = req.body;
    const employeeId = req.user.employeeId;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Datas são obrigatórias' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    db.run(
        "INSERT INTO leave_requests (employee_id, start_date, end_date, days, reason) VALUES (?, ?, ?, ?, ?)",
        [employeeId, startDate, endDate, days, reason],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao solicitar férias' });
            }

            addAuditLog(req.user.id, 'CREATE', 'leave_requests', this.lastID, `Férias: ${days} dias`);

            res.status(201).json({ message: 'Pedido de férias enviado', requestId: this.lastID });
        }
    );
});

// Aprovar/Rejeitar férias (Admin)
router.put('/leave-requests/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['aprovado', 'rejeitado'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }

    db.run(
        "UPDATE leave_requests SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?",
        [status, req.user.id, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar pedido' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            addAuditLog(req.user.id, 'UPDATE', 'leave_requests', id, `Status: ${status}`);

            res.json({ message: `Pedido ${status}` });
        }
    );
});

module.exports = router;
