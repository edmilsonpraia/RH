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

// Supabase via SDK (URL + secret key, usa RPC app_sql)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const useSupabaseSdk = !!(SUPABASE_URL && SUPABASE_SECRET);

// Postgres direct (alternativa avancada via DATABASE_URL)
const PG_URL = process.env.DATABASE_URL;
const usePostgres = !!PG_URL && !useSupabaseSdk;

// MEMORY_MODE: ativo se MEMORY_MODE=1 ou se estiver na Vercel sem outra BD
const isVercel = process.env.VERCEL === '1';
const useMemory = process.env.MEMORY_MODE === '1' || (isVercel && !useTurso && !usePostgres && !useSupabaseSdk);

let resolveDbReady;
const dbReady = new Promise((resolve) => { resolveDbReady = resolve; });

let db;
let memorySeedPath = null;

if (useSupabaseSdk) {
    db = createSupabaseShim();
    console.log(`✓ Conectado ao Supabase (SDK): ${SUPABASE_URL}`);
} else if (usePostgres) {
    db = createPostgresShim();
    console.log(`✓ Conectado a Postgres direto: ${maskUrl(PG_URL)}`);
} else if (useTurso) {
    db = createTursoShim();
    console.log(`✓ Conectado ao Turso (${TURSO_URL})`);
} else if (useMemory) {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(':memory:', (err) => {
        if (err) console.error('Erro ao criar BD em memoria:', err);
        else console.log('✓ BD em memoria (volatil) - modo prototipo');
    });
    memorySeedPath = path.join(__dirname, 'data', 'employees-seed.json');
} else {
    const sqlite3 = require('sqlite3').verbose();
    const DB_DIR = path.join(__dirname, 'db');
    const DB_PATH = path.join(DB_DIR, 'hr.db');

    if (!fs.existsSync(DB_DIR)) {
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

function maskUrl(url) {
    return (url || '').replace(/:[^:@]+@/, ':***@');
}

/**
 * Shim Supabase (via SDK + RPC app_sql).
 * Funciona em qualquer rede (HTTPS), ideal para Vercel.
 * Requer:
 *   - SUPABASE_URL + SUPABASE_SECRET_KEY no .env
 *   - Funcao Postgres `app_sql` (ver backend/data/supabase-rpc.sql)
 */
function createSupabaseShim() {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Adapta SQLite-isms para Postgres antes de enviar
    const adaptSql = (sql) => {
        let s = sql;
        // Placeholders ? -> $1, $2, ...
        let i = 0;
        s = s.replace(/\?/g, () => `$${++i}`);
        // strftime -> to_char
        s = s.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "to_char($1::timestamp, 'YYYY-MM')");
        s = s.replace(/strftime\('%m',\s*([^)]+)\)/gi, "to_char($1::timestamp, 'MM')");
        s = s.replace(/strftime\('%Y',\s*([^)]+)\)/gi, "to_char($1::timestamp, 'YYYY')");
        // julianday -> EPOCH/86400
        s = s.replace(/julianday\(([^)]+)\)/gi, '(EXTRACT(EPOCH FROM ($1::timestamp))/86400)');
        // CURRENT_DATE -> CURRENT_DATE (compativel)
        // CURRENT_TIMESTAMP -> NOW()
        return s;
    };

    const normalizeArgs = (params) => {
        if (params == null) return [];
        if (!Array.isArray(params)) return [params];
        return params.map(p => p === undefined ? null : p);
    };

    const exec = async (sql, params, callback, mode) => {
        try {
            const adapted = adaptSql(sql);
            const args = normalizeArgs(params);

            const { data, error } = await sb.rpc('app_sql', { sql: adapted, args });

            if (error) {
                if (mode === 'get' || mode === 'all') return callback && callback(error);
                return callback && callback.call({}, error);
            }

            const result = data || { rows: [], changes: 0, lastID: 0 };
            const rows = result.rows || [];

            if (mode === 'get') return callback && callback(null, rows[0]);
            if (mode === 'all') return callback && callback(null, rows);
            const ctx = {
                lastID: Number(result.lastID || 0),
                changes: Number(result.changes || 0)
            };
            callback && callback.call(ctx, null);
        } catch (err) {
            if (mode === 'get' || mode === 'all') return callback && callback(err);
            callback && callback.call({}, err);
        }
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
        _supabase: sb
    };
}

