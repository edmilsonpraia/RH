// Modulo: Avaliacoes & Acompanhamento (com matriz 9-Box)

MODULES.evaluations = {
    items: [],
    employees: [],
    nineBoxData: [],
    activeTab: 'list',

    STATUS: {
        rascunho:   { label: 'Rascunho',   color: '#64748b', bg: '#f1f5f9' },
        partilhado: { label: 'Partilhado', color: '#0ea5e9', bg: '#f0f9ff' },
        assinado:   { label: 'Assinado',   color: '#10b981', bg: '#ecfdf5' },
        fechado:    { label: 'Fechado',    color: '#0d9488', bg: '#f0fdfa' }
    },

    // 9-Box: 3x3 matriz (potencial vs desempenho)
    NINE_BOX: {
        '1-1': { label: 'Insuficiente',         color: '#dc2626', advice: 'Avaliar continuidade' },
        '1-2': { label: 'Eficaz',               color: '#f59e0b', advice: 'Manter na função' },
        '1-3': { label: 'Comprometido',         color: '#10b981', advice: 'Reconhecer estabilidade' },
        '2-1': { label: 'Questionável',         color: '#f59e0b', advice: 'Reposicionar' },
        '2-2': { label: 'Mantenedor',           color: '#0ea5e9', advice: 'Desenvolver' },
        '2-3': { label: 'Forte Performer',      color: '#10b981', advice: 'Reter e premiar' },
        '3-1': { label: 'Enigma',               color: '#8b5cf6', advice: 'Coaching urgente' },
        '3-2': { label: 'Crescimento',          color: '#3b82f6', advice: 'Acelerar desenvolvimento' },
        '3-3': { label: 'Estrela',              color: '#10b981', advice: 'Sucessor / Promoção' }
    },

    async load() {
        const c = document.getElementById('evaluationsModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header" style="padding:0;">
                    <div class="tabs-bar" style="display:flex; gap:0; padding:0 20px;">
                        <button class="tab-btn ${this.activeTab === 'list' ? 'active' : ''}" onclick="MODULES.evaluations.switchTab('list')">
                            <i class="codicon codicon-list-flat"></i> Avaliações
                        </button>
                        <button class="tab-btn ${this.activeTab === 'ninebox' ? 'active' : ''}" onclick="MODULES.evaluations.switchTab('ninebox')">
                            <i class="codicon codicon-symbol-array"></i> Matriz 9-Box
                        </button>
                        <button class="tab-btn ${this.activeTab === 'stats' ? 'active' : ''}" onclick="MODULES.evaluations.switchTab('stats')">
                            <i class="codicon codicon-graph"></i> Estatísticas
                        </button>
                    </div>
                </div>
                <div class="card-body" id="evalContent"></div>
            </div>

            <style>
                .tab-btn {
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    padding: 14px 20px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--ink-500);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.15s;
                }
                .tab-btn:hover { color: var(--ink-900); }
                .tab-btn.active { color: var(--brand-600); border-bottom-color: var(--brand-600); }
                .ninebox-grid { display:grid; grid-template-columns: 60px repeat(3, 1fr); gap:8px; }
                .ninebox-cell {
                    background:#fff; border:1px solid var(--ink-200); border-radius:8px;
                    padding:12px; min-height:140px; position:relative;
                }
                .ninebox-cell h5 { font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
                .ninebox-axis { font-size:11px; color:var(--ink-500); text-align:center; padding:8px 0; font-weight:600; }
                .ninebox-employee { background:var(--brand-50); color:var(--brand-700); padding:2px 6px; border-radius:4px; font-size:11px; margin:2px 2px 0 0; display:inline-block; cursor:pointer; }
            </style>
        `;
        await this.loadEmployees();
        await this.renderTab();
    },

    async loadEmployees() {
        try {
            const r = await API.employees.getAll({ limit: 500 });
            this.employees = (r.employees || []).filter(e => e.status === 'active');
        } catch (e) { /* silent */ }
    },

    switchTab(t) {
        this.activeTab = t;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        event.target.closest('.tab-btn').classList.add('active');
        this.renderTab();
    },

    async renderTab() {
        if (this.activeTab === 'list') return this.renderList();
        if (this.activeTab === 'ninebox') return this.renderNineBox();
        if (this.activeTab === 'stats') return this.renderStats();
    },

    // === LISTA DE AVALIACOES ===
    async renderList() {
        const c = document.getElementById('evalContent');
        c.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div></div>
                <button class="btn btn-primary btn-sm" onclick="MODULES.evaluations.showCreateForm()">
                    <i class="codicon codicon-add"></i> Nova Avaliação
                </button>
            </div>
            <div id="evalList"></div>
        `;
        try {
            UI.showLoading();
            this.items = await API.evaluations.getAll();
            UI.hideLoading();
            this.renderListData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    renderListData() {
        const c = document.getElementById('evalList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-graph-line"></i><p>Sem avaliações registadas. Comece a acompanhar o desempenho dos colaboradores.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const badge = st => {
            const s = this.STATUS[st] || { label: st, color: '#666', bg: '#eee' };
            return `<span class="badge" style="background:${s.bg}; color:${s.color};">${s.label}</span>`;
        };
        const stars = (r, max) => {
            if (!r) return '-';
            return '★'.repeat(r) + '<span style="color:#cbd5e1;">' + '★'.repeat(max - r) + '</span>';
        };

        const rows = this.items.map(e => `
            <tr>
                <td><strong>${escape(e.meca || '-')}</strong></td>
                <td>${escape(e.employee_name)}</td>
                <td style="font-size:13px; color:var(--ink-600);">${escape(e.position || '-')}</td>
                <td>${escape(e.period)}</td>
                <td>${e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString('pt-PT') : '-'}</td>
                <td style="color:#f59e0b;">${stars(e.performance_rating, 5)}</td>
                <td style="color:#8b5cf6;">${stars(e.potential_rating, 3)}</td>
                <td>${badge(e.status)}</td>
                <td class="actions">
                    <button class="btn-icon view" onclick="MODULES.evaluations.showDetails(${e.id})" title="Ver"><i class="codicon codicon-eye"></i></button>
                    <button class="btn-icon edit" onclick="MODULES.evaluations.showEditForm(${e.id})" title="Editar"><i class="codicon codicon-edit"></i></button>
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>MECA</th><th>Colaborador</th><th>Função</th><th>Período</th><th>Data</th><th>Desempenho</th><th>Potencial</th><th>Estado</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    // === MATRIZ 9-BOX ===
    async renderNineBox() {
        const c = document.getElementById('evalContent');
        c.innerHTML = `
            <p style="margin-bottom:14px; color:var(--ink-600); font-size:13px;">
                <i class="codicon codicon-info"></i> Matriz baseada na <strong>avaliação mais recente partilhada/assinada/fechada</strong> de cada colaborador.
                Eixo X = Desempenho (1 a 5, agrupado em 3 níveis) · Eixo Y = Potencial (1=baixo, 2=médio, 3=alto)
            </p>
            <div id="nineboxContainer"><div class="grid-empty"><i class="codicon codicon-loading codicon-modifier-spin"></i><p>A carregar...</p></div></div>
        `;
        try {
            this.nineBoxData = await API.evaluations.nineBox();
            this.drawNineBox();
        } catch (e) {
            document.getElementById('nineboxContainer').innerHTML = `<div class="grid-empty"><p>Erro ao carregar matriz.</p></div>`;
        }
    },

    drawNineBox() {
        const container = document.getElementById('nineboxContainer');
        if (!this.nineBoxData.length) {
            container.innerHTML = `<div class="grid-empty"><i class="codicon codicon-symbol-array"></i><p>Sem avaliações fechadas suficientes para gerar a matriz.<br>Crie e finalize avaliações para ver os colaboradores posicionados.</p></div>`;
            return;
        }

        // Mapear desempenho 1-5 -> 1,2,3 (1-2=low, 3=mid, 4-5=high)
        const perfBucket = (p) => p <= 2 ? 1 : p === 3 ? 2 : 3;

        // Buckets [potential][performance]
        const buckets = {};
        this.nineBoxData.forEach(e => {
            const p = e.potential_rating;
            const d = perfBucket(e.performance_rating);
            const k = `${p}-${d}`;
            if (!buckets[k]) buckets[k] = [];
            buckets[k].push(e);
        });

        const cell = (potential, performance) => {
            const k = `${potential}-${performance}`;
            const meta = this.NINE_BOX[k];
            const employees = buckets[k] || [];
            return `
                <div class="ninebox-cell" style="border-top: 3px solid ${meta.color};">
                    <h5 style="color:${meta.color};">${meta.label}</h5>
                    <div style="font-size:11px; color:var(--ink-500); margin-bottom:8px;">${meta.advice}</div>
                    <div style="font-size:18px; font-weight:700; color:${meta.color}; margin-bottom:8px;">${employees.length}</div>
                    <div>
                        ${employees.slice(0, 6).map(e => `
                            <span class="ninebox-employee" title="${e.position || ''}" onclick="MODULES.evaluations.viewHistory(${e.employee_id})">${e.name.split(' ').slice(0, 2).join(' ')}</span>
                        `).join('')}
                        ${employees.length > 6 ? `<span class="ninebox-employee" style="background:var(--ink-100);color:var(--ink-600);">+${employees.length - 6}</span>` : ''}
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            <div style="display:flex; gap:8px;">
                <div style="writing-mode: vertical-rl; transform: rotate(180deg); display:flex; align-items:center; justify-content:center; padding:0 8px; font-weight:600; color:var(--ink-700); font-size:13px;">
                    POTENCIAL ↑
                </div>
                <div style="flex:1;">
                    <div class="ninebox-grid">
                        <div class="ninebox-axis" style="writing-mode: vertical-rl; transform: rotate(180deg);">Alto</div>
                        ${cell(3, 1)}${cell(3, 2)}${cell(3, 3)}
                        <div class="ninebox-axis" style="writing-mode: vertical-rl; transform: rotate(180deg);">Médio</div>
                        ${cell(2, 1)}${cell(2, 2)}${cell(2, 3)}
                        <div class="ninebox-axis" style="writing-mode: vertical-rl; transform: rotate(180deg);">Baixo</div>
                        ${cell(1, 1)}${cell(1, 2)}${cell(1, 3)}
                        <div></div>
                        <div class="ninebox-axis">Baixo (1-2)</div>
                        <div class="ninebox-axis">Médio (3)</div>
                        <div class="ninebox-axis">Alto (4-5)</div>
                    </div>
                    <div style="text-align:center; margin-top:8px; font-weight:600; color:var(--ink-700); font-size:13px;">
                        DESEMPENHO →
                    </div>
                </div>
            </div>
            <p style="margin-top:14px; color:var(--ink-500); font-size:12px; text-align:center;">
                Total na matriz: <strong>${this.nineBoxData.length}</strong> colaboradores avaliados
            </p>
        `;
    },

    async viewHistory(employeeId) {
        try {
            const history = await API.evaluations.history(employeeId);
            const emp = this.employees.find(e => e.id === employeeId);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            if (!history.length) {
                UI.showToast('Sem histórico', 'info');
                return;
            }
            const rows = history.map(h => `
                <tr>
                    <td>${escape(h.period)}</td>
                    <td>${h.evaluation_date ? new Date(h.evaluation_date).toLocaleDateString('pt-PT') : '-'}</td>
                    <td style="color:#f59e0b;">${'★'.repeat(h.performance_rating || 0)}</td>
                    <td style="color:#8b5cf6;">${'★'.repeat(h.potential_rating || 0)}</td>
                    <td><span class="badge" style="background:${(this.STATUS[h.status] || {}).bg || '#eee'}; color:${(this.STATUS[h.status] || {}).color || '#666'};">${(this.STATUS[h.status] || {}).label || h.status}</span></td>
                </tr>
            `).join('');
            const content = `
                <p style="margin-bottom:12px;">${emp ? '<strong>' + escape(emp.name) + '</strong> · ' + escape(emp.position || '') + ' · ' + escape(emp.department || '') : ''}</p>
                <table class="data-grid">
                    <thead><tr><th>Período</th><th>Data</th><th>Desempenho</th><th>Potencial</th><th>Estado</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
            UI.createModal('Histórico de Avaliações', content, `<button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>`);
        } catch (e) {
            UI.showToast('Erro', 'error');
        }
    },

    // === ESTATISTICAS ===
    async renderStats() {
        const c = document.getElementById('evalContent');
        c.innerHTML = `<div id="statsContent"><div class="grid-empty"><i class="codicon codicon-loading codicon-modifier-spin"></i><p>A carregar...</p></div></div>`;
        try {
            const stats = await API.evaluations.stats();
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

            const perfChart = (stats.byPerformance || []).map(p => {
                const total = stats.byPerformance.reduce((s, x) => s + x.n, 0) || 1;
                const pct = ((p.n / total) * 100).toFixed(1);
                return `
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                        <span style="width:80px; color:#f59e0b;">${'★'.repeat(p.performance_rating)}</span>
                        <div style="flex:1; background:var(--ink-100); border-radius:6px; height:24px; overflow:hidden;">
                            <div style="background:var(--brand-500); height:100%; width:${pct}%;"></div>
                        </div>
                        <span style="min-width:60px; text-align:right;">${p.n} (${pct}%)</span>
                    </div>
                `;
            }).join('') || '<p style="color:var(--ink-500);">Sem dados.</p>';

            const deptRows = (stats.byDepartment || []).map(d => `
                <tr>
                    <td>${escape(d.department)}</td>
                    <td style="text-align:right;">${d.n}</td>
                    <td style="text-align:right;"><strong>${Number(d.avg_perf).toFixed(2)}</strong> / 5</td>
                </tr>
            `).join('') || '<tr><td colspan="3" style="text-align:center; color:var(--ink-500);">Sem dados</td></tr>';

            document.getElementById('statsContent').innerHTML = `
                <h3 style="margin-bottom:12px;">Distribuição de Desempenho</h3>
                ${perfChart}
                <h3 style="margin-top:24px; margin-bottom:12px;">Média por Departamento</h3>
                <table class="data-grid">
                    <thead><tr><th>Departamento</th><th style="text-align:right;">Avaliações</th><th style="text-align:right;">Média</th></tr></thead>
                    <tbody>${deptRows}</tbody>
                </table>
            `;
        } catch (e) {
            document.getElementById('statsContent').innerHTML = '<p>Erro ao carregar estatísticas.</p>';
        }
    },

    // === FORMULARIO ===
    showCreateForm() {
        UI.createModal('Nova Avaliação', this.getFormHTML(), `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-secondary" onclick="MODULES.evaluations.submit('rascunho')">Guardar Rascunho</button>
            <button class="btn btn-primary" onclick="MODULES.evaluations.submit('partilhado')">Guardar e Partilhar</button>
        `);
    },

    async showEditForm(id) {
        try {
            const ev = await API.evaluations.getById(id);
            UI.createModal(`Editar avaliação · ${ev.employee_name}`, this.getFormHTML(ev), `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.evaluations.update(${id})">Atualizar</button>
                ${ev.status === 'rascunho' ? `<button class="btn btn-success" onclick="MODULES.evaluations.update(${id}, 'partilhado')">Partilhar</button>` : ''}
                ${ev.status === 'partilhado' ? `<button class="btn btn-success" onclick="MODULES.evaluations.update(${id}, 'fechado')">Fechar</button>` : ''}
            `);
        } catch (e) { UI.showToast('Erro', 'error'); }
    },

    getFormHTML(d = {}) {
        const sel = (val, current) => val === current ? 'selected' : '';
        const empOpts = this.employees.map(e =>
            `<option value="${e.id}" ${sel(e.id, d.employee_id)}>${e.name} (${e.department || '-'})</option>`).join('');

        const ratingSel = (id, val, max) => `
            <select class="form-control" id="${id}">
                <option value="">-</option>
                ${Array.from({length: max}, (_, i) => i + 1).map(n =>
                    `<option value="${n}" ${sel(n, val)}>${'★'.repeat(n)} (${n})</option>`).join('')}
            </select>`;

        return `
            <form id="evalForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Colaborador *</label>
                        <select class="form-control" id="evalEmp" ${d.employee_id ? 'disabled' : 'required'}>
                            <option value="">Selecione...</option>
                            ${empOpts}
                        </select>
                        ${d.employee_id ? `<input type="hidden" id="evalEmpHidden" value="${d.employee_id}">` : ''}
                    </div>
                    <div class="form-group">
                        <label class="form-label">Período *</label>
                        <input type="text" class="form-control" id="evalPeriod" value="${d.period || ''}" placeholder="Ex: Q1-2026, Anual-2026" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data *</label>
                        <input type="date" class="form-control" id="evalDate" value="${d.evaluation_date || new Date().toISOString().slice(0,10)}" required>
                    </div>
                </div>

                <h3 style="font-size:13px; color:var(--ink-500); margin:18px 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    Avaliação Geral (matriz 9-Box)
                </h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Desempenho (1-5) *</label>
                        ${ratingSel('evalPerf', d.performance_rating, 5)}
                    </div>
                    <div class="form-group">
                        <label class="form-label">Potencial (1-3) *</label>
                        ${ratingSel('evalPot', d.potential_rating, 3)}
                    </div>
                </div>

                <h3 style="font-size:13px; color:var(--ink-500); margin:18px 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    Detalhe por Competência (1-5)
                </h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Técnica</label>
                        ${ratingSel('evalTech', d.technical_score, 5)}
                    </div>
                    <div class="form-group">
                        <label class="form-label">Comportamental</label>
                        ${ratingSel('evalBeh', d.behavioral_score, 5)}
                    </div>
                    <div class="form-group">
                        <label class="form-label">Liderança</label>
                        ${ratingSel('evalLead', d.leadership_score, 5)}
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resultados</label>
                        ${ratingSel('evalRes', d.results_score, 5)}
                    </div>
                </div>

                <h3 style="font-size:13px; color:var(--ink-500); margin:18px 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    Análise Qualitativa
                </h3>
                <div class="form-group">
                    <label class="form-label">Pontos Fortes</label>
                    <textarea class="form-control" id="evalStrengths" rows="2">${d.strengths || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Áreas a Melhorar</label>
                    <textarea class="form-control" id="evalAreas" rows="2">${d.areas_to_improve || ''}</textarea>
                </div>

                <h3 style="font-size:13px; color:var(--ink-500); margin:18px 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    Objetivos
                </h3>
                <div class="form-group">
                    <label class="form-label">Objetivos Definidos (próximo período)</label>
                    <textarea class="form-control" id="evalGoals" rows="2">${d.goals_set || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Objetivos Anteriores Atingidos</label>
                    <textarea class="form-control" id="evalGoalsAch" rows="2">${d.goals_achieved || ''}</textarea>
                </div>

                <h3 style="font-size:13px; color:var(--ink-500); margin:18px 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    PDI · Plano de Desenvolvimento Individual
                </h3>
                <div class="form-group">
                    <label class="form-label">Plano (formações, mentorias, projetos)</label>
                    <textarea class="form-control" id="evalPdi" rows="3" placeholder="Ex: Formação em Liderança Q3 · Mentoria com Director X · Liderar projeto Y">${d.development_plan || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Resumo do Feedback</label>
                    <textarea class="form-control" id="evalFeedback" rows="2">${d.feedback_summary || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Comentários do Gestor</label>
                    <textarea class="form-control" id="evalMgrComments" rows="2">${d.manager_comments || ''}</textarea>
                </div>
            </form>
        `;
    },

    getFormData() {
        const v = id => document.getElementById(id)?.value;
        const empId = parseInt(v('evalEmpHidden') || v('evalEmp'));
        if (!empId || !v('evalPeriod') || !v('evalDate')) {
            UI.showToast('Preencha colaborador, período e data', 'error');
            return null;
        }
        return {
            employee_id: empId,
            period: v('evalPeriod'),
            evaluation_date: v('evalDate'),
            performance_rating: parseInt(v('evalPerf')) || null,
            potential_rating: parseInt(v('evalPot')) || null,
            technical_score: parseInt(v('evalTech')) || null,
            behavioral_score: parseInt(v('evalBeh')) || null,
            leadership_score: parseInt(v('evalLead')) || null,
            results_score: parseInt(v('evalRes')) || null,
            strengths: v('evalStrengths') || null,
            areas_to_improve: v('evalAreas') || null,
            goals_set: v('evalGoals') || null,
            goals_achieved: v('evalGoalsAch') || null,
            development_plan: v('evalPdi') || null,
            feedback_summary: v('evalFeedback') || null,
            manager_comments: v('evalMgrComments') || null
        };
    },

    async submit(status) {
        const data = this.getFormData();
        if (!data) return;
        data.status = status;
        try {
            UI.showLoading();
            await API.evaluations.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Avaliação criada', 'success');
            this.renderTab();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async update(id, newStatus) {
        const data = this.getFormData();
        if (!data) return;
        if (newStatus) data.status = newStatus;
        delete data.employee_id;
        try {
            UI.showLoading();
            await API.evaluations.update(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Atualizado', 'success');
            this.renderTab();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async showDetails(id) {
        try {
            const e = await API.evaluations.getById(id);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const sLabel = this.STATUS[e.status] || { label: e.status, color: '#666', bg: '#eee' };
            const stars = (r, max) => r ? '★'.repeat(r) + '<span style="color:#cbd5e1;">' + '★'.repeat(max - r) + '</span>' : '-';

            // 9-box position
            const perfBucket = e.performance_rating <= 2 ? 1 : e.performance_rating === 3 ? 2 : 3;
            const nineBoxKey = `${e.potential_rating}-${perfBucket}`;
            const nineBoxMeta = this.NINE_BOX[nineBoxKey];

            const content = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 20px; font-size:14px; margin-bottom:14px;">
                    <div><strong>Colaborador:</strong> ${escape(e.employee_name)} (${escape(e.meca || '-')})</div>
                    <div><strong>Estado:</strong> <span class="badge" style="background:${sLabel.bg}; color:${sLabel.color};">${sLabel.label}</span></div>
                    <div><strong>Função:</strong> ${escape(e.position || '-')}</div>
                    <div><strong>Departamento:</strong> ${escape(e.department || '-')}</div>
                    <div><strong>Período:</strong> ${escape(e.period)}</div>
                    <div><strong>Data:</strong> ${e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString('pt-PT') : '-'}</div>
                </div>
                <hr>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:14px 0;">
                    <div style="background:var(--ink-50); padding:14px; border-radius:8px; text-align:center;">
                        <div style="color:var(--ink-500); font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Desempenho</div>
                        <div style="font-size:20px; color:#f59e0b; margin:4px 0;">${stars(e.performance_rating, 5)}</div>
                    </div>
                    <div style="background:var(--ink-50); padding:14px; border-radius:8px; text-align:center;">
                        <div style="color:var(--ink-500); font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Potencial</div>
                        <div style="font-size:20px; color:#8b5cf6; margin:4px 0;">${stars(e.potential_rating, 3)}</div>
                    </div>
                </div>
                ${nineBoxMeta ? `
                    <div style="background:${nineBoxMeta.color}15; border-left:3px solid ${nineBoxMeta.color}; padding:12px; border-radius:6px; margin-bottom:14px;">
                        <strong style="color:${nineBoxMeta.color};">Posição 9-Box: ${nineBoxMeta.label}</strong>
                        <div style="font-size:13px; color:var(--ink-700); margin-top:4px;">${nineBoxMeta.advice}</div>
                    </div>
                ` : ''}
                <table class="data-grid" style="margin-bottom:14px;">
                    <thead><tr><th>Competência</th><th style="text-align:right;">Score</th></tr></thead>
                    <tbody>
                        <tr><td>Técnica</td><td style="text-align:right; color:#f59e0b;">${stars(e.technical_score, 5)}</td></tr>
                        <tr><td>Comportamental</td><td style="text-align:right; color:#f59e0b;">${stars(e.behavioral_score, 5)}</td></tr>
                        <tr><td>Liderança</td><td style="text-align:right; color:#f59e0b;">${stars(e.leadership_score, 5)}</td></tr>
                        <tr><td>Resultados</td><td style="text-align:right; color:#f59e0b;">${stars(e.results_score, 5)}</td></tr>
                    </tbody>
                </table>
                ${e.strengths ? `<h4 style="margin-bottom:4px;">Pontos Fortes</h4><p style="margin-bottom:10px;">${escape(e.strengths)}</p>` : ''}
                ${e.areas_to_improve ? `<h4 style="margin-bottom:4px;">Áreas a Melhorar</h4><p style="margin-bottom:10px;">${escape(e.areas_to_improve)}</p>` : ''}
                ${e.goals_set ? `<h4 style="margin-bottom:4px;">Objetivos</h4><p style="margin-bottom:10px;">${escape(e.goals_set)}</p>` : ''}
                ${e.development_plan ? `<h4 style="margin-bottom:4px;">PDI · Plano de Desenvolvimento</h4><p style="margin-bottom:10px;">${escape(e.development_plan)}</p>` : ''}
                ${e.feedback_summary ? `<h4 style="margin-bottom:4px;">Resumo Feedback</h4><p style="margin-bottom:10px;">${escape(e.feedback_summary)}</p>` : ''}
            `;
            UI.createModal('Detalhe da Avaliação', content, `<button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>`);
        } catch (e) {
            UI.showToast('Erro', 'error');
        }
    }
};
