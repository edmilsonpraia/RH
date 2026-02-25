const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar folha de pagamento
router.get('/', verifyToken, (req, res) => {
    const { month, year, employeeId } = req.query;

    let query = "SELECT p.*, e.name as employee_name FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE 1=1";
    const params = [];

    if (req.user.role !== 'admin') {
        query += " AND p.employee_id = ?";
        params.push(req.user.employeeId);
    } else if (employeeId) {
        query += " AND p.employee_id = ?";
        params.push(employeeId);
    }

    if (month && year) {
        query += " AND p.month = ? AND p.year = ?";
        params.push(month, year);
    }

    query += " ORDER BY p.year DESC, p.month DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar folha de pagamento' });
        }
        res.json(rows);
    });
});

// Processar folha de pagamento mensal (Admin)
router.post('/process', verifyToken, requireAdmin, (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    // Verifica se já foi processado
    db.get(
        "SELECT COUNT(*) as count FROM payroll WHERE month = ? AND year = ?",
        [month, year],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao verificar' });
            }

            if (result.count > 0) {
                return res.status(400).json({ error: 'Folha de pagamento já processada para este período' });
            }

            // Processar para todos os colaboradores ativos
            db.all("SELECT * FROM employees WHERE status = 'active'", [], (err, employees) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar colaboradores' });
                }

                const stmt = db.prepare(
                    "INSERT INTO payroll (employee_id, month, year, base_salary, bonuses, deductions, net_salary) VALUES (?, ?, ?, ?, ?, ?, ?)"
                );

                let processed = 0;

                employees.forEach(emp => {
                    const baseSalary = emp.salary;
                    const bonuses = 0; // Pode ser calculado com lógica adicional
                    const deductions = baseSalary * 0.11; // Exemplo: 11% de deduções
                    const netSalary = baseSalary + bonuses - deductions;

                    stmt.run([emp.id, month, year, baseSalary, bonuses, deductions, netSalary], (err) => {
                        if (err) {
                            console.error('Erro ao processar colaborador:', emp.name);
                        } else {
                            processed++;
                        }
                    });
                });

                stmt.finalize(() => {
                    addAuditLog(req.user.id, 'PROCESS', 'payroll', null, `Processado ${month}/${year}: ${processed} colaboradores`);

                    res.json({
                        message: 'Folha de pagamento processada',
                        processed,
                        month,
                        year
                    });
                });
            });
        }
    );
});

// Obter recibo individual
router.get('/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.get(
        "SELECT p.*, e.name, e.position, e.department FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE p.id = ?",
        [id],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar recibo' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Recibo não encontrado' });
            }

            // Usuário comum só pode ver seus próprios recibos
            if (req.user.role !== 'admin' && row.employee_id !== req.user.employeeId) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            res.json(row);
        }
    );
});

module.exports = router;
