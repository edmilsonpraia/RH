const express = require('express');
const router = express.Router();
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

// Listar todos os colaboradores (Admin) ou apenas o próprio (User)
router.get('/', verifyToken, (req, res) => {
    if (req.user.role === 'admin') {
        const { search = '', page = 1, limit = 25, site, department } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 25));
        const offset = (pageNum - 1) * limitNum;

        const searchQuery = `%${search}%`;
        const filters = ["(name LIKE ? OR email LIKE ? OR department LIKE ? OR meca LIKE ? OR position LIKE ?)"];
        const params = [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery];

        if (site) { filters.push("site = ?"); params.push(site); }
        if (department) { filters.push("department = ?"); params.push(department); }

        const where = filters.join(' AND ');

        db.all(
            `SELECT * FROM employees
             WHERE ${where}
             ORDER BY name ASC
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar colaboradores' });
                }

                db.get(`SELECT COUNT(*) as total FROM employees WHERE ${where}`, params, (err, count) => {
                    res.json({
                        employees: rows,
                        pagination: {
                            total: count ? count.total : 0,
                            page: pageNum,
                            limit: limitNum,
                            pages: Math.ceil((count ? count.total : 0) / limitNum)
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

// Campos extras suportados (alem dos obrigatorios)
const EXTRA_FIELDS = [
    'meca', 'document_type', 'document_number', 'document_expiry', 'document_status',
    'nationality', 'birth_date', 'gender', 'contract_type', 'contract_duration_days',
    'seniority', 'last_renewal_date', 'next_renewal_date', 'contract_status',
    'activity_type', 'site', 'company', 'children', 'academic_degree'
];

// Criar colaborador (apenas Admin)
router.post('/', verifyToken, requireAdmin, (req, res) => {
    const { name, email, phone, position, department, salary, hireDate } = req.body;

    if (!name || !email || !position || !department || !hireDate) {
        return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    const baseCols = ['name', 'email', 'phone', 'position', 'department', 'salary', 'hire_date'];
    const baseVals = [name, email, phone || null, position, department, salary || 0, hireDate];

    const extraCols = [];
    const extraVals = [];
    EXTRA_FIELDS.forEach(f => {
        if (req.body[f] !== undefined && req.body[f] !== '') {
            extraCols.push(f);
            extraVals.push(req.body[f]);
        }
    });

    const cols = [...baseCols, ...extraCols];
    const vals = [...baseVals, ...extraVals];
    const placeholders = cols.map(() => '?').join(', ');

    db.run(
        `INSERT INTO employees (${cols.join(', ')}) VALUES (${placeholders})`,
        vals,
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
    const { name, email, phone, position, department, salary, status, hireDate } = req.body;

    const sets = [];
    const vals = [];

    const map = {
        name, email, phone, position, department, salary, status,
        hire_date: hireDate
    };
    Object.entries(map).forEach(([k, v]) => {
        if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
    });
    EXTRA_FIELDS.forEach(f => {
        if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f] === '' ? null : req.body[f]); }
    });

    if (sets.length === 0) {
        return res.status(400).json({ error: 'Nada para atualizar' });
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(id);

    db.run(
        `UPDATE employees SET ${sets.join(', ')} WHERE id = ?`,
        vals,
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar colaborador' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }

            addAuditLog(req.user.id, 'UPDATE', 'employees', id, `Atualizado colaborador: ${name || id}`);

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
