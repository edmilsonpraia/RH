// Modulo: Talent Scouting (Banco de Talentos)

MODULES.talentScouting = {
    items: [],
    stats: null,

    STATUS: {
        ativo:        { label: 'Ativo',        color: '#10b981', bg: '#ecfdf5' },
        contactado:   { label: 'Contactado',   color: '#0ea5e9', bg: '#f0f9ff' },
        em_processo:  { label: 'Em Processo',  color: '#8b5cf6', bg: '#f5f3ff' },
        alocado:      { label: 'Alocado',      color: '#0d9488', bg: '#f0fdfa' },
        indisponivel: { label: 'Indisponível', color: '#94a3b8', bg: '#f1f5f9' },
        arquivado:    { label: 'Arquivado',    color: '#dc2626', bg: '#fef2f2' }
    },

    SOURCES: ['LinkedIn', 'Jobartis', 'Net Empregos', 'Referência', 'Espontânea', 'Centro de Emprego', 'Ex-Candidato', 'Headhunting'],

    async load() {
        const c = document.getElementById('talentScoutingModule');
        c.innerHTML = `
            <div id="tsStatsRow" class="stats-grid" style="grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));"></div>

            <div class="card">
                <div class="card-header">
                    <h2>Banco de Talentos</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.talentScouting.showCreateForm()">
                        <i class="codicon codicon-add"></i> Novo Talento
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
                        <input type="text" class="form-control" id="tsSearch" placeholder="🔍 Pesquisar nome, skill, função..." style="flex:2; min-width:220px;">
                        <select class="form-control" id="tsStatus" style="max-width:160px;">
                            <option value="">Todos estados</option>
                            ${Object.entries(this.STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                        </select>
                        <select class="form-control" id="tsSource" style="max-width:160px;">
                            <option value="">Todas fontes</option>
                            ${this.SOURCES.map(s => `<option>${s}</option>`).join('')}
                        </select>
                        <input type="text" class="form-control" id="tsArea" placeholder="Área..." style="max-width:160px;">
                    </div>
                    <div id="tsList"></div>
                </div>
            </div>
        `;

        const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
        document.getElementById('tsSearch').addEventListener('input', debounce(() => this.loadData(), 300));
        document.getElementById('tsStatus').addEventListener('change', () => this.loadData());
        document.getElementById('tsSource').addEventListener('change', () => this.loadData());
        document.getElementById('tsArea').addEventListener('input', debounce(() => this.loadData(), 300));

        await Promise.all([this.loadData(), this.loadStats()]);
    },

    async loadStats() {
        try {
            this.stats = await API.talentPool.stats();
            const c = document.getElementById('tsStatsRow');
            const get = (st) => (this.stats.byStatus.find(s => s.status === st) || { n: 0 }).n;
            c.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon brand"><i class="codicon codicon-target"></i></div>
                    <div class="stat-info"><h3>${this.stats.total}</h3><p>Total</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success"><i class="codicon codicon-check"></i></div>
                    <div class="stat-info"><h3>${get('ativo')}</h3><p>Ativos</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info"><i class="codicon codicon-mail"></i></div>
                    <div class="stat-info"><h3>${get('contactado')}</h3><p>Contactados</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple"><i class="codicon codicon-arrow-right"></i></div>
                    <div class="stat-info"><h3>${get('em_processo')}</h3><p>Em Processo</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning"><i class="codicon codicon-archive"></i></div>
                    <div class="stat-info"><h3>${get('arquivado') + get('indisponivel')}</h3><p>Arquivados/Indisp.</p></div>
                </div>
            `;
        } catch (e) { /* silent */ }
    },

    async loadData() {
        try {
            UI.showLoading();
            const params = {
                search: document.getElementById('tsSearch')?.value,
                status: document.getElementById('tsStatus')?.value,
                source: document.getElementById('tsSource')?.value,
                area: document.getElementById('tsArea')?.value
            };
            Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
            this.items = await API.talentPool.getAll(params);
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    render() {
        const c = document.getElementById('tsList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-target"></i><p>Sem talentos no banco. Comece a alimentar o banco para próximas vagas.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const badge = st => {
            const s = this.STATUS[st] || { label: st, color: '#666', bg: '#eee' };
            return `<span class="badge" style="background:${s.bg}; color:${s.color};">${s.label}</span>`;
        };
        const stars = (r) => r ? '★'.repeat(r) + '☆'.repeat(5 - r) : '-';
        const cvIcon = (t) => (t.cv_file_name)
            ? `<button class="btn-icon view" onclick="event.stopPropagation(); API.talentPool.openCv(${t.id}, '${escape(t.cv_file_name).replace(/'/g, "\\'")}')" title="Abrir CV"><i class="codicon codicon-file-text" style="color:var(--brand-600);"></i></button>`
            : (t.cv_text
                ? '<i class="codicon codicon-note" title="CV em texto" style="color:var(--ink-500);"></i>'
                : '<i class="codicon codicon-file" style="color:var(--ink-300);" title="Sem CV"></i>');

        const rows = this.items.map(t => `
            <tr>
                <td><strong>${escape(t.name)}</strong>${t.location ? `<div style="font-size:11px;color:var(--ink-500);">${escape(t.location)}</div>` : ''}</td>
                <td>${escape(t.position_of_interest || '-')}</td>
                <td>${escape(t.area || '-')}</td>
                <td>${escape(t.source || '-')}</td>
                <td>${t.experience_years ? `${t.experience_years} anos` : '-'}</td>
                <td style="color:#f59e0b; font-size:14px;">${stars(t.rating)}</td>
                <td style="text-align:center;">${cvIcon(t)}</td>
                <td>${badge(t.status)}</td>
                <td style="font-size:12px; color:var(--ink-500);">${t.created_at ? new Date(t.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                <td class="actions">
                    <button class="btn-icon view" onclick="MODULES.talentScouting.showDetails(${t.id})" title="Ver"><i class="codicon codicon-eye"></i></button>
                    <button class="btn-icon edit" onclick="MODULES.talentScouting.showEditForm(${t.id})" title="Editar"><i class="codicon codicon-edit"></i></button>
                    ${t.status !== 'em_processo' ? `<button class="btn-icon" style="color:var(--brand-600);" onclick="MODULES.talentScouting.convert(${t.id}, '${escape(t.position_of_interest || '').replace(/'/g, '&#39;')}')" title="Converter em candidato"><i class="codicon codicon-arrow-right"></i></button>` : ''}
                    ${['arquivado','indisponivel'].includes(t.status) ? `<button class="btn-icon delete" onclick="MODULES.talentScouting.confirmDelete(${t.id}, '${escape(t.name).replace(/'/g, '&#39;')}')" title="Eliminar"><i class="codicon codicon-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead>
                        <tr><th>Nome</th><th>Função Interesse</th><th>Área</th><th>Fonte</th><th>Exp.</th><th>Rating</th><th>CV</th><th>Estado</th><th>Adicionado</th><th>Ações</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    showCreateForm() {
        UI.createModal('Novo Talento', this.getFormHTML(), `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.talentScouting.submit()">Adicionar ao Banco</button>
        `);
    },

    async showEditForm(id) {
        try {
            const t = await API.talentPool.getById(id);
            UI.createModal(`Editar: ${t.name}`, this.getFormHTML(t), `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.talentScouting.update(${id})">Atualizar</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    getFormHTML(d = {}) {
        const sel = (val, current) => val === current ? 'selected' : '';
        return `
            <form id="tsForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-control" id="tsName" value="${d.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" id="tsEmail" value="${d.email || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input type="text" class="form-control" id="tsPhone" value="${d.phone || ''}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Função de Interesse</label>
                        <input type="text" class="form-control" id="tsPosition" value="${d.position_of_interest || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Área</label>
                        <input type="text" class="form-control" id="tsArea" value="${d.area || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Localização</label>
                        <input type="text" class="form-control" id="tsLocation" value="${d.location || ''}" placeholder="Luanda">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fonte</label>
                        <select class="form-control" id="tsSourceField">
                            <option value="">-</option>
                            ${this.SOURCES.map(s => `<option ${sel(s, d.source)}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" id="tsStatusField">
                            ${Object.entries(this.STATUS).map(([k, v]) => `<option value="${k}" ${sel(k, d.status || 'ativo')}>${v.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rating (1-5)</label>
                        <select class="form-control" id="tsRating">
                            <option value="">-</option>
                            ${[1,2,3,4,5].map(n => `<option value="${n}" ${sel(n, d.rating)}>${'★'.repeat(n)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Anos de Experiência</label>
                        <input type="number" min="0" class="form-control" id="tsExp" value="${d.experience_years || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Empregador Atual</label>
                        <input type="text" class="form-control" id="tsEmployer" value="${d.current_employer || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pretensão Salarial (Kz)</label>
                        <input type="number" class="form-control" id="tsSalary" value="${d.expected_salary || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Skills (separadas por vírgula)</label>
                    <input type="text" class="form-control" id="tsSkills" value="${d.skills || ''}" placeholder="Excel avançado, AutoCAD, Liderança...">
                </div>

                <div class="form-group">
                    <label class="form-label">Formação Académica</label>
                    <textarea class="form-control" id="tsEducation" rows="2">${d.education || ''}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">CV / Currículo (texto livre)</label>
                    <textarea class="form-control" id="tsCv" rows="3" placeholder="Resumo profissional, experiência relevante...">${d.cv_text || ''}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">CV (ficheiro PDF/DOCX) <span style="font-size:11px; color:var(--ink-500);">— máx 10MB</span></label>
                    <input type="file" class="form-control" id="tsCvFile" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg">
                    ${d.cv_file_name ? `
                        <div style="margin-top:6px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--ink-50); border-radius:6px;">
                            <i class="codicon codicon-file-text" style="color:var(--brand-600);"></i>
                            <span style="font-size:13px; flex:1;">${d.cv_file_name}</span>
                            <button type="button" class="btn-icon view" onclick="API.talentPool.openCv(${d.id}, '${d.cv_file_name.replace(/'/g, "\\'")}')" title="Abrir"><i class="codicon codicon-eye"></i></button>
                            <button type="button" class="btn-icon delete" onclick="MODULES.talentScouting.removeCv(${d.id})" title="Remover"><i class="codicon codicon-trash"></i></button>
                        </div>
                    ` : ''}
                </div>

                <div class="form-group">
                    <label class="form-label">Documentos adicionais <span style="font-size:11px; color:var(--ink-500);">— certificados, diplomas, cartas de recomendação</span></label>
                    <input type="file" class="form-control" id="tsDocsFile" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" multiple>
                    <div id="tsDocsList" style="margin-top:8px;">
                        ${this._renderDocsList(d)}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Tags (separadas por vírgula)</label>
                    <input type="text" class="form-control" id="tsTags" value="${d.tags || ''}" placeholder="senior, bilingue, disponivel-imediatamente">
                </div>

                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea class="form-control" id="tsNotes" rows="2">${d.notes || ''}</textarea>
                </div>

                <div style="background:var(--ink-50); padding:12px; border-radius:6px; margin-top:8px; border-left:3px solid var(--brand-500);">
                    <h4 style="font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--ink-700); margin-bottom:8px;">Proteção de Dados (LGPD Angola)</h4>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:6px;">
                        <input type="checkbox" id="tsConsent" ${d.consent_given ? 'checked' : ''}>
                        <span style="font-size:13px;">Consentimento dado pelo titular para retenção dos dados</span>
                    </label>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label" style="font-size:12px;">Data de expiração do consentimento</label>
                        <input type="date" class="form-control" id="tsConsentExpiry" value="${d.consent_expiry_date || ''}">
                    </div>
                </div>
            </form>
        `;
    },

    _renderDocsList(d = {}) {
        let docs = [];
        try { docs = JSON.parse(d.documents || '[]'); } catch {}
        if (!docs.length) return '<div style="font-size:12px; color:var(--ink-500);">Sem documentos anexados.</div>';
        return docs.map((doc, idx) => `
            <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--ink-50); border-radius:6px; margin-bottom:4px;">
                <i class="codicon codicon-file"></i>
                <span style="flex:1; font-size:13px;">${doc.name}</span>
                <span style="font-size:11px; color:var(--ink-500);">${(doc.size / 1024).toFixed(1)} KB</span>
                <button type="button" class="btn-icon view" onclick="API.talentPool.openDocument(${d.id}, ${idx}, '${doc.name.replace(/'/g, "\\'")}')" title="Abrir"><i class="codicon codicon-eye"></i></button>
            </div>
        `).join('');
    },

    async getFormData() {
        const v = id => document.getElementById(id)?.value;
        const data = {
            name: v('tsName'),
            email: v('tsEmail') || null,
            phone: v('tsPhone') || null,
            position_of_interest: v('tsPosition') || null,
            area: v('tsArea') || null,
            location: v('tsLocation') || null,
            source: v('tsSourceField') || null,
            status: v('tsStatusField') || 'ativo',
            rating: parseInt(v('tsRating')) || null,
            experience_years: parseInt(v('tsExp')) || null,
            current_employer: v('tsEmployer') || null,
            expected_salary: parseFloat(v('tsSalary')) || null,
            skills: v('tsSkills') || null,
            education: v('tsEducation') || null,
            cv_text: v('tsCv') || null,
            tags: v('tsTags') || null,
            notes: v('tsNotes') || null,
            consent_given: document.getElementById('tsConsent').checked ? 1 : 0,
            consent_expiry_date: v('tsConsentExpiry') || null
        };
        if (!data.name) {
            UI.showToast('Nome é obrigatório', 'error');
            return null;
        }

        // Processar CV
        const cvInput = document.getElementById('tsCvFile');
        if (cvInput?.files?.[0]) {
            const f = cvInput.files[0];
            if (f.size > 10 * 1024 * 1024) {
                UI.showToast('CV excede 10MB', 'error');
                return null;
            }
            const obj = await API.fileToObject(f);
            data.cv_file_name = obj.name;
            data.cv_file_data = obj.data;
            data.cv_mime_type = obj.mime;
        }

        // Processar documentos extras
        const docsInput = document.getElementById('tsDocsFile');
        if (docsInput?.files?.length) {
            const docs = [];
            for (const f of docsInput.files) {
                if (f.size > 5 * 1024 * 1024) {
                    UI.showToast(`"${f.name}" excede 5MB - ignorado`, 'warning');
                    continue;
                }
                docs.push(await API.fileToObject(f));
            }
            if (docs.length) data.documents = JSON.stringify(docs);
        }

        return data;
    },

    async submit() {
        const data = await this.getFormData();
        if (!data) return;
        try {
            UI.showLoading();
            await API.talentPool.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Talento adicionado ao banco', 'success');
            this.loadData();
            this.loadStats();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async update(id) {
        const data = await this.getFormData();
        if (!data) return;
        try {
            UI.showLoading();
            await API.talentPool.update(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Atualizado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async showDetails(id) {
        try {
            const t = await API.talentPool.getById(id);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const fmt = v => v || '-';
            const fmtDate = v => v ? new Date(v).toLocaleDateString('pt-PT') : '-';
            const stars = r => r ? '★'.repeat(r) + '☆'.repeat(5 - r) : '-';
            const sLabel = this.STATUS[t.status] || { label: t.status, color: '#666', bg: '#eee' };

            const skillsHtml = (t.skills || '').split(',').map(s => s.trim()).filter(Boolean)
                .map(s => `<span class="badge badge-brand" style="margin-right:4px;">${escape(s)}</span>`).join('');
            const tagsHtml = (t.tags || '').split(',').map(s => s.trim()).filter(Boolean)
                .map(s => `<span class="badge badge-secondary" style="margin-right:4px;">${escape(s)}</span>`).join('');

            const content = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; font-size:14px;">
                    <div><strong>Nome:</strong> ${escape(t.name)}</div>
                    <div><strong>Estado:</strong> <span class="badge" style="background:${sLabel.bg}; color:${sLabel.color};">${sLabel.label}</span></div>
                    <div><strong>Email:</strong> ${fmt(t.email)}</div>
                    <div><strong>Telefone:</strong> ${fmt(t.phone)}</div>
                    <div><strong>Função interesse:</strong> ${fmt(t.position_of_interest)}</div>
                    <div><strong>Área:</strong> ${fmt(t.area)}</div>
                    <div><strong>Localização:</strong> ${fmt(t.location)}</div>
                    <div><strong>Fonte:</strong> ${fmt(t.source)}</div>
                    <div><strong>Experiência:</strong> ${t.experience_years ? t.experience_years + ' anos' : '-'}</div>
                    <div><strong>Empregador atual:</strong> ${fmt(t.current_employer)}</div>
                    <div><strong>Pretensão salarial:</strong> ${t.expected_salary ? Number(t.expected_salary).toLocaleString('pt-PT') + ' Kz' : '-'}</div>
                    <div><strong>Rating:</strong> <span style="color:#f59e0b;">${stars(t.rating)}</span></div>
                </div>
                <hr style="margin:14px 0;">
                <div style="margin-bottom:10px;"><strong>Skills:</strong><br>${skillsHtml || '<em style="color:var(--ink-500);">não definidas</em>'}</div>
                <div style="margin-bottom:10px;"><strong>Tags:</strong><br>${tagsHtml || '<em style="color:var(--ink-500);">sem tags</em>'}</div>
                ${t.education ? `<div style="margin-bottom:10px;"><strong>Formação:</strong><br>${escape(t.education).replace(/\n/g, '<br>')}</div>` : ''}
                ${t.cv_file_name ? `
                    <div style="margin-bottom:10px;">
                        <strong>CV (ficheiro):</strong>
                        <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--ink-50); border-radius:6px; margin-top:4px;">
                            <i class="codicon codicon-file-text" style="color:var(--brand-600); font-size:18px;"></i>
                            <span style="flex:1; font-size:13px;">${escape(t.cv_file_name)}</span>
                            <button class="btn btn-outline btn-sm" onclick="API.talentPool.openCv(${t.id}, '${escape(t.cv_file_name).replace(/'/g, "\\'")}')"><i class="codicon codicon-eye"></i> Abrir</button>
                        </div>
                    </div>
                ` : ''}
                ${(() => {
                    let docs = [];
                    try { docs = JSON.parse(t.documents || '[]'); } catch {}
                    if (!docs.length) return '';
                    return `<div style="margin-bottom:10px;"><strong>Documentos (${docs.length}):</strong>${docs.map((doc, idx) => `
                        <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--ink-50); border-radius:6px; margin-top:4px;">
                            <i class="codicon codicon-file"></i>
                            <span style="flex:1; font-size:13px;">${escape(doc.name)}</span>
                            <span style="font-size:11px; color:var(--ink-500);">${(doc.size / 1024).toFixed(1)} KB</span>
                            <button class="btn-icon view" onclick="API.talentPool.openDocument(${t.id}, ${idx}, '${escape(doc.name).replace(/'/g, "\\'")}')" title="Abrir"><i class="codicon codicon-eye"></i></button>
                        </div>
                    `).join('')}</div>`;
                })()}
                ${t.cv_text ? `<div style="margin-bottom:10px;"><strong>CV (texto):</strong><div style="background:var(--ink-50); padding:10px; border-radius:6px; margin-top:4px; max-height:200px; overflow:auto; white-space:pre-wrap;">${escape(t.cv_text)}</div></div>` : ''}
                ${t.notes ? `<div style="margin-bottom:10px;"><strong>Notas:</strong> ${escape(t.notes)}</div>` : ''}
                <hr style="margin:14px 0;">
                <div style="font-size:12px; color:var(--ink-500);">
                    Adicionado: ${fmtDate(t.created_at)}
                    ${t.last_contacted_at ? ` · Último contacto: ${fmtDate(t.last_contacted_at)}` : ''}
                    ${t.consent_given ? ` · ✅ Consentimento dado` : ' · ⚠️ Sem consentimento LGPD'}
                    ${t.consent_expiry_date ? ` · Expira: ${fmtDate(t.consent_expiry_date)}` : ''}
                </div>
            `;
            UI.createModal(t.name, content, `
                <button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>
                <button class="btn btn-secondary btn-sm" onclick="MODULES.talentScouting.markContacted(${t.id})"><i class="codicon codicon-mail"></i> Marcar Contactado</button>
                <button class="btn btn-primary btn-sm" onclick="MODULES.talentScouting.convert(${t.id}, '${escape(t.position_of_interest || '').replace(/'/g, '&#39;')}')"><i class="codicon codicon-arrow-right"></i> Converter em Candidato</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    async removeCv(id) {
        if (!confirm('Remover o CV anexado?')) return;
        try {
            await API.talentPool.update(id, { cv_file_name: null, cv_file_data: null, cv_mime_type: null });
            UI.showToast('CV removido', 'success');
            UI.closeModal();
            this.loadData();
        } catch (e) {
            UI.showToast(e.message, 'error');
        }
    },

    async markContacted(id) {
        try {
            await API.talentPool.contact(id);
            UI.closeModal();
            UI.showToast('Marcado como contactado', 'success');
            this.loadData();
            this.loadStats();
        } catch (e) {
            UI.showToast(e.message, 'error');
        }
    },

    async convert(id, defaultPos) {
        const position = prompt('Para que vaga? (deixe vazio para usar a função de interesse)', defaultPos || '');
        if (position === null) return;
        try {
            UI.showLoading();
            const r = await API.talentPool.convert(id, position || null);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast(`Convertido em candidato #${r.candidateId}. Veja no Recrutamento.`, 'success');
            this.loadData();
            this.loadStats();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    confirmDelete(id, name) {
        UI.confirm(`Eliminar permanentemente "${name}"? (LGPD: só permitido para arquivados/indisponíveis)`, async () => {
            try {
                await API.talentPool.delete(id);
                UI.showToast('Eliminado', 'success');
                this.loadData();
                this.loadStats();
            } catch (e) {
                UI.showToast(e.message, 'error');
            }
        });
    }
};
