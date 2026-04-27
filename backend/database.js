const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

/**
 * Backend dual:
 *  - Turso (libsql remoto) quando TURSO_DATABASE_URL esta definido
 *  - SQLite3 local caso contrario
 *
 * O `db` exportado tem a mesma API callback-style do sqlite3 (run/get/all/prepare/serialize)
 * para nao mexer nas rotas existentes.
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const useTurso = !!TURSO_URL;

let resolveDbReady;
const dbReady = new Promise((resolve) => { resolveDbReady = resolve; });

let db;

if (useTurso) {
    db = createTursoShim();
    console.log(`✓ Conectado ao Turso (${TURSO_URL})`);
} else {
    const sqlite3 = require('sqlite3').verbose();
    const isVercel = process.env.VERCEL === '1';
    const DB_DIR = isVercel ? '/tmp' : path.join(__dirname, 'db');
    const DB_PATH = path.join(DB_DIR, 'hr.db');

    if (!isVercel && !fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Erro ao conectar à base de dados:', err);
            resolveDbReady();
        } else {
            console.log('✓ Conectado à base de dados SQLite local:', DB_PATH);
        }
    });
}

initializeDatabase().catch(err => {
    console.error('Erro init BD:', err);
    resolveDbReady();
});

function createTursoShim() {
    const { createClient } = require('@libsql/client');
    const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    const normalizeArgs = (params) => {
        if (params == null) return [];
        if (!Array.isArray(params)) return [params];
        return params.map(p => p === undefined ? null : p);
    };

    const buildContext = (res) => ({
        lastID: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : 0,
        changes: res.rowsAffected || 0
    });

    const exec = (sql, params, callback, mode) => {
        const args = normalizeArgs(params);
        client.execute({ sql, args })
            .then(res => {
                if (!callback) return;
                if (mode === 'get') return callback(null, res.rows[0]);
                if (mode === 'all') return callback(null, res.rows);
                callback.call(buildContext(res), null);
            })
            .catch(err => {
                if (!callback) return;
                if (mode === 'get' || mode === 'all') callback(err);
                else callback.call({}, err);
            });
    };

    return {
        run(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            exec(sql, params, callback, 'run');
        },
        get(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            exec(sql, params, callback, 'get');
        },
        all(sql, params, callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            exec(sql, params, callback, 'all');
        },
        // Mantem compatibilidade - na inicializacao ja nao usamos serialize
        serialize(fn) { fn(); },
        prepare(sql) {
            return {
                run(params, callback) {
                    if (typeof params === 'function') { callback = params; params = []; }
                    exec(sql, params, callback, 'run');
                },
                finalize(cb) { if (cb) cb(); }
            };
        },
        _client: client  // exposto para scripts utilitarios
    };
}

// Helper async para serializar a inicializacao
function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });
}

async function initializeDatabase() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            employee_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meca TEXT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            position TEXT NOT NULL,
            department TEXT NOT NULL,
            salary REAL NOT NULL DEFAULT 0,
            hire_date DATE NOT NULL,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
            document_type TEXT,
            document_number TEXT,
            document_expiry DATE,
            document_status TEXT,
            nationality TEXT,
            birth_date DATE,
            gender TEXT,
            contract_type TEXT,
            contract_duration_days INTEGER,
            seniority TEXT,
            last_renewal_date DATE,
            next_renewal_date DATE,
            contract_status TEXT,
            activity_type TEXT,
            site TEXT,
            company TEXT,
            children INTEGER DEFAULT 0,
            academic_degree TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS recruitment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            position_title TEXT NOT NULL,
            candidate_name TEXT NOT NULL,
            candidate_email TEXT NOT NULL,
            candidate_phone TEXT,
            status TEXT DEFAULT 'novo' CHECK(status IN ('novo', 'triagem', 'entrevista', 'aprovado', 'rejeitado')),
            applied_date DATE DEFAULT CURRENT_DATE,
            notes TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date DATE NOT NULL,
            check_in TIME,
            check_out TIME,
            hours_worked REAL DEFAULT 0,
            status TEXT DEFAULT 'presente' CHECK(status IN ('presente', 'falta', 'ferias', 'doenca', 'justificado')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS leave_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days INTEGER NOT NULL,
            status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'rejeitado')),
            reason TEXT,
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME,
            reviewed_by INTEGER
        )`,

        `CREATE TABLE IF NOT EXISTS payroll (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            base_salary REAL NOT NULL,
            bonuses REAL DEFAULT 0,
            deductions REAL DEFAULT 0,
            net_salary REAL NOT NULL,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            review_date DATE NOT NULL,
            reviewer_id INTEGER NOT NULL,
            rating INTEGER CHECK(rating >= 1 AND rating <= 5),
            feedback TEXT,
            goals TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS onboarding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('onboarding', 'offboarding')),
            checklist TEXT NOT NULL,
            status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'em_progresso', 'concluido')),
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        )`,

        `CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    // Migracoes idempotentes em employees (para BDs antigas)
    const employeeColumns = [
        ['meca', 'TEXT'],
        ['document_type', 'TEXT'],
        ['document_number', 'TEXT'],
        ['document_expiry', 'DATE'],
        ['document_status', 'TEXT'],
        ['nationality', 'TEXT'],
        ['birth_date', 'DATE'],
        ['gender', 'TEXT'],
        ['contract_type', 'TEXT'],
        ['contract_duration_days', 'INTEGER'],
        ['seniority', 'TEXT'],
        ['last_renewal_date', 'DATE'],
        ['next_renewal_date', 'DATE'],
        ['contract_status', 'TEXT'],
        ['activity_type', 'TEXT'],
        ['site', 'TEXT'],
        ['company', 'TEXT'],
        ['children', 'INTEGER DEFAULT 0'],
        ['academic_degree', 'TEXT']
    ];

    // Sequencial: garante ordem correta em ambos os backends
    for (const sql of tables) {
        await runAsync(sql);
    }
    for (const [col, type] of employeeColumns) {
        try { await runAsync(`ALTER TABLE employees ADD COLUMN ${col} ${type}`); }
        catch (e) { /* coluna ja existe */ }
    }

    console.log('✓ Tabelas verificadas/migradas');
    await createDefaultData();
    resolveDbReady();
}

