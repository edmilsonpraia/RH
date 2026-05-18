const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, addAuditLog } = require('../database');
const { verifyToken, requireAdmin } = require('../auth');

const VALID_STATUS = ['agendada', 'em_andamento', 'concluida', 'cancelada'];

// Helper: parse JSONB (Supabase) ou TEXT (SQLite) de questions
function parseQuestions(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return []; }
    }
    if (typeof v === 'object') return v;
    return [];
}

// Helper: carrega template da BD por code
function loadTemplateFromDb(code) {
    return new Promise((resolve) => {
        db.get(
            'SELECT code, title, description, type, questions FROM test_templates WHERE code = ? AND (is_active = 1 OR is_active = TRUE)',
            [code],
            (err, row) => {
                if (err || !row) return resolve(null);
                resolve({
                    title: row.title,
                    description: row.description || '',
                    type: row.type,
                    questions: parseQuestions(row.questions)
                });
            }
        );
    });
}

// Devolve template pelo code (DB ou fallback hardcoded)
async function getTest(code) {
    const fromDb = await loadTemplateFromDb(code);
    if (fromDb) return fromDb;
    return TESTS[code] || null;
}

// === DEFINICAO COMPLETA DOS TESTES (FALLBACK hardcoded) ===
// Usado quando a tabela test_templates ainda nao tem o template (ou em modo memoria).
// Estrutura unificada: questions[i] = { q, correct, options? }
const TESTS = {
    admin_ch: {
        title: 'Capital Humano — Assistente Administrativo',
        description: 'Questões básicas de Verdadeiro/Falso (20 perguntas)',
        type: 'vf',
        questions: [
            { q: 'O Capital Humano está relacionado com a gestão de pessoas dentro da empresa.', correct: 'V' },
            { q: 'Informações dos colaboradores podem ser partilhadas livremente fora da empresa.', correct: 'F' },
            { q: 'A pontualidade é importante no ambiente profissional.', correct: 'V' },
            { q: 'O processo de recrutamento ajuda a identificar candidatos adequados para uma função.', correct: 'V' },
            { q: 'Um profissional de RH deve tratar todos os colaboradores de forma respeitosa.', correct: 'V' },
            { q: 'Faltas frequentes não impactam o desempenho profissional.', correct: 'F' },
            { q: 'A comunicação profissional é importante no ambiente de trabalho.', correct: 'V' },
            { q: 'Um estagiário não precisa cumprir normas internas da empresa.', correct: 'F' },
            { q: 'Organização de documentos pode fazer parte das actividades do Capital Humano.', correct: 'V' },
            { q: 'O trabalho em equipa é importante na área de Recursos Humanos.', correct: 'V' },
            { q: 'Um colaborador deve esconder erros cometidos no trabalho.', correct: 'F' },
            { q: 'O sigilo profissional é importante na gestão de informações dos colaboradores.', correct: 'V' },
            { q: 'O atendimento aos colaboradores deve ser feito com educação e profissionalismo.', correct: 'V' },
            { q: 'O uso correcto do e-mail profissional faz parte da comunicação corporativa.', correct: 'V' },
            { q: 'O RH existe apenas para contratar funcionários.', correct: 'F' },
            { q: 'Atenção aos detalhes é importante em tarefas administrativas.', correct: 'V' },
            { q: 'Um ambiente de trabalho saudável contribui para melhor desempenho dos colaboradores.', correct: 'V' },
            { q: 'Conflitos no trabalho devem ser ignorados pela equipa de RH.', correct: 'F' },
            { q: 'Aprender novos processos faz parte do crescimento profissional.', correct: 'V' },
            { q: 'Um profissional de Capital Humano deve agir com ética e responsabilidade.', correct: 'V' }
        ]
    },
    ti: {
        title: 'Técnico de TI',
        description: 'Questões técnicas de múltipla escolha (20 perguntas)',
        type: 'mc',
        questions: [
            { q: 'Um sistema apresenta lentidão após uma atualização. Qual é a primeira ação recomendada?',
              options: ['Formatar o servidor imediatamente.', 'Reverter a atualização e monitorar o comportamento.', 'Ignorar, pois é temporário.', 'Desligar o sistema até novo aviso.'], correct: 1 },
            { q: 'Qual protocolo é responsável pela atribuição automática de endereços IP na rede?',
              options: ['DNS', 'FTP', 'DHCP', 'HTTP'], correct: 2 },
            { q: 'Qual comando SQL é utilizado para recuperar dados de uma tabela?',
              options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'], correct: 2 },
            { q: 'Um arquivo tem 2 048 KB. Qual é o seu tamanho em MB?',
              options: ['2 MB', '20 MB', '0,2 MB', '204,8 MB'], correct: 0 },
            { q: 'Um servidor processa 120 requisições por minuto. Quantas requisições processa em 2,5 horas?',
              options: ['14 400', '18 000', '16 000', '12 000'], correct: 1 },
            { q: 'Qual dispositivo é utilizado para interligar computadores numa rede local?',
              options: ['Scanner', 'Switch', 'Impressora', 'Projector'], correct: 1 },
            { q: 'O que significa a sigla "CPU"?',
              options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing User'], correct: 1 },
            { q: 'Qual sistema operativo é amplamente utilizado em servidores?',
              options: ['Linux', 'Paint', 'Excel', 'Chrome'], correct: 0 },
            { q: 'Qual é a principal função de um antivírus?',
              options: ['Melhorar a internet', 'Proteger o sistema contra ameaças digitais', 'Aumentar a memória RAM', 'Criar backups automáticos'], correct: 1 },
            { q: 'Qual extensão é normalmente utilizada para arquivos do Excel?',
              options: ['.mp3', '.jpg', '.xlsx', '.html'], correct: 2 },
            { q: 'O que acontece quando um computador não possui memória RAM suficiente?',
              options: ['O computador funciona mais rápido', 'O sistema pode apresentar lentidão', 'A internet melhora', 'O monitor desliga automaticamente'], correct: 1 },
            { q: 'Qual ferramenta é mais utilizada para testar conectividade de rede?',
              options: ['Paint', 'Ping', 'Word', 'Photoshop'], correct: 1 },
            { q: 'Qual é a função principal do firewall?',
              options: ['Melhorar a resolução do monitor', 'Bloquear acessos não autorizados à rede', 'Aumentar a velocidade do teclado', 'Limpar arquivos temporários'], correct: 1 },
            { q: 'Um computador ligado à internet sem proteção adequada pode:',
              options: ['Ficar imune a vírus', 'Sofrer ataques cibernéticos', 'Melhorar automaticamente o desempenho', 'Aumentar a capacidade do disco'], correct: 1 },
            { q: 'Qual destes equipamentos é considerado dispositivo de entrada?',
              options: ['Monitor', 'Impressora', 'Teclado', 'Projector'], correct: 2 },
            { q: 'O backup serve para:',
              options: ['Excluir arquivos antigos', 'Recuperar dados em caso de perda', 'Aumentar a velocidade da internet', 'Melhorar a qualidade do áudio'], correct: 1 },
            { q: 'Qual linguagem é mais utilizada para estruturar páginas web?',
              options: ['HTML', 'SQL', 'Python', 'Java'], correct: 0 },
            { q: 'Qual é a função do DNS?',
              options: ['Armazenar arquivos', 'Traduzir nomes de domínio em endereços IP', 'Bloquear vírus', 'Gerar relatórios financeiros'], correct: 1 },
            { q: 'Um técnico de TI deve manter sigilo sobre dados e informações da empresa.',
              options: ['Verdadeiro', 'Falso'], correct: 0 },
            { q: 'Reiniciar um equipamento pode resolver problemas temporários de sistema.',
              options: ['Verdadeiro', 'Falso'], correct: 0 }
        ]
    }
};

// Vista publica do teste (sem respostas corretas)
async function getPublicTest(template) {
    const t = await getTest(template);
    if (!t) return null;
    return {
        title: t.title,
        description: t.description,
        type: t.type,
        questions: t.questions.map(q => {
            if (t.type === 'vf') return { q: q.q };
            return { q: q.q, options: q.options };
        })
    };
}

async function calculateScore(template, answers) {
    const t = await getTest(template);
    if (!t) return null;
    const total = t.questions.length;
    let correct = 0;
    for (let i = 0; i < total; i++) {
        if (answers[i] !== undefined && answers[i] !== null &&
            String(answers[i]) === String(t.questions[i].correct)) {
            correct++;
        }
    }
    return { total, correct, score: total > 0 ? Math.round((correct / total) * 100) : 0 };
}

// ========================================
// ENDPOINTS ADMIN (requerem verifyToken + requireAdmin)
// ========================================

router.get('/', verifyToken, requireAdmin, (req, res) => {
    const { status, candidate_id } = req.query;
    let sql = `SELECT i.id, i.candidate_id, i.phase, i.method, i.interviewer_id,
                      i.scheduled_at, i.completed_at, i.status, i.score,
                      i.technical_score, i.behavioral_score, i.cultural_fit_score,
                      i.recommendation, i.notes, i.test_template, i.test_score,
                      i.test_total, i.test_correct, i.candidate_name_snapshot,
                      i.created_at, i.report,
                      i.test_access_token, i.test_started_at, i.test_submitted_at,
                      r.candidate_name, r.position_title, r.candidate_email
               FROM interviews i
               LEFT JOIN recruitment r ON i.candidate_id = r.id
               WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (candidate_id) { sql += ' AND i.candidate_id = ?'; params.push(parseInt(candidate_id)); }
    sql += ' ORDER BY COALESCE(i.scheduled_at, i.created_at) DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        res.json(rows);
    });
});

router.get('/:id(\\d+)', verifyToken, requireAdmin, (req, res) => {
    db.get(
        `SELECT i.*, r.candidate_name, r.position_title, r.candidate_email,
                r.candidate_phone
         FROM interviews i
         LEFT JOIN recruitment r ON i.candidate_id = r.id
         WHERE i.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Nao encontrada' });
            res.json(row);
        }
    );
});

