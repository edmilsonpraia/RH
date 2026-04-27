#!/usr/bin/env node
/**
 * Exporta os colaboradores da BD local para um JSON seed ANONIMIZADO,
 * seguro para commitar no Git. Remove BI, telefone, data de nascimento, salario.
 *
 * Uso: node backend/scripts/export_seed.js
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'db', 'hr.db');
const OUT_PATH = path.join(__dirname, '..', 'data', 'employees-seed.json');

const SAFE_FIELDS = [
    'id', 'meca', 'name', 'email', 'position', 'department',
    'hire_date', 'status', 'document_type', 'document_status',
    'nationality', 'gender', 'contract_type', 'contract_duration_days',
    'seniority', 'contract_status', 'activity_type', 'site', 'company',
    'children', 'academic_degree'
];

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

db.all(`SELECT ${SAFE_FIELDS.join(', ')} FROM employees ORDER BY name`, [], (err, rows) => {
    if (err) {
        console.error('Erro:', err);
        process.exit(1);
    }

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(rows, null, 2), 'utf8');

    console.log(`✓ Exportados ${rows.length} colaboradores para ${OUT_PATH}`);
    console.log(`  Campos: ${SAFE_FIELDS.join(', ')}`);
    console.log(`  Removidos: document_number, document_expiry, phone, birth_date, salary, last_renewal_date, next_renewal_date`);
    db.close();
});