function createPostgresShim() {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: PG_URL,
        ssl: { rejectUnauthorized: false }  // Supabase requer SSL
    });

    // Converte placeholders SQLite (?) para Postgres ($1, $2, ...)
    const convertPlaceholders = (sql) => {
        let i = 0;
        return sql.replace(/\?/g, () => `$${++i}`);
    };

    // Converte CURRENT_TIMESTAMP para NOW() onde necessário (compativel)
    // strftime('%Y-%m', col) -> to_char(col, 'YYYY-MM')
    // strftime('%m', col) -> to_char(col, 'MM')
    // strftime('%Y', col) -> to_char(col, 'YYYY')
    const adaptSql = (sql) => {
        let s = sql;
        s = s.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')");
        s = s.replace(/strftime\('%m',\s*([^)]+)\)/gi, "to_char($1, 'MM')");
        s = s.replace(/strftime\('%Y',\s*([^)]+)\)/gi, "to_char($1, 'YYYY')");
        s = s.replace(/julianday\(([^)]+)\)/gi, 'EXTRACT(EPOCH FROM ($1))/86400');
        // CASE WHEN ... IS NOT NULL THEN 1 ELSE 0 END -> mantem (compativel)
        // LIMIT ? OFFSET ? -> mantem
        // ORDER BY ... NULLS LAST -> mantem (Postgres suporta)
        return s;
    };

    const normalizeArgs = (params) => {
        if (params == null) return [];
        if (!Array.isArray(params)) return [params];
        return params.map(p => p === undefined ? null : p);
    };

    const buildContext = (res) => ({
        // Postgres nao retorna lastInsertRowid automaticamente em INSERT
        // Para INSERT obtemos via RETURNING id (acrescentado abaixo se faltar)
        lastID: res.rows && res.rows[0] && res.rows[0].id != null ? Number(res.rows[0].id) : 0,
        changes: res.rowCount || 0
    });

    const exec = (sql, params, callback, mode) => {
        let q = adaptSql(sql);
        q = convertPlaceholders(q);

        // Para INSERT sem RETURNING, adicionar para obter o id
        const isInsert = /^\s*INSERT\b/i.test(q);
        const hasReturning = /\bRETURNING\b/i.test(q);
        if (isInsert && !hasReturning && mode === 'run') {
            q = q.replace(/;?\s*$/, ' RETURNING id');
        }

        pool.query(q, normalizeArgs(params))
            .then(res => {
                if (!callback) return;
                if (mode === 'get') return callback(null, res.rows[0]);
                if (mode === 'all') return callback(null, res.rows || []);
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
        _pool: pool
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
    // Supabase SDK: schema e dados ja foram aplicados pelo user via SQL Editor.
    // So validar que app_sql existe e a BD esta acessivel.
    if (useSupabaseSdk) {
        try {
            const test = await new Promise((resolve, reject) => {
                db.get('SELECT 1 as ok', [], (err, row) => err ? reject(err) : resolve(row));
            });
            if (test && test.ok === 1) {
                console.log('✓ RPC app_sql operacional');
            }
        } catch (err) {
            console.error('⚠ Falha ao validar Supabase. Aplicaste backend/data/supabase-rpc.sql no SQL Editor?');
            console.error('  Erro:', err.message);
        }
        resolveDbReady();
        return;
    }

    // Postgres direto: aplicar schema-postgres.sql diretamente
    if (usePostgres) {
        const schemaPath = path.join(__dirname, 'schema-postgres.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            try {
                await db._pool.query(schemaSql);
                console.log('✓ Schema Postgres aplicado');
            } catch (err) {
                console.error('Erro ao aplicar schema Postgres:', err.message);
            }
        }
        await createDefaultData();
        resolveDbReady();
        return;
    }

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
        )`,

        // === PAD.CGC.04 - Recrutamento e Selecao ===

        `CREATE TABLE IF NOT EXISTS job_requisitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            requested_by INTEGER NOT NULL,
            department TEXT NOT NULL,
            position_title TEXT NOT NULL,
            activity_type TEXT,
            contract_type TEXT,
            site TEXT,
            headcount INTEGER DEFAULT 1,
            justification TEXT,
            description TEXT,
            requirements TEXT,
            salary_range_min REAL,
            salary_range_max REAL,
            desired_start_date DATE,
            status TEXT DEFAULT 'rascunho'
                CHECK(status IN ('rascunho','submetido','aprovado_dch','aprovado_admin','publicado','preenchido','cancelado','rejeitado')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS requisition_approvals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requisition_id INTEGER NOT NULL,
            approver_id INTEGER NOT NULL,
            role TEXT CHECK(role IN ('dch','administracao')),
            decision TEXT CHECK(decision IN ('aprovado','rejeitado')),
            comments TEXT,
            decided_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL,
            phase INTEGER NOT NULL CHECK(phase IN (1,2,3)),
            method TEXT,
            interviewer_id INTEGER,
            scheduled_at DATETIME,
            completed_at DATETIME,
            score INTEGER CHECK(score BETWEEN 1 AND 5),
            technical_score INTEGER,
            behavioral_score INTEGER,
            cultural_fit_score INTEGER,
            report TEXT,
            recommendation TEXT CHECK(recommendation IN ('avancar','reservar','rejeitar')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS employee_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_data TEXT,
            issued_date DATE,
            expiry_date DATE,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            uploaded_by INTEGER
        )`,

        `CREATE TABLE IF NOT EXISTS mobility_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            from_department TEXT NOT NULL,
            to_department TEXT NOT NULL,
            from_site TEXT,
            to_site TEXT,
            from_position TEXT,
            to_position TEXT,
            reason TEXT,
            qhsa_required INTEGER DEFAULT 0,
            qhsa_assessment TEXT,
            status TEXT DEFAULT 'pendente'
                CHECK(status IN ('pendente','aprovado','rejeitado','concluido')),
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            decided_at DATETIME,
            decided_by INTEGER,
            decision_comments TEXT
        )`,

        `CREATE TABLE IF NOT EXISTS terminations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL UNIQUE,
            type TEXT NOT NULL CHECK(type IN
                ('justa_causa','fim_contrato','fim_experimental','demissao_voluntaria','reforma')),
            initiated_by INTEGER,
            notice_date DATE,
            effective_date DATE NOT NULL,
            notice_period_days INTEGER,
            severance_amount REAL,
            final_settlement REAL,
            work_certificate_issued INTEGER DEFAULT 0,
            equipment_returned INTEGER DEFAULT 0,
            equipment_pending_value REAL DEFAULT 0,
            reason TEXT,
            internal_communication_sent INTEGER DEFAULT 0,
            inspection_notified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // === Talent Scouting (Banco de Talentos) ===
        `CREATE TABLE IF NOT EXISTS talent_pool (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            position_of_interest TEXT,
            area TEXT,
            source TEXT,
            cv_text TEXT,
            cv_file_name TEXT,
            cv_file_data TEXT,
            cv_mime_type TEXT,
            documents TEXT,
            skills TEXT,
            education TEXT,
            experience_years INTEGER,
            current_employer TEXT,
            expected_salary REAL,
            location TEXT,
            status TEXT DEFAULT 'ativo'
                CHECK(status IN ('ativo','contactado','em_processo','alocado','indisponivel','arquivado')),
            tags TEXT,
            notes TEXT,
            rating INTEGER CHECK(rating BETWEEN 1 AND 5),
            consent_given INTEGER DEFAULT 0,
            consent_expiry_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_contacted_at DATETIME,
            last_contacted_by INTEGER,
            archived_at DATETIME
        )`,

        // === Avaliacoes e Acompanhamento (extensao do desempenho) ===
        `CREATE TABLE IF NOT EXISTS employee_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            evaluator_id INTEGER NOT NULL,
            period TEXT NOT NULL,
            evaluation_date DATE NOT NULL,
            performance_rating INTEGER CHECK(performance_rating BETWEEN 1 AND 5),
            potential_rating INTEGER CHECK(potential_rating BETWEEN 1 AND 3),
            technical_score INTEGER,
            behavioral_score INTEGER,
            leadership_score INTEGER,
            results_score INTEGER,
            strengths TEXT,
            areas_to_improve TEXT,
            goals_set TEXT,
            goals_achieved TEXT,
            development_plan TEXT,
            feedback_summary TEXT,
            manager_comments TEXT,
            employee_comments TEXT,
            status TEXT DEFAULT 'rascunho'
                CHECK(status IN ('rascunho','partilhado','assinado','fechado')),
            signed_by_employee INTEGER DEFAULT 0,
            signed_by_manager INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    // Migracoes em recruitment (CV + documentos)
    const recruitmentColumns = [
        ['cv_file_name', 'TEXT'],
        ['cv_file_data', 'TEXT'],
        ['cv_mime_type', 'TEXT'],
        ['documents', 'TEXT']
    ];
    for (const [col, type] of recruitmentColumns) {
        try { await runAsync(`ALTER TABLE recruitment ADD COLUMN ${col} ${type}`); }
        catch (e) { /* coluna ja existe */ }
    }

    // Migracoes em talent_pool
    try { await runAsync(`ALTER TABLE talent_pool ADD COLUMN cv_mime_type TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE talent_pool ADD COLUMN documents TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE talent_pool ADD COLUMN photo_data TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE talent_pool ADD COLUMN photo_mime_type TEXT`); } catch (e) {}

    // Migracoes para fotos em recruitment e employees
    try { await runAsync(`ALTER TABLE recruitment ADD COLUMN photo_data TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE recruitment ADD COLUMN photo_mime_type TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE employees ADD COLUMN photo_data TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE employees ADD COLUMN photo_mime_type TEXT`); } catch (e) {}

    // Migracoes em interviews (status workflow + testes)
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN status TEXT DEFAULT 'agendada'`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_template TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_answers TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_score INTEGER`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_total INTEGER`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_correct INTEGER`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN notes TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN candidate_name_snapshot TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_access_token TEXT`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_started_at DATETIME`); } catch (e) {}
    try { await runAsync(`ALTER TABLE interviews ADD COLUMN test_submitted_at DATETIME`); } catch (e) {}

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

        // Modo memoria: carregar seed de colaboradores
        if (memorySeedPath && fs.existsSync(memorySeedPath)) {
            await loadMemorySeed();
        }
    } catch (err) {
        console.error('Erro ao criar dados padrão:', err);
    }
}

async function loadMemorySeed() {
    try {
        const seed = JSON.parse(fs.readFileSync(memorySeedPath, 'utf8'));
        if (!Array.isArray(seed) || seed.length === 0) return;

        // Verificar se ja existem (evita duplicar em re-runs)
        const existing = await getAsync("SELECT COUNT(*) as n FROM employees WHERE meca IS NOT NULL");
        if (existing && existing.n >= seed.length) return;

        // Campos comuns a todos
        const cols = Object.keys(seed[0]).filter(k => k !== 'id');
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR IGNORE INTO employees (${cols.join(', ')}, salary) VALUES (${placeholders}, 0)`;

        for (const emp of seed) {
            const vals = cols.map(c => emp[c] === undefined ? null : emp[c]);
            await runAsync(sql, vals);
        }
        console.log(`✓ Seed em memoria: ${seed.length} colaboradores carregados`);
    } catch (err) {
        console.error('Erro ao carregar seed:', err);
    }
}

function addAuditLog(userId, action, tableName, recordId, details = null) {
    db.run(
        "INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [userId, action, tableName, recordId, details]
    );
}

module.exports = { db, addAuditLog, dbReady };