router.post('/', verifyToken, requireAdmin, (req, res) => {
    const {
        candidate_id, candidate_name_snapshot, phase, method,
        scheduled_at, notes, status
    } = req.body;
    if (!phase) return res.status(400).json({ error: 'Fase obrigatoria (1, 2 ou 3)' });
    if (!candidate_id && !candidate_name_snapshot) {
        return res.status(400).json({ error: 'Forneca candidate_id ou candidate_name_snapshot' });
    }
    const st = VALID_STATUS.includes(status) ? status : 'agendada';

    db.run(
        `INSERT INTO interviews (candidate_id, candidate_name_snapshot, phase, method,
                                  interviewer_id, scheduled_at, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            candidate_id || null, candidate_name_snapshot || null,
            parseInt(phase), method || null, req.user.id,
            scheduled_at || null, st, notes || null
        ],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            addAuditLog(req.user.id, 'CREATE', 'interviews', this.lastID,
                `Entrevista agendada - fase ${phase}`);
            res.status(201).json({ id: this.lastID, status: st });
        }
    );
});

router.put('/:id(\\d+)', verifyToken, requireAdmin, (req, res) => {
    const allowed = [
        'phase', 'method', 'scheduled_at', 'completed_at', 'status',
        'score', 'technical_score', 'behavioral_score', 'cultural_fit_score',
        'report', 'recommendation', 'notes', 'candidate_name_snapshot'
    ];
    const sets = [];
    const vals = [];
    allowed.forEach(f => {
        if (req.body[f] !== undefined) {
            if (f === 'status' && !VALID_STATUS.includes(req.body[f])) return;
            sets.push(`${f} = ?`);
            vals.push(req.body[f] === '' ? null : req.body[f]);
        }
    });
    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(req.params.id);

    db.run(`UPDATE interviews SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
        addAuditLog(req.user.id, 'UPDATE', 'interviews', req.params.id, 'Entrevista atualizada');
        res.json({ message: 'Atualizada' });
    });
});

