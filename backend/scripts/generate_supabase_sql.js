#!/usr/bin/env node
/**
 * Gera UM ficheiro SQL pronto a colar no Supabase SQL Editor.
 * Conteudo:
 *   - Schema completo (17 tabelas + indices)
 *   - 2 utilizadores default (admin/admin123, joao.silva/123456) com bcrypt
 *   - 162 colaboradores do seed JSON
 *   - Reset de sequences
 *
 * Uso: node backend/scripts/generate_supabase_sql.js
 * Output: backend/data/supabase-seed.sql (cola este no SQL Editor do Supabase)
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..', '..');
const SCHEMA = path.join(ROOT, 'backend', 'schema-postgres.sql');
const SEED_JSON = path.join(ROOT, 'backend', 'data', 'employees-seed.json');
const OUT = path.join(ROOT, 'backend', 'data', 'supabase-seed.sql');

const escapeStr = (v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return v.toString();
    if (typeof v === 'boolean') return v ? '1' : '0';
    return `'${String(v).replace(/'/g, "''")}'`;
};

async function main() {
    const schema = fs.readFileSync(SCHEMA, 'utf8');
    const employees = JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('123456', 10);

    const lines = [];
    lines.push('-- =====================================================');
    lines.push('-- Supabase Seed - Sistema RH COPIA GROUP');
    lines.push('-- Gerado: ' + new Date().toISOString());
    lines.push('-- Cole este ficheiro no SQL Editor do Supabase e execute (Run).');
    lines.push('-- =====================================================');
    lines.push('');
    lines.push('BEGIN;');
    lines.push('');
    lines.push('-- 1. Schema');
    lines.push(schema);
    lines.push('');
    lines.push('-- 2. Limpar tabelas (idempotente)');
    lines.push('TRUNCATE TABLE users, employees, recruitment, attendance, leave_requests, payroll, performance, onboarding, audit_logs, job_requisitions, requisition_approvals, interviews, employee_documents, mobility_requests, terminations, talent_pool, employee_evaluations RESTART IDENTITY CASCADE;');
    lines.push('');
    lines.push('-- 3. Utilizadores default');
    lines.push(`INSERT INTO users (username, password_hash, role) VALUES ('admin', '${adminHash}', 'admin');`);
    lines.push('');
    lines.push('-- 4. Colaborador demo (Joao Silva)');
    lines.push(`INSERT INTO employees (name, email, phone, position, department, salary, hire_date)
VALUES ('João Silva', 'joao.silva@copiagroup.com', '+244 923 456 789', 'Analista de TI', 'Tecnologia', 350000, '2024-03-15');`);
    lines.push(`INSERT INTO users (username, password_hash, role, employee_id) VALUES ('joao.silva', '${userHash}', 'user', (SELECT id FROM employees WHERE email = 'joao.silva@copiagroup.com'));`);
    lines.push('');
    lines.push('-- 5. 162 colaboradores reais (anonimizados, sem PII)');
    lines.push('-- Campos: meca, name, email, position, department, hire_date, status, document_type, document_status,');
    lines.push('--         nationality, gender, contract_type, contract_duration_days, seniority, contract_status,');
    lines.push('--         activity_type, site, company, children, academic_degree, salary');

    const cols = ['meca', 'name', 'email', 'position', 'department', 'hire_date', 'status',
                  'document_type', 'document_status', 'nationality', 'gender', 'contract_type',
                  'contract_duration_days', 'seniority', 'contract_status', 'activity_type',
                  'site', 'company', 'children', 'academic_degree', 'salary'];

    for (const e of employees) {
        const values = cols.map(c => {
            if (c === 'salary') return 0;
            return escapeStr(e[c]);
        });
        lines.push(`INSERT INTO employees (${cols.join(', ')}) VALUES (${values.join(', ')});`);
    }

    lines.push('');
    lines.push('-- 6. Reset sequencias para o max(id)');
    lines.push("SELECT setval(pg_get_serial_sequence('employees', 'id'), COALESCE((SELECT MAX(id) FROM employees), 1));");
    lines.push("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));");
    lines.push('');
    lines.push('COMMIT;');
    lines.push('');
    lines.push('-- Confirmar:');
    lines.push('SELECT (SELECT COUNT(*) FROM employees) AS total_colaboradores,');
    lines.push('       (SELECT COUNT(*) FROM users) AS total_utilizadores;');

    fs.writeFileSync(OUT, lines.join('\n'), 'utf8');

    const stat = fs.statSync(OUT);
    console.log(`✓ Gerado: ${OUT}`);
    console.log(`  Tamanho: ${(stat.size / 1024).toFixed(1)} KB`);
    console.log(`  Colaboradores: ${employees.length}`);
    console.log(`  Utilizadores: 2 (admin, joao.silva)`);
    console.log('');
    console.log('Próximo passo:');
    console.log('  1. Abrir Supabase > SQL Editor');
    console.log('  2. New query');
    console.log('  3. Copiar TODO o conteúdo de:');
    console.log('     ' + OUT);
    console.log('  4. Colar no editor e clicar Run');
}

main().catch(err => { console.error(err); process.exit(1); });
