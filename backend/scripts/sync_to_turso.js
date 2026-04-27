#!/usr/bin/env node
/**
 * Sincroniza a BD SQLite local (backend/db/hr.db) para uma instancia Turso.
 *
 * Uso:
 *   1. Definir variaveis de ambiente:
 *        export TURSO_DATABASE_URL="libsql://xxxx.turso.io"
 *        export TURSO_AUTH_TOKEN="ey..."
 *      (no Windows: set TURSO_DATABASE_URL=...)
 *   2. node backend/scripts/sync_to_turso.js
 *
 * O script:
 *  - Cria todas as tabelas no Turso (idempotente)
 *  - Trunca tabelas no destino e copia tudo do local
 *  - Preserva os IDs originais
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const LOCAL_DB = path.join(__dirname, '..', 'db', 'hr.db');

if (!TURSO_URL) {
    console.error('ERRO: TURSO_DATABASE_URL nao definido.');
    console.error('Configure no .env ou via export TURSO_DATABASE_URL=...');
    process.exit(1);
}

const TABLES_IN_ORDER = [
    'users',
    'employees',
    'recruitment',
    'attendance',
    'leave_requests',
    'payroll',
    'performance',
    'onboarding',
    'audit_logs'
];

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const local = new sqlite3.Database(LOCAL_DB, sqlite3.OPEN_READONLY);

const localAll = (sql, params = []) => new Promise((resolve, reject) => {
    local.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

async function getColumns(table) {
    const rows = await localAll(`PRAGMA table_info(${table})`);
    return rows.map(r => r.name);
}

async function copyTable(table) {
    const cols = await getColumns(table);
    if (cols.length === 0) {
        console.log(`  ${table}: tabela nao existe localmente, ignorada`);
        return 0;
    }

    const rows = await localAll(`SELECT * FROM ${table}`);
    if (rows.length === 0) {
        console.log(`  ${table}: 0 linhas`);
        return 0;
    }

    // Truncar destino para evitar conflitos de PK
    await turso.execute(`DELETE FROM ${table}`);

    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

    // Batch em chunks para performance
    const CHUNK = 50;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const stmts = slice.map(row => ({
            sql,
            args: cols.map(c => row[c] === undefined ? null : row[c])
        }));
        await turso.batch(stmts, 'write');
        inserted += slice.length;
    }

    console.log(`  ${table}: ${inserted} linhas copiadas`);
    return inserted;
}

async function main() {
    console.log(`Origem: ${LOCAL_DB}`);
    console.log(`Destino: ${TURSO_URL}\n`);

    // Garantir schema no destino (executa o initializeDatabase)
    console.log('A garantir schema no Turso...');
    process.env.TURSO_DATABASE_URL = TURSO_URL;
    process.env.TURSO_AUTH_TOKEN = TURSO_TOKEN;
    require('../database');  // dispara initializeDatabase
    const { dbReady } = require('../database');
    await dbReady;

    console.log('\nA copiar dados:');
    let total = 0;
    for (const table of TABLES_IN_ORDER) {
        try {
            total += await copyTable(table);
        } catch (err) {
            console.error(`  ${table}: ERRO - ${err.message}`);
        }
    }

    console.log(`\n✓ Concluido. ${total} linhas sincronizadas.`);
    local.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