router.patch('/:id(\\d+)/status', verifyToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Status invalido' });
    db.run(
        `UPDATE interviews SET status = ?, completed_at = CASE WHEN ? = 'concluida' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ?`,
        [status, status, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
            addAuditLog(req.user.id, 'UPDATE', 'interviews', req.params.id, `Status -> ${status}`);
            res.json({ message: 'Atualizada', status });
        }
    );
});

// Aplicacao manual de teste pelo admin (mantida para compatibilidade)
router.post('/:id(\\d+)/test', verifyToken, requireAdmin, async (req, res) => {
    const { test_template, answers } = req.body;
    if (!test_template) return res.status(400).json({ error: 'Template invalido' });
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers deve ser array' });

    const result = await calculateScore(test_template, answers);
    if (!result) return res.status(400).json({ error: 'Template "' + test_template + '" não encontrado' });

    db.run(
        `UPDATE interviews
         SET test_template = ?, test_answers = ?, test_score = ?,
             test_total = ?, test_correct = ?,
             status = CASE WHEN status = 'agendada' THEN 'concluida' ELSE status END,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
             test_submitted_at = COALESCE(test_submitted_at, CURRENT_TIMESTAMP)
         WHERE id = ?`,
        [test_template, JSON.stringify(answers), result.score, result.total, result.correct, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
            addAuditLog(req.user.id, 'TEST', 'interviews', req.params.id,
                `Teste ${test_template}: ${result.correct}/${result.total} (${result.score}%)`);
            res.json({ message: 'Teste registado', ...result });
        }
    );
});