async function createDefaultData() {
    try {
        const admin = await getAsync("SELECT * FROM users WHERE username = 'admin'");
        if (!admin) {
            const adminHash = await bcrypt.hash('admin123', 10);
            await runAsync("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                ['admin', adminHash, 'admin']);
            console.log('✓ Admin criado (admin / admin123)');
        }

        const employee = await getAsync("SELECT * FROM employees WHERE email = 'joao.silva@copiagroup.com'");
        let employeeId;
        if (!employee) {
            const result = await runAsync(
                `INSERT INTO employees (name, email, phone, position, department, salary, hire_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['João Silva', 'joao.silva@copiagroup.com', '+244 923 456 789', 'Analista de TI', 'Tecnologia', 350000, '2024-03-15']
            );
            employeeId = result.lastID;
            console.log('✓ Colaborador demo criado (João Silva)');
        } else {
            employeeId = employee.id;
        }

        const user = await getAsync("SELECT * FROM users WHERE username = 'joao.silva'");
        if (!user) {
            const userHash = await bcrypt.hash('123456', 10);
            await runAsync("INSERT INTO users (username, password_hash, role, employee_id) VALUES (?, ?, ?, ?)",
                ['joao.silva', userHash, 'user', employeeId]);
            console.log('✓ Utilizador demo criado (joao.silva / 123456)');
        }
    } catch (err) {
        console.error('Erro ao criar dados padrão:', err);
    }
}

function addAuditLog(userId, action, tableName, recordId, details = null) {
    db.run(
        "INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [userId, action, tableName, recordId, details]
    );
}

module.exports = { db, addAuditLog, dbReady };
