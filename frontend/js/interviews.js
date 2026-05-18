// Modulo: Entrevistas (com workflow + testes)

MODULES.interviews = {
    items: [],
    candidates: [],
    currentTest: null,  // { id, template, questions, answers: [...] }

    STATUS: {
        agendada:     { label: 'Agendada',     color: '#0ea5e9', bg: '#f0f9ff' },
        em_andamento: { label: 'Em Andamento', color: '#8b5cf6', bg: '#f5f3ff' },
        concluida:    { label: 'Concluída',    color: '#10b981', bg: '#ecfdf5' },
        cancelada:    { label: 'Cancelada',    color: '#dc2626', bg: '#fef2f2' }
    },

    PHASE_LABELS: {
        1: 'Fase 1 (Pré-entrevista telefónica)',
        2: 'Fase 2 (Técnica/Comportamental)',
        3: 'Fase 3 (Director + Responsável de Área)'
    },

    METHODS: ['Telefónica', 'CAR', 'STAR', 'SOARA', 'Prática presencial'],

    // === DEFINICAO DOS TESTES (server tem as respostas corretas) ===
    TESTS: {
        admin_ch: {
            title: 'Capital Humano — Assistente Administrativo',
            description: 'Questões básicas de Verdadeiro/Falso (20 perguntas)',
            type: 'vf',
            questions: [
                'O Capital Humano está relacionado com a gestão de pessoas dentro da empresa.',
                'Informações dos colaboradores podem ser partilhadas livremente fora da empresa.',
                'A pontualidade é importante no ambiente profissional.',
                'O processo de recrutamento ajuda a identificar candidatos adequados para uma função.',
                'Um profissional de RH deve tratar todos os colaboradores de forma respeitosa.',
                'Faltas frequentes não impactam o desempenho profissional.',
                'A comunicação profissional é importante no ambiente de trabalho.',
                'Um estagiário não precisa cumprir normas internas da empresa.',
                'Organização de documentos pode fazer parte das actividades do Capital Humano.',
                'O trabalho em equipa é importante na área de Recursos Humanos.',
                'Um colaborador deve esconder erros cometidos no trabalho.',
                'O sigilo profissional é importante na gestão de informações dos colaboradores.',
                'O atendimento aos colaboradores deve ser feito com educação e profissionalismo.',
                'O uso correcto do e-mail profissional faz parte da comunicação corporativa.',
                'O RH existe apenas para contratar funcionários.',
                'Atenção aos detalhes é importante em tarefas administrativas.',
                'Um ambiente de trabalho saudável contribui para melhor desempenho dos colaboradores.',
                'Conflitos no trabalho devem ser ignorados pela equipa de RH.',
                'Aprender novos processos faz parte do crescimento profissional.',
                'Um profissional de Capital Humano deve agir com ética e responsabilidade.'
            ]
        },
        ti: {
            title: 'Técnico de TI',
            description: 'Questões técnicas de múltipla escolha (20 perguntas)',
            type: 'mc',
            questions: [
                { q: 'Um sistema apresenta lentidão após uma atualização. Qual é a primeira ação recomendada?',
                  options: ['Formatar o servidor imediatamente.', 'Reverter a atualização e monitorar o comportamento.', 'Ignorar, pois é temporário.', 'Desligar o sistema até novo aviso.'] },
                { q: 'Qual protocolo é responsável pela atribuição automática de endereços IP na rede?',
                  options: ['DNS', 'FTP', 'DHCP', 'HTTP'] },
                { q: 'Qual comando SQL é utilizado para recuperar dados de uma tabela?',
                  options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'] },
                { q: 'Um arquivo tem 2 048 KB. Qual é o seu tamanho em MB?',
                  options: ['2 MB', '20 MB', '0,2 MB', '204,8 MB'] },
                { q: 'Um servidor processa 120 requisições por minuto. Quantas requisições processa em 2,5 horas?',
                  options: ['14 400', '18 000', '16 000', '12 000'] },
                { q: 'Qual dispositivo é utilizado para interligar computadores numa rede local?',
                  options: ['Scanner', 'Switch', 'Impressora', 'Projector'] },
                { q: 'O que significa a sigla "CPU"?',
                  options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing User'] },
                { q: 'Qual sistema operativo é amplamente utilizado em servidores?',
                  options: ['Linux', 'Paint', 'Excel', 'Chrome'] },
                { q: 'Qual é a principal função de um antivírus?',
                  options: ['Melhorar a internet', 'Proteger o sistema contra ameaças digitais', 'Aumentar a memória RAM', 'Criar backups automáticos'] },
                { q: 'Qual extensão é normalmente utilizada para arquivos do Excel?',
                  options: ['.mp3', '.jpg', '.xlsx', '.html'] },
                { q: 'O que acontece quando um computador não possui memória RAM suficiente?',
                  options: ['O computador funciona mais rápido', 'O sistema pode apresentar lentidão', 'A internet melhora', 'O monitor desliga automaticamente'] },
                { q: 'Qual ferramenta é mais utilizada para testar conectividade de rede?',
                  options: ['Paint', 'Ping', 'Word', 'Photoshop'] },
                { q: 'Qual é a função principal do firewall?',
                  options: ['Melhorar a resolução do monitor', 'Bloquear acessos não autorizados à rede', 'Aumentar a velocidade do teclado', 'Limpar arquivos temporários'] },
                { q: 'Um computador ligado à internet sem proteção adequada pode:',
                  options: ['Ficar imune a vírus', 'Sofrer ataques cibernéticos', 'Melhorar automaticamente o desempenho', 'Aumentar a capacidade do disco'] },
                { q: 'Qual destes equipamentos é considerado dispositivo de entrada?',
                  options: ['Monitor', 'Impressora', 'Teclado', 'Projector'] },
                { q: 'O backup serve para:',
                  options: ['Excluir arquivos antigos', 'Recuperar dados em caso de perda', 'Aumentar a velocidade da internet', 'Melhorar a qualidade do áudio'] },
                { q: 'Qual linguagem é mais utilizada para estruturar páginas web?',
                  options: ['HTML', 'SQL', 'Python', 'Java'] },
                { q: 'Qual é a função do DNS?',
                  options: ['Armazenar arquivos', 'Traduzir nomes de domínio em endereços IP', 'Bloquear vírus', 'Gerar relatórios financeiros'] },
                { q: 'Um técnico de TI deve manter sigilo sobre dados e informações da empresa.',
                  options: ['Verdadeiro', 'Falso'] },
                { q: 'Reiniciar um equipamento pode resolver problemas temporários de sistema.',
                  options: ['Verdadeiro', 'Falso'] }
            ]
        }
    },

    async load() {
        const c = document.getElementById('interviewsModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Entrevistas</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.interviews.showCreateForm()">
                        <i class="codicon codicon-add"></i> Agendar Entrevista
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
                        <select class="form-control" id="intFilterStatus" style="max-width:200px;">
                            <option value="">Todos os estados</option>
                            ${Object.entries(this.STATUS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
                        </select>
                    </div>
                    <div id="intList"></div>
                </div>
            </div>
        `;
        document.getElementById('intFilterStatus').addEventListener('change', () => this.loadData());
        await Promise.all([this.loadData(), this.loadCandidates()]);
    },

    async loadCandidates() {
        try {
            this.candidates = await API.recruitment.getAll();
        } catch { this.candidates = []; }
    },

    async loadData() {
        try {
            UI.showLoading();
            const st = document.getElementById('intFilterStatus')?.value;
            const params = st ? { status: st } : {};
            this.items = await API.interviews.getAll(params);
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar entrevistas', 'error');
        }
    },

    render() {
        const c = document.getElementById('intList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-comment-discussion"></i><p>Sem entrevistas. Comece por agendar uma a partir de um candidato.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        const statusDropdown = (r) => {
            const opts = Object.entries(this.STATUS).map(([k, v]) =>
                `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v.label}</option>`).join('');
            return `<select onchange="event.stopPropagation(); MODULES.interviews.quickStatus(${r.id}, this.value)" onclick="event.stopPropagation();" style="padding:4px 8px; border:1px solid var(--ink-300); border-radius:4px; font-size:12px; background:#fff; cursor:pointer;">${opts}</select>`;
        };

        const testCell = (r) => {
            // Score ja registado (submetido manualmente ou via link)
            if (r.test_submitted_at || (r.test_score !== null && r.test_score !== undefined)) {
                const tpl = this.TESTS[r.test_template];
                const name = tpl ? tpl.title.split('—')[0].trim() : r.test_template;
                const scoreColor = r.test_score >= 70 ? '#10b981' : r.test_score >= 50 ? '#f59e0b' : '#dc2626';
                const via = r.test_submitted_at && r.test_access_token ? ' · via link' : ' · presencial';
                return `<div style="font-size:12px;"><strong style="color:${scoreColor};">${r.test_score}%</strong> <span style="color:var(--ink-500);">(${r.test_correct}/${r.test_total})</span><div style="font-size:10px; color:var(--ink-500);">${escape(name)}${via}</div></div>`;
            }
            // Link gerado, aguarda submissao
            if (r.test_access_token) {
                const tpl = this.TESTS[r.test_template];
                const name = tpl ? tpl.title.split('—')[0].trim() : r.test_template;
                const inProgress = !!r.test_started_at;
                const color = inProgress ? '#f59e0b' : '#0ea5e9';
                const label = inProgress ? 'Em curso' : 'Aguarda';
                return `<div style="font-size:12px; cursor:pointer;" onclick="event.stopPropagation(); MODULES.interviews.copyTestLink('${r.test_access_token}')">
                    <span style="color:${color}; font-weight:600;">⏳ ${label}</span>
                    <div style="font-size:10px; color:var(--ink-500);">${escape(name)} · clica p/ copiar link</div>
                </div>`;
            }
            // Sem teste
            return `<button class="btn-icon" style="color:var(--brand-600);" onclick="event.stopPropagation(); MODULES.interviews.startTest(${r.id})" title="Aplicar teste"><i class="codicon codicon-play"></i></button>`;
        };

        const rows = this.items.map(r => `
            <tr style="cursor:pointer;" onclick="MODULES.interviews.showDetails(${r.id})">
                <td><strong>${escape(r.candidate_name || r.candidate_name_snapshot || 'Sem candidato')}</strong>${r.candidate_email ? `<div style="font-size:11px; color:var(--ink-500);">${escape(r.candidate_email)}</div>` : ''}</td>
                <td>${escape(r.position_title || '-')}</td>
                <td style="font-size:12px;">${this.PHASE_LABELS[r.phase] || ('Fase ' + r.phase)}</td>
                <td>${escape(r.method || '-')}</td>
                <td>${r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                <td onclick="event.stopPropagation();">${statusDropdown(r)}</td>
                <td onclick="event.stopPropagation();" style="text-align:center;">${testCell(r)}</td>
                <td class="actions" onclick="event.stopPropagation();">
                    <button class="btn-icon edit" onclick="MODULES.interviews.showEditForm(${r.id})" title="Editar"><i class="codicon codicon-edit"></i></button>
                    <button class="btn-icon delete" onclick="MODULES.interviews.confirmDelete(${r.id})" title="Eliminar"><i class="codicon codicon-trash"></i></button>
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>Candidato</th><th>Cargo</th><th>Fase</th><th>Método</th><th>Data/Hora</th><th>Estado</th><th>Teste</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    async quickStatus(id, status) {
        try {
            await API.interviews.changeStatus(id, status);
            const it = this.items.find(i => i.id === id);
            if (it) it.status = status;
            UI.showToast(`Estado: ${this.STATUS[status]?.label || status}`, 'success');
        } catch (e) {
            UI.showToast(e.message, 'error');
            this.loadData();
        }
    },

    showCreateForm(prefilledCandidateId = null) {
        const candOpts = this.candidates.map(c =>
            `<option value="${c.id}" ${c.id == prefilledCandidateId ? 'selected' : ''}>${c.candidate_name} (${c.position_title})</option>`).join('');

        const content = `
            <form id="intForm">
                <div class="form-group">
                    <label class="form-label">Candidato</label>
                    <select class="form-control" id="intCandidate">
                        <option value="">Selecione um candidato existente...</option>
                        ${candOpts}
                    </select>
                    <small style="color:var(--ink-500); font-size:12px;">Se o candidato ainda não está em Recrutamento, deixe vazio e preencha o nome abaixo.</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Ou nome livre do candidato</label>
                    <input type="text" class="form-control" id="intCandidateName" placeholder="Ex: Maria Silva">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fase *</label>
                        <select class="form-control" id="intPhase" required>
                            <option value="1">${this.PHASE_LABELS[1]}</option>
                            <option value="2" selected>${this.PHASE_LABELS[2]}</option>
                            <option value="3">${this.PHASE_LABELS[3]}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Método</label>
                        <select class="form-control" id="intMethod">
                            <option value="">-</option>
                            ${this.METHODS.map(m => `<option>${m}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Data e hora</label>
                        <input type="datetime-local" class="form-control" id="intScheduled">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" id="intStatus">
                            ${Object.entries(this.STATUS).map(([k, v]) => `<option value="${k}" ${k === 'agendada' ? 'selected' : ''}>${v.label}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea class="form-control" id="intNotes" rows="3" placeholder="Observações sobre a entrevista..."></textarea>
                </div>
            </form>
        `;
        UI.createModal('Agendar Entrevista', content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.interviews.submit()">Agendar</button>
        `);
    },

    async submit() {
        const v = id => document.getElementById(id)?.value;
        const data = {
            candidate_id: parseInt(v('intCandidate')) || null,
            candidate_name_snapshot: v('intCandidateName') || null,
            phase: parseInt(v('intPhase')),
            method: v('intMethod'),
            scheduled_at: v('intScheduled') || null,
            status: v('intStatus'),
            notes: v('intNotes')
        };
        if (!data.candidate_id && !data.candidate_name_snapshot) {
            UI.showToast('Indique um candidato (lista ou nome livre)', 'error');
            return;
        }
        try {
            UI.showLoading();
            await API.interviews.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Entrevista agendada', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async showEditForm(id) {
        try {
            const r = await API.interviews.getById(id);
            const candOpts = this.candidates.map(c =>
                `<option value="${c.id}" ${c.id === r.candidate_id ? 'selected' : ''}>${c.candidate_name} (${c.position_title})</option>`).join('');
            const sel = (val, cur) => val == cur ? 'selected' : '';

            const content = `
                <form id="intForm">
                    <div class="form-group">
                        <label class="form-label">Candidato</label>
                        <select class="form-control" id="intCandidate">
                            <option value="">—</option>
                            ${candOpts}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome livre (alternativa)</label>
                        <input type="text" class="form-control" id="intCandidateName" value="${(r.candidate_name_snapshot || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Fase</label>
                            <select class="form-control" id="intPhase">
                                <option value="1" ${sel(1, r.phase)}>${this.PHASE_LABELS[1]}</option>
                                <option value="2" ${sel(2, r.phase)}>${this.PHASE_LABELS[2]}</option>
                                <option value="3" ${sel(3, r.phase)}>${this.PHASE_LABELS[3]}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Método</label>
                            <select class="form-control" id="intMethod">
                                <option value="">-</option>
                                ${this.METHODS.map(m => `<option ${sel(m, r.method)}>${m}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Data e hora</label>
                            <input type="datetime-local" class="form-control" id="intScheduled" value="${r.scheduled_at ? r.scheduled_at.slice(0,16) : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado</label>
                            <select class="form-control" id="intStatus">
                                ${Object.entries(this.STATUS).map(([k, v]) => `<option value="${k}" ${sel(k, r.status)}>${v.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Avaliação Técnica (1-5)</label>
                            <input type="number" min="1" max="5" class="form-control" id="intTechScore" value="${r.technical_score || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Avaliação Comportamental (1-5)</label>
                            <input type="number" min="1" max="5" class="form-control" id="intBehScore" value="${r.behavioral_score || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cultural Fit (1-5)</label>
                            <input type="number" min="1" max="5" class="form-control" id="intCultScore" value="${r.cultural_fit_score || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Recomendação</label>
                        <select class="form-control" id="intReco">
                            <option value="">-</option>
                            <option value="avancar" ${sel('avancar', r.recommendation)}>Avançar</option>
                            <option value="reservar" ${sel('reservar', r.recommendation)}>Reservar</option>
                            <option value="rejeitar" ${sel('rejeitar', r.recommendation)}>Rejeitar</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Relatório de entrevista (FO.CGC.05)</label>
                        <textarea class="form-control" id="intReport" rows="3">${r.report || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notas</label>
                        <textarea class="form-control" id="intNotes" rows="2">${r.notes || ''}</textarea>
                    </div>
                </form>
            `;
            UI.createModal(`Editar Entrevista #${r.id}`, content, `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.interviews.updateSubmit(${id})">Atualizar</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar entrevista', 'error');
        }
    },

    async updateSubmit(id) {
        const v = id => document.getElementById(id)?.value;
        const data = {
            candidate_id: parseInt(v('intCandidate')) || null,
            candidate_name_snapshot: v('intCandidateName') || null,
            phase: parseInt(v('intPhase')),
            method: v('intMethod') || null,
            scheduled_at: v('intScheduled') || null,
            status: v('intStatus'),
            technical_score: parseInt(v('intTechScore')) || null,
            behavioral_score: parseInt(v('intBehScore')) || null,
            cultural_fit_score: parseInt(v('intCultScore')) || null,
            recommendation: v('intReco') || null,
            report: v('intReport') || null,
            notes: v('intNotes') || null
        };
        try {
            UI.showLoading();
            await API.interviews.update(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Entrevista atualizada', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async showDetails(id) {
        try {
            const r = await API.interviews.getById(id);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const fmt = v => v || '-';
            const sLabel = this.STATUS[r.status] || { label: r.status, color: '#666', bg: '#eee' };

            // Bloco do teste
            let testBlock = '';
            if (r.test_template) {
                const tpl = this.TESTS[r.test_template];
                const scoreColor = r.test_score >= 70 ? '#10b981' : r.test_score >= 50 ? '#f59e0b' : '#dc2626';
                testBlock = `
                    <h4 style="font-size:13px; color:var(--ink-500); margin:16px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Resultado do Teste</h4>
                    <div style="background:var(--ink-50); padding:14px; border-radius:8px; border-left:4px solid ${scoreColor};">
                        <div style="font-size:13px; color:var(--ink-600);">${tpl ? tpl.title : r.test_template}</div>
                        <div style="font-size:28px; font-weight:700; color:${scoreColor}; margin-top:4px;">
                            ${r.test_score}% <span style="font-size:14px; color:var(--ink-500); font-weight:normal;">(${r.test_correct} de ${r.test_total} corretas)</span>
                        </div>
                    </div>
                `;
            } else {
                testBlock = `
                    <h4 style="font-size:13px; color:var(--ink-500); margin:16px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Teste</h4>
                    <p style="color:var(--ink-500); font-size:13px;">Sem teste aplicado.</p>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.interviews.startTest(${r.id})">
                        <i class="codicon codicon-play"></i> Aplicar Teste
                    </button>
                `;
            }

            const content = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; font-size:14px; margin-bottom:14px;">
                    <div><strong>Candidato:</strong> ${escape(r.candidate_name || r.candidate_name_snapshot || '-')}</div>
                    <div><strong>Estado:</strong> <span class="badge" style="background:${sLabel.bg}; color:${sLabel.color};">${sLabel.label}</span></div>
                    <div><strong>Email:</strong> ${escape(fmt(r.candidate_email))}</div>
                    <div><strong>Cargo:</strong> ${escape(fmt(r.position_title))}</div>
                    <div><strong>Fase:</strong> ${this.PHASE_LABELS[r.phase] || r.phase}</div>
                    <div><strong>Método:</strong> ${escape(fmt(r.method))}</div>
                    <div><strong>Agendada para:</strong> ${r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('pt-PT') : '-'}</div>
                    <div><strong>Concluída em:</strong> ${r.completed_at ? new Date(r.completed_at).toLocaleString('pt-PT') : '-'}</div>
                </div>
                ${r.technical_score || r.behavioral_score || r.cultural_fit_score ? `
                    <h4 style="font-size:13px; color:var(--ink-500); margin:14px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Avaliação Manual</h4>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; text-align:center;">
                        <div style="background:var(--ink-50); padding:10px; border-radius:6px;">
                            <div style="font-size:11px; color:var(--ink-500); text-transform:uppercase;">Técnica</div>
                            <div style="color:#f59e0b; font-size:18px;">${r.technical_score ? '★'.repeat(r.technical_score) : '-'}</div>
                        </div>
                        <div style="background:var(--ink-50); padding:10px; border-radius:6px;">
                            <div style="font-size:11px; color:var(--ink-500); text-transform:uppercase;">Comportamental</div>
                            <div style="color:#f59e0b; font-size:18px;">${r.behavioral_score ? '★'.repeat(r.behavioral_score) : '-'}</div>
                        </div>
                        <div style="background:var(--ink-50); padding:10px; border-radius:6px;">
                            <div style="font-size:11px; color:var(--ink-500); text-transform:uppercase;">Cultural Fit</div>
                            <div style="color:#f59e0b; font-size:18px;">${r.cultural_fit_score ? '★'.repeat(r.cultural_fit_score) : '-'}</div>
                        </div>
                    </div>
                ` : ''}
                ${r.recommendation ? `<p style="margin-top:14px;"><strong>Recomendação:</strong> ${escape(r.recommendation)}</p>` : ''}
                ${r.report ? `<h4 style="margin-top:14px; margin-bottom:4px;">Relatório (FO.CGC.05)</h4><p style="white-space:pre-line;">${escape(r.report)}</p>` : ''}
                ${r.notes ? `<h4 style="margin-top:14px; margin-bottom:4px;">Notas</h4><p style="white-space:pre-line;">${escape(r.notes)}</p>` : ''}
                ${testBlock}
            `;
            UI.createModal('Detalhe da Entrevista', content, `
                <button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>
                <button class="btn btn-secondary btn-sm" onclick="MODULES.interviews.showEditForm(${r.id})"><i class="codicon codicon-edit"></i> Editar</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    // === FLUXO DE TESTE ===
    startTest(interviewId) {
        const content = `
            <p style="margin-bottom:14px; color:var(--ink-600);"><strong>1.</strong> Escolha o teste a aplicar:</p>
            ${Object.entries(this.TESTS).map(([key, t]) => `
                <div style="border:1px solid var(--ink-200); border-radius:8px; padding:14px; margin-bottom:10px;">
                    <div style="font-weight:600; margin-bottom:4px;">${t.title}</div>
                    <div style="font-size:13px; color:var(--ink-600); margin-bottom:10px;">${t.description}</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-outline btn-sm" onclick="MODULES.interviews.openTest(${interviewId}, '${key}')">
                            <i class="codicon codicon-edit"></i> Aplicar Presencialmente
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="MODULES.interviews.generateLinkForCandidate(${interviewId}, '${key}')">
                            <i class="codicon codicon-link"></i> Gerar Link para o Candidato
                        </button>
                    </div>
                </div>
            `).join('')}
            <div style="background:var(--ink-50); padding:12px; border-radius:6px; font-size:13px; color:var(--ink-600); margin-top:10px;">
                <i class="codicon codicon-info"></i>
                <strong>Presencial:</strong> tu marcas as respostas enquanto o candidato responde verbalmente.<br>
                <i class="codicon codicon-info"></i>
                <strong>Link:</strong> o candidato recebe um URL e responde sozinho. O score é registado automaticamente.
            </div>
        `;
        UI.createModal('Como aplicar o teste?', content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
        `);
    },

    async generateLinkForCandidate(interviewId, templateKey) {
        try {
            UI.showLoading();
            const r = await API.interviews.generateTestLink(interviewId, templateKey);
            UI.hideLoading();
            const fullUrl = window.location.origin + r.relative_url;
            const tplName = this.TESTS[templateKey]?.title || templateKey;
            const content = `
                <div class="alert alert-success">
                    <i class="codicon codicon-check"></i>
                    <span>Link gerado com sucesso!</span>
                </div>
                <p style="margin-bottom:8px;"><strong>Teste:</strong> ${tplName}</p>
                <p style="margin-bottom:6px; color:var(--ink-700);">Envia este link ao candidato (e-mail, WhatsApp, etc.):</p>
                <div style="background:var(--ink-50); padding:14px; border-radius:8px; word-break:break-all; font-family:monospace; font-size:13px; border:1px solid var(--ink-200);">
                    ${fullUrl}
                </div>
                <div style="margin-top:12px; display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="MODULES.interviews._copyToClipboard('${fullUrl.replace(/'/g, "&#39;")}')">
                        <i class="codicon codicon-copy"></i> Copiar Link
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="window.open('${fullUrl}', '_blank')">
                        <i class="codicon codicon-link-external"></i> Abrir noutra Aba
                    </button>
                </div>
                <div style="margin-top:14px; padding:12px; background:var(--warning-50); border-left:3px solid var(--warning); border-radius:6px; font-size:13px; color:#92400e;">
                    <i class="codicon codicon-warning"></i>
                    Cada link só pode ser usado <strong>uma vez</strong>. Após o candidato submeter, o score aparece automaticamente nesta entrevista.
                </div>
            `;
            UI.createModal('Link de Teste do Candidato', content, `
                <button class="btn btn-primary" onclick="UI.closeModal(); MODULES.interviews.loadData();">Fechar</button>
            `);
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message || 'Erro ao gerar link', 'error');
        }
    },

    copyTestLink(token) {
        const fullUrl = window.location.origin + '/test.html?token=' + token;
        this._copyToClipboard(fullUrl);
        UI.showToast('Link copiado para a área de transferência', 'success');
    },

    _copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => this._copyFallback(text));
        } else {
            this._copyFallback(text);
        }
    },

    _copyFallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
    },

    openTest(interviewId, templateKey) {
        const tpl = this.TESTS[templateKey];
        if (!tpl) return;
        this.currentTest = {
            interviewId,
            template: templateKey,
            answers: new Array(tpl.questions.length).fill(null)
        };

        let bodyHtml;
        if (tpl.type === 'vf') {
            bodyHtml = tpl.questions.map((q, idx) => `
                <div style="padding:12px; border:1px solid var(--ink-200); border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; gap:8px; margin-bottom:6px;">
                        <strong style="color:var(--brand-700);">${idx + 1}.</strong>
                        <span>${q}</span>
                    </div>
                    <div style="display:flex; gap:14px; padding-left:22px;">
                        <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                            <input type="radio" name="q${idx}" value="V" onchange="MODULES.interviews.setAnswer(${idx}, 'V')"> Verdadeiro
                        </label>
                        <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                            <input type="radio" name="q${idx}" value="F" onchange="MODULES.interviews.setAnswer(${idx}, 'F')"> Falso
                        </label>
                    </div>
                </div>
            `).join('');
        } else {
            // multipla escolha
            bodyHtml = tpl.questions.map((q, idx) => `
                <div style="padding:12px; border:1px solid var(--ink-200); border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; gap:8px; margin-bottom:8px;">
                        <strong style="color:var(--brand-700);">${idx + 1}.</strong>
                        <span>${q.q}</span>
                    </div>
                    <div style="padding-left:22px; display:flex; flex-direction:column; gap:6px;">
                        ${q.options.map((opt, oi) => `
                            <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                                <input type="radio" name="q${idx}" value="${oi}" onchange="MODULES.interviews.setAnswer(${idx}, ${oi})">
                                <span>${String.fromCharCode(65 + oi)}) ${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        const content = `
            <div style="background:var(--brand-50); padding:12px; border-radius:8px; margin-bottom:14px;">
                <strong>${tpl.title}</strong><br>
                <span style="font-size:13px; color:var(--ink-600);">${tpl.description}</span><br>
                <span style="font-size:12px; color:var(--ink-500);" id="testProgress">Respondidas: 0 / ${tpl.questions.length}</span>
            </div>
            <div style="max-height: 60vh; overflow-y: auto;">
                ${bodyHtml}
            </div>
        `;

        UI.createModal(`Aplicar Teste — ${tpl.title}`, content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.interviews.submitTest()">Submeter Teste</button>
        `);
    },

    setAnswer(idx, value) {
        if (!this.currentTest) return;
        this.currentTest.answers[idx] = value;
        const answered = this.currentTest.answers.filter(a => a !== null).length;
        const total = this.currentTest.answers.length;
        const el = document.getElementById('testProgress');
        if (el) el.textContent = `Respondidas: ${answered} / ${total}`;
    },

    async submitTest() {
        const t = this.currentTest;
        if (!t) return;
        const answered = t.answers.filter(a => a !== null).length;
        if (answered === 0) {
            UI.showToast('Marque pelo menos uma resposta', 'error');
            return;
        }
        if (answered < t.answers.length) {
            if (!confirm(`Apenas ${answered} de ${t.answers.length} respondidas. As não respondidas contam como erradas. Submeter mesmo assim?`)) return;
        }
        try {
            UI.showLoading();
            const result = await API.interviews.submitTest(t.interviewId, t.template, t.answers);
            UI.hideLoading();
            UI.closeModal();
            const color = result.score >= 70 ? 'success' : result.score >= 50 ? 'warning' : 'error';
            UI.showToast(`Resultado: ${result.score}% (${result.correct}/${result.total})`, color);
            this.currentTest = null;
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    confirmDelete(id) {
        UI.confirm('Eliminar esta entrevista permanentemente?', async () => {
            try {
                await API.interviews.delete(id);
                UI.showToast('Eliminada', 'success');
                this.loadData();
            } catch (e) {
                UI.showToast(e.message, 'error');
            }
        });
    }
};