// === GERAR LINK DE TESTE para envio ao candidato ===
router.post('/:id(\\d+)/generate-test-link', verifyToken, requireAdmin, async (req, res) => {
    const { test_template } = req.body;
    if (!test_template) {
        return res.status(400).json({ error: 'test_template obrigatorio' });
    }
    // Validar que o template existe
    const tpl = await getTest(test_template);
    if (!tpl) return res.status(400).json({ error: 'Template "' + test_template + '" não encontrado na BD' });

    // Gerar token unico
    const token = crypto.randomBytes(16).toString('hex');

    db.run(
        `UPDATE interviews
         SET test_template = ?, test_access_token = ?,
             test_started_at = NULL, test_submitted_at = NULL,
             test_score = NULL, test_correct = NULL, test_total = NULL, test_answers = NULL
         WHERE id = ?`,
        [test_template, token, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Entrevista nao encontrada' });
            addAuditLog(req.user.id, 'GENERATE_TEST_LINK', 'interviews', req.params.id,
                `Link gerado para teste ${test_template}`);
            res.json({
                message: 'Link gerado',
                token,
                test_template,
                relative_url: `/test.html?token=${token}`
            });
        }
    );
});

router.delete('/:id(\\d+)', verifyToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM interviews WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (this.changes === 0) return res.status(404).json({ error: 'Nao encontrada' });
        addAuditLog(req.user.id, 'DELETE', 'interviews', req.params.id, 'Entrevista eliminada');
        res.json({ message: 'Eliminada' });
    });
});

// ========================================
// ENDPOINTS PUBLICOS (sem autenticacao - acesso via token)
// ========================================

// GET /api/interviews/test/:token - obter o teste pelo token
router.get('/test/:token', (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Token invalido' });

    db.get(
        `SELECT i.id, i.test_template, i.test_submitted_at, i.candidate_name_snapshot,
                r.candidate_name, r.position_title
         FROM interviews i
         LEFT JOIN recruitment r ON i.candidate_id = r.id
         WHERE i.test_access_token = ?`,
        [token],
        async (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro no servidor' });
            if (!row) return res.status(404).json({ error: 'Link inválido ou expirado' });
            if (row.test_submitted_at) {
                return res.status(410).json({ error: 'Este teste já foi submetido', alreadySubmitted: true });
            }

            const publicTest = await getPublicTest(row.test_template);
            if (!publicTest) return res.status(500).json({ error: 'Template do teste não encontrado' });

            // Marcar inicio (se ainda nao iniciado)
            db.run(
                `UPDATE interviews
                 SET test_started_at = COALESCE(test_started_at, CURRENT_TIMESTAMP),
                     status = CASE WHEN status = 'agendada' THEN 'em_andamento' ELSE status END
                 WHERE id = ? AND test_started_at IS NULL`,
                [row.id]
            );

            res.json({
                candidateName: row.candidate_name || row.candidate_name_snapshot || 'Candidato',
                positionTitle: row.position_title || null,
                test: publicTest
            });
        }
    );
});

