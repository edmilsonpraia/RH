#!/usr/bin/env node
/**
 * Sincroniza a BD SQLite local para Supabase Postgres.
 *
 * Pre-requisitos:
 *   - DATABASE_URL definido no .env (connection string Postgres do Supabase)
 *
 * Uso:
 *   node backend/scripts/sync_to_supabase.js
 *
 * O script:
 *   1. Aplica o schema (schema-postgres.sql) - idempotente
 *   2. Trunca todas as tabelas no Supabase
 *   3. Copia tudo do hr.db local
 *   4. Reseta as sequencias para o id maximo
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const PG_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const LOCAL_DB = path.join(__dirname, '..', 'db', 'hr.db');
const SCHEMA = path.join(__dirname, '..', 'schema-postgres.sql');

if (!PG_URL) {
    console.error('ERRO: DATABASE_URL nao definido.');
    console.error('Defina no .env (Project Settings > Database > Connection string)');
    process.exit(1);
}

if (!fs.existsSync(LOCAL_DB)) {
    console.error('ERRO: BD local nao encontrada:', LOCAL_DB);
    process.exit(1);
}

// Ordem importante para FKs implicitas
const TABLES = [
    'users', 'employees', 'recruitment', 'attendance', 'leave_requests',
    'payroll', 'performance', 'onboarding', 'audit_logs',
    'job_requisitions', 'requisition_approvals', 'interviews',
    'employee_documents', 'mobility_requests', 'terminations',
    'talent_pool', 'employee_evaluations'
];

const pg = new Pool({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
const local = new sqlite3.Database(LOCAL_DB, sqlite3.OPEN_READONLY);

const sqliteAll = (sql, params = []) => new Promise((resolve, reject) => {
    local.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

async function applySchema() {
    console.log('A aplicar schema Postgres...');
    const sql = fs.readFileSync(SCHEMA, 'utf8');
    await pg.query(sql);
    console.log('  ✓ schema aplicado');
}

async function getPgColumns(table) {
    const r = await pg.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
        [table]
    );
    return r.rows.map(x => x.column_name);
}

async function copyTable(table) {
    // Verificar se a tabela existe localmente
    const sqliteCols = await sqliteAll(`PRAGMA table_info(${table})`);
    if (!sqliteCols.length) {
        console.log(`  ${table}: nao existe localmente, ignorada`);
        return 0;
    }
    const localColNames = sqliteCols.map(c => c.name);

    const rows = await sqliteAll(`SELECT * FROM ${table}`);
    if (!rows.length) {
        console.log(`  ${table}: 0 linhas`);
        return 0;
    }

    // Truncar destino
    await pg.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

    // So copiar colunas que existem em ambos
    const pgCols = await getPgColumns(table);
    const cols = localColNames.filter(c => pgCols.includes(c));
    if (!cols.length) {
        console.log(`  ${table}: sem colunas comuns, ignorada`);
        return 0;
    }

    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const stmt = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of rows) {
        const vals = cols.map(c => row[c] === undefined ? null : row[c]);
        try {
            await pg.query(stmt, vals);
            inserted++;
        } catch (e) {
            console.error(`  ${table} linha ${row.id}: ${e.message}`);
        }
    }

    // Reset sequence ao max(id)
    if (cols.includes('id')) {
        try {
            await pg.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
        } catch (e) { /* tabela sem sequence */ }
    }

    console.log(`  ${table}: ${inserted}/${rows.length} linhas copiadas`);
    return inserted;
}

async function main() {
    console.log(`Origem: ${LOCAL_DB}`);
    console.log(`Destino: ${PG_URL.replace(/:[^:@]+@/, ':***@')}\n`);

    try {
        await applySchema();
        console.log('\nA copiar dados:');
        let total = 0;
        for (const t of TABLES) {
            try { total += await copyTable(t); }
            catch (e) { console.error(`  ${t}: ERRO - ${e.message}`); }
        }
        console.log(`\n✓ Concluido. ${total} linhas sincronizadas.`);
    } catch (err) {
        console.error('Erro fatal:', err.message);
        process.exit(1);
    } finally {
        await pg.end();
        local.close();
    }
}

main();
