-- =====================================================
-- Schema Postgres para Sistema RH COPIA GROUP
-- Equivalente ao schema SQLite em backend/database.js
-- Usado pelo Supabase
-- =====================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
    employee_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
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
    photo_data TEXT,
    photo_mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recruitment (candidatos)
CREATE TABLE IF NOT EXISTS recruitment (
    id SERIAL PRIMARY KEY,
    position_title TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    candidate_email TEXT NOT NULL,
    candidate_phone TEXT,
    status TEXT DEFAULT 'novo' CHECK(status IN ('novo', 'triagem', 'entrevista', 'aprovado', 'rejeitado')),
    applied_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    cv_file_name TEXT,
    cv_file_data TEXT,
    cv_mime_type TEXT,
    documents TEXT,
    photo_data TEXT,
    photo_mime_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    hours_worked REAL DEFAULT 0,
    status TEXT DEFAULT 'presente' CHECK(status IN ('presente', 'falta', 'ferias', 'doenca', 'justificado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'rejeitado')),
    reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by INTEGER
);

-- Payroll
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_salary REAL NOT NULL,
    bonuses REAL DEFAULT 0,
    deductions REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance (legacy)
CREATE TABLE IF NOT EXISTS performance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    review_date DATE NOT NULL,
    reviewer_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    feedback TEXT,
    goals TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding
CREATE TABLE IF NOT EXISTS onboarding (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('onboarding', 'offboarding')),
    checklist TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'em_progresso', 'concluido')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- === PAD.CGC.04 ===

CREATE TABLE IF NOT EXISTS job_requisitions (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requisition_approvals (
    id SERIAL PRIMARY KEY,
    requisition_id INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('dch','administracao')),
    decision TEXT CHECK(decision IN ('aprovado','rejeitado')),
    comments TEXT,
    decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL,
    phase INTEGER NOT NULL CHECK(phase IN (1,2,3)),
    method TEXT,
    interviewer_id INTEGER,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    score INTEGER CHECK(score BETWEEN 1 AND 5),
    technical_score INTEGER,
    behavioral_score INTEGER,
    cultural_fit_score INTEGER,
    report TEXT,
    recommendation TEXT CHECK(recommendation IN ('avancar','reservar','rejeitar')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_data TEXT,
    issued_date DATE,
    expiry_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by INTEGER
);

CREATE TABLE IF NOT EXISTS mobility_requests (
    id SERIAL PRIMARY KEY,
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
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    decided_by INTEGER,
    decision_comments TEXT
);

CREATE TABLE IF NOT EXISTS terminations (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === Talent Pool ===
CREATE TABLE IF NOT EXISTS talent_pool (
    id SERIAL PRIMARY KEY,
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
    photo_data TEXT,
    photo_mime_type TEXT,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ,
    last_contacted_by INTEGER,
    archived_at TIMESTAMPTZ
);

-- === Avaliacoes ===
CREATE TABLE IF NOT EXISTS employee_evaluations (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices recomendados
CREATE INDEX IF NOT EXISTS idx_employees_meca ON employees(meca);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_site ON employees(site);
CREATE INDEX IF NOT EXISTS idx_recruitment_status ON recruitment(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_employee ON employee_evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_talent_status ON talent_pool(status);