// POST /api/interviews/test/:token/submit - submeter respostas
router.post('/test/:token/submit', (req, res) => {
    const { token } = req.params;
    const { answers } = req.body;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Token invalido' });
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers obrigatorio (array)' });

    db.get(
        `SELECT id, test_template, test_submitted_at
         FROM interviews WHERE test_access_token = ?`,
        [token],
        async (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Link inválido' });
            if (row.test_submitted_at) {
                return res.status(410).json({ error: 'Este teste já foi submetido' });
            }
            if (!row.test_template) {
                return res.status(500).json({ error: 'Template do teste não configurado' });
            }

            const result = await calculateScore(row.test_template, answers);
            if (!result) return res.status(500).json({ error: 'Template não encontrado' });

            db.run(
                `UPDATE interviews
                 SET test_answers = ?, test_score = ?, test_total = ?, test_correct = ?,
                     test_submitted_at = CURRENT_TIMESTAMP,
                     status = 'concluida',
                     completed_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [JSON.stringify(answers), result.score, result.total, result.correct, row.id],
                function(err2) {
                    if (err2) return res.status(500).json({ error: 'Erro ao guardar' });
                    addAuditLog(null, 'TEST_SUBMITTED', 'interviews', row.id,
                        `Teste auto-submetido (token): ${result.correct}/${result.total} (${result.score}%)`);
                    res.json({
                        message: 'Teste submetido com sucesso',
                        score: result.score,
                        correct: result.correct,
                        total: result.total
                    });
                }
            );
        }
    );
});

// ========================================
// ENDPOINTS PARA UTILIZADORES AUTENTICADOS (Os Meus Testes)
// ========================================

// GET /api/interviews/my/pending - lista testes pendentes para o user atual (match por email)
router.get('/my/pending', verifyToken, (req, res) => {
    const userEmail = (req.user.username || '').toLowerCase();
    const empId = req.user.employeeId;

    db.all(
        `SELECT i.id, i.test_template, i.test_started_at, i.scheduled_at,
                i.candidate_name_snapshot, r.candidate_name, r.candidate_email,
                r.position_title, e.email as employee_email
         FROM interviews i
         LEFT JOIN recruitment r ON i.candidate_id = r.id
         LEFT JOIN employees e ON e.id = ?
         WHERE i.test_template IS NOT NULL
           AND i.test_submitted_at IS NULL
           AND (
                LOWER(COALESCE(r.candidate_email, '')) = ?
                OR LOWER(COALESCE(e.email, '')) = ?
           )
         ORDER BY i.created_at DESC`,
        [empId || 0, userEmail, userEmail],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro: ' + err.message });
            // Enriquecer com info do template (sem respostas)
            const out = [];
            for (const r of (rows || [])) {
                const tpl = await getTest(r.test_template);
                out.push({
                    interview_id: r.id,
                    candidate_name: r.candidate_name || r.candidate_name_snapshot,
                    position_title: r.position_title,
                    scheduled_at: r.scheduled_at,
                    test_started_at: r.test_started_at,
                    test_template: r.test_template,
                    test_title: tpl ? tpl.title : r.test_template,
                    test_description: tpl ? tpl.description : null,
                    test_type: tpl ? tpl.type : null,
                    questions_count: tpl ? tpl.questions.length : 0
                });
            }
            res.json(out);
        }
    );
});

// GET /api/interviews/my/:id - obter teste para o user fazer (sem respostas certas)
router.get('/my/:id(\\d+)', verifyToken, async (req, res) => {
    const userEmail = (req.user.username || '').toLowerCase();
    const empId = req.user.employeeId;

    db.get(
        `SELECT i.id, i.test_template, i.test_submitted_at, i.candidate_name_snapshot,
                r.candidate_name, r.candidate_email, r.position_title,
                e.email as employee_email
         FROM interviews i
         LEFT JOIN recruitment r ON i.candidate_id = r.id
         LEFT JOIN employees e ON e.id = ?
         WHERE i.id = ?`,
        [empId || 0, req.params.id],
        async (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Não encontrada' });

            const candEmail = (row.candidate_email || '').toLowerCase();
            const empEmail = (row.employee_email || '').toLowerCase();
            if (candEmail !== userEmail && empEmail !== userEmail) {
                return res.status(403).json({ error: 'Acesso negado' });
            }
            if (row.test_submitted_at) {
                return res.status(410).json({ error: 'Teste já submetido', alreadySubmitted: true });
            }
            if (!row.test_template) {
                return res.status(400).json({ error: 'Nenhum teste atribuído a esta entrevista' });
            }

            const publicTest = await getPublicTest(row.test_template);
            if (!publicTest) return res.status(500).json({ error: 'Template não encontrado' });

            // Marcar inicio
            db.run(
                `UPDATE interviews SET test_started_at = COALESCE(test_started_at, CURRENT_TIMESTAMP),
                                       status = CASE WHEN status = 'agendada' THEN 'em_andamento' ELSE status END
                 WHERE id = ? AND test_started_at IS NULL`,
                [row.id]
            );

            res.json({
                candidateName: row.candidate_name || row.candidate_name_snapshot || 'Candidato',
                positionTitle: row.position_title || null,
                test: publicTest
            });
        }
    );
});

// POST /api/interviews/my/:id/submit - submeter respostas pelo user autenticado
router.post('/my/:id(\\d+)/submit', verifyToken, async (req, res) => {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers obrigatorio' });

    const userEmail = (req.user.username || '').toLowerCase();
    const empId = req.user.employeeId;

    db.get(
        `SELECT i.id, i.test_template, i.test_submitted_at,
                r.candidate_email, e.email as employee_email
         FROM interviews i
         LEFT JOIN recruitment r ON i.candidate_id = r.id
         LEFT JOIN employees e ON e.id = ?
         WHERE i.id = ?`,
        [empId || 0, req.params.id],
        async (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            if (!row) return res.status(404).json({ error: 'Não encontrada' });

            const candEmail = (row.candidate_email || '').toLowerCase();
            const empEmail = (row.employee_email || '').toLowerCase();
            if (candEmail !== userEmail && empEmail !== userEmail) {
                return res.status(403).json({ error: 'Acesso negado' });
            }
            if (row.test_submitted_at) {
                return res.status(410).json({ error: 'Teste já submetido' });
            }
            if (!row.test_template) {
                return res.status(400).json({ error: 'Nenhum teste atribuído' });
            }

            const result = await calculateScore(row.test_template, answers);
            if (!result) return res.status(500).json({ error: 'Template não encontrado' });

            db.run(
                `UPDATE interviews
                 SET test_answers = ?, test_score = ?, test_total = ?, test_correct = ?,
                     test_submitted_at = CURRENT_TIMESTAMP, status = 'concluida',
                     completed_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [JSON.stringify(answers), result.score, result.total, result.correct, row.id],
                function(err2) {
                    if (err2) return res.status(500).json({ error: 'Erro ao guardar' });
                    addAuditLog(req.user.id, 'TEST_SUBMITTED', 'interviews', row.id,
                        `Auto-submetido pelo user ${userEmail}: ${result.correct}/${result.total} (${result.score}%)`);
                    res.json({
                        message: 'Teste submetido com sucesso',
                        score: result.score,
                        correct: result.correct,
                        total: result.total
                    });
                }
            );
        }
    );
});

module.exports = router;
