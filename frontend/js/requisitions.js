// Modulo: Pedidos de Recrutamento (FO.CGC.08 + FO.CGC.09)

MODULES.requisitions = {
    items: [],

    STATUS_LABELS: {
        rascunho: { label: 'Rascunho', color: '#64748b', bg: '#f1f5f9' },
        submetido: { label: 'Submetido', color: '#0ea5e9', bg: '#f0f9ff' },
        aprovado_dch: { label: 'Aprovado DCH', color: '#8b5cf6', bg: '#f5f3ff' },
        aprovado_admin: { label: 'Aprovado Admin', color: '#2563eb', bg: '#eff6ff' },
        publicado: { label: 'Publicado', color: '#10b981', bg: '#ecfdf5' },
        preenchido: { label: 'Preenchido', color: '#0d9488', bg: '#f0fdfa' },
        cancelado: { label: 'Cancelado', color: '#94a3b8', bg: '#f1f5f9' },
        rejeitado: { label: 'Rejeitado', color: '#dc2626', bg: '#fef2f2' }
    },

    async load() {
        const container = document.getElementById('requisitionsModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Pedidos de Recrutamento</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.requisitions.showCreateForm()">
                        <i class="codicon codicon-add"></i> Novo Pedido
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
                        <select class="form-control" id="reqFilterStatus" style="max-width:200px;">
                            <option value="">Todos os estados</option>
                            ${Object.entries(this.STATUS_LABELS).map(([k, v]) =>
                                `<option value="${k}">${v.label}</option>`).join('')}
                        </select>
                        <input type="text" class="form-control" id="reqFilterDept" placeholder="Departamento..." style="max-width:200px;">
                        <select class="form-control" id="reqFilterSite" style="max-width:140px;">
                            <option value="">Todos os sites</option>
                            <option value="SEDE">SEDE</option>
                            <option value="AHCC">AHCC</option>
                        </select>
                    </div>
                    <div id="requisitionsList"></div>
                </div>
            </div>
        `;

        document.getElementById('reqFilterStatus').addEventListener('change', () => this.loadData());
        document.getElementById('reqFilterDept').addEventListener('input', this._debounce(() => this.loadData(), 300));
        document.getElementById('reqFilterSite').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    _debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },

    async loadData() {
        try {
            UI.showLoading();
            const params = {};
            const s = document.getElementById('reqFilterStatus')?.value;
            const d = document.getElementById('reqFilterDept')?.value;
            const site = document.getElementById('reqFilterSite')?.value;
            if (s) params.status = s;
            if (d) params.department = d;
            if (site) params.site = site;

            this.items = await API.requisitions.getAll(params);
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar pedidos', 'error');
        }
    },

    render() {
        const container = document.getElementById('requisitionsList');
        if (!this.items.length) {
            container.innerHTML = `<div class="grid-empty"><i class="codicon codicon-inbox"></i><p>Sem pedidos.</p></div>`;
            return;
        }

        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const badge = (st) => {
            const s = this.STATUS_LABELS[st] || { label: st, color: '#666', bg: '#eee' };
            return `<span class="badge" style="background:${s.bg}; color:${s.color};">${s.label}</span>`;
        };

        const rows = this.items.map(r => `
            <tr>
                <td><strong>${escape(r.code || '-')}</strong></td>
                <td>${escape(r.position_title)}</td>
                <td>${escape(r.department)}</td>
                <td>${escape(r.site || '-')}</td>
                <td style="text-align:center;">${r.headcount || 1}</td>
                <td>${badge(r.status)}</td>
                <td>${escape(r.requester_name || '-')}</td>
                <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                <td class="actions">
                    <button class="btn-icon view" onclick="MODULES.requisitions.showDetails(${r.id})" title="Ver"><i class="codicon codicon-eye"></i></button>
                    ${r.status === 'rascunho' ? `<button class="btn-icon edit" onclick="MODULES.requisitions.showEditForm(${r.id})" title="Editar"><i class="codicon codicon-edit"></i></button>` : ''}
                    ${['rascunho','rejeitado','cancelado'].includes(r.status) ? `<button class="btn-icon delete" onclick="MODULES.requisitions.confirmDelete(${r.id}, '${escape(r.code)}')" title="Eliminar"><i class="codicon codicon-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead>
                        <tr><th>Código</th><th>Cargo</th><th>Departamento</th><th>Site</th><th>Vagas</th><th>Estado</th><th>Solicitante</th><th>Criado</th><th>Ações</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    showCreateForm(data = {}) {
        const content = this.getFormHTML(data);
        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-secondary" onclick="MODULES.requisitions.submitForm(false)">Guardar Rascunho</button>
            <button class="btn btn-primary" onclick="MODULES.requisitions.submitForm(true)">Guardar e Submeter</button>
        `;
        UI.createModal('Novo Pedido de Recrutamento', content, footer);
    },

    async showEditForm(id) {
        try {
            const r = await API.requisitions.getById(id);
            const content = this.getFormHTML(r);
            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.requisitions.updateForm(${id})">Atualizar</button>
                <button class="btn btn-success" onclick="MODULES.requisitions.submitExisting(${id})">Submeter para Aprovação</button>
            `;
            UI.createModal(`Editar Pedido ${r.code}`, content, footer);
        } catch (e) {
            UI.showToast('Erro ao carregar pedido', 'error');
        }
    },

    getFormHTML(d = {}) {
        return `
            <form id="reqForm">
                <h3 style="font-size:13px; color:var(--ink-500); margin:0 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    Informação Geral (FO.CGC.08)
                </h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Cargo *</label>
                        <input type="text" class="form-control" id="reqPosition" value="${d.position_title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Departamento *</label>
                        <input type="text" class="form-control" id="reqDept" value="${d.department || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Site</label>
                        <select class="form-control" id="reqSite">
                            <option value="">-</option>
                            <option ${d.site === 'SEDE' ? 'selected' : ''}>SEDE</option>
                            <option ${d.site === 'AHCC' ? 'selected' : ''}>AHCC</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Atividade</label>
                        <select class="form-control" id="reqActivity">
                            <option value="">-</option>
                            <option ${d.activity_type === 'Administrativa' ? 'selected' : ''}>Administrativa</option>
                            <option ${d.activity_type === 'Operativa' ? 'selected' : ''}>Operativa</option>
                            <option ${d.activity_type === 'Híbrida' ? 'selected' : ''}>Híbrida</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Contrato</label>
                        <select class="form-control" id="reqContract">
                            <option value="">-</option>
                            <option ${d.contract_type === 'Determinado' ? 'selected' : ''}>Determinado</option>
                            <option ${d.contract_type === 'Indeterminado' ? 'selected' : ''}>Indeterminado</option>
                            <option ${d.contract_type === 'Estágio' ? 'selected' : ''}>Estágio</option>
                            <option ${d.contract_type === 'Prestação de Serviço' ? 'selected' : ''}>Prestação de Serviço</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nº Vagas</label>
                        <input type="number" min="1" class="form-control" id="reqHeadcount" value="${d.headcount || 1}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Salário Min (Kz)</label>
                        <input type="number" class="form-control" id="reqSalMin" value="${d.salary_range_min || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Salário Max (Kz)</label>
                        <input type="number" class="form-control" id="reqSalMax" value="${d.salary_range_max || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Início Pretendido</label>
                        <input type="date" class="form-control" id="reqStartDate" value="${d.desired_start_date || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Justificação da Necessidade *</label>
                    <textarea class="form-control" id="reqJustification" rows="2" required>${d.justification || ''}</textarea>
                </div>

                <h3 style="font-size:13px; color:var(--ink-500); margin:18px 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
                    Descrição do Cargo (FO.CGC.09)
                </h3>
                <div class="form-group">
                    <label class="form-label">Responsabilidades / Descrição</label>
                    <textarea class="form-control" id="reqDescription" rows="4">${d.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Requisitos / Competências</label>
                    <textarea class="form-control" id="reqRequirements" rows="3">${d.requirements || ''}</textarea>
                </div>
            </form>
        `;
    },

    getFormData() {
        const v = (id) => document.getElementById(id)?.value;
        const data = {
            position_title: v('reqPosition'),
            department: v('reqDept'),
            site: v('reqSite'),
            activity_type: v('reqActivity'),
            contract_type: v('reqContract'),
            headcount: parseInt(v('reqHeadcount')) || 1,
            salary_range_min: parseFloat(v('reqSalMin')) || null,
            salary_range_max: parseFloat(v('reqSalMax')) || null,
            desired_start_date: v('reqStartDate') || null,
            justification: v('reqJustification'),
            description: v('reqDescription'),
            requirements: v('reqRequirements')
        };
        if (!data.position_title || !data.department || !data.justification) {
            UI.showToast('Preencha cargo, departamento e justificação', 'error');
            return null;
        }
        return data;
    },

    async submitForm(submit) {
        const data = this.getFormData();
        if (!data) return;
        data.status = submit ? 'submetido' : 'rascunho';
        try {
            UI.showLoading();
            await API.requisitions.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast(submit ? 'Pedido submetido' : 'Rascunho guardado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async updateForm(id) {
        const data = this.getFormData();
        if (!data) return;
        try {
            UI.showLoading();
            await API.requisitions.update(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Atualizado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async submitExisting(id) {
        const data = this.getFormData();
        if (!data) return;
        try {
            UI.showLoading();
            await API.requisitions.update(id, data);
            await API.requisitions.submit(id);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Submetido para aprovação', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async showDetails(id) {
        try {
            const r = await API.requisitions.getById(id);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const fmt = v => v || '-';
            const fmtDate = v => v ? new Date(v).toLocaleDateString('pt-PT') : '-';
            const sLabel = this.STATUS_LABELS[r.status] || { label: r.status, color: '#666', bg: '#eee' };

            const approvalsHtml = (r.approvals || []).map(a => `
                <li style="padding:8px 12px; background:var(--ink-50); border-radius:6px; margin-bottom:6px;">
                    <strong>${a.role.toUpperCase()}</strong> — ${a.decision}
                    <span style="color:var(--ink-500); font-size:12px; margin-left:8px;">${new Date(a.decided_at).toLocaleString('pt-PT')}</span>
                    ${a.comments ? `<div style="margin-top:4px; font-size:13px; color:var(--ink-700);">${escape(a.comments)}</div>` : ''}
                </li>
            `).join('') || '<li style="color:var(--ink-500);">Sem decisões registadas</li>';

            const actions = [];
            if (r.status === 'submetido') {
                actions.push(`<button class="btn btn-success btn-sm" onclick="MODULES.requisitions.decide(${r.id}, 'dch', 'aprovado')"><i class="codicon codicon-check"></i> Aprovar (DCH)</button>`);
                actions.push(`<button class="btn btn-danger btn-sm" onclick="MODULES.requisitions.decide(${r.id}, 'dch', 'rejeitado')"><i class="codicon codicon-close"></i> Rejeitar (DCH)</button>`);
            } else if (r.status === 'aprovado_dch') {
                actions.push(`<button class="btn btn-success btn-sm" onclick="MODULES.requisitions.decide(${r.id}, 'administracao', 'aprovado')"><i class="codicon codicon-check"></i> Aprovar (Administração)</button>`);
                actions.push(`<button class="btn btn-danger btn-sm" onclick="MODULES.requisitions.decide(${r.id}, 'administracao', 'rejeitado')"><i class="codicon codicon-close"></i> Rejeitar (Administração)</button>`);
            } else if (r.status === 'aprovado_admin') {
                actions.push(`<button class="btn btn-primary btn-sm" onclick="MODULES.requisitions.publish(${r.id})"><i class="codicon codicon-rocket"></i> Publicar Vaga</button>`);
            }

            const content = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px 20px; font-size:14px;">
                    <div><strong>Código:</strong> ${escape(r.code)}</div>
                    <div><strong>Estado:</strong> <span class="badge" style="background:${sLabel.bg}; color:${sLabel.color};">${sLabel.label}</span></div>
                    <div><strong>Cargo:</strong> ${escape(r.position_title)}</div>
                    <div><strong>Departamento:</strong> ${escape(r.department)}</div>
                    <div><strong>Site:</strong> ${fmt(r.site)}</div>
                    <div><strong>Atividade:</strong> ${fmt(r.activity_type)}</div>
                    <div><strong>Contrato:</strong> ${fmt(r.contract_type)}</div>
                    <div><strong>Vagas:</strong> ${r.headcount || 1}</div>
                    <div><strong>Salário:</strong> ${r.salary_range_min || 0} – ${r.salary_range_max || 0} Kz</div>
                    <div><strong>Início:</strong> ${fmtDate(r.desired_start_date)}</div>
                    <div><strong>Solicitante:</strong> ${fmt(r.requester_name)}</div>
                    <div><strong>Criado:</strong> ${fmtDate(r.created_at)}</div>
                </div>
                <hr style="margin:16px 0;">
                <h4 style="margin-bottom:6px;">Justificação</h4>
                <p>${escape(r.justification || '-')}</p>
                <h4 style="margin-top:14px; margin-bottom:6px;">Descrição</h4>
                <p>${escape(r.description || '-')}</p>
                <h4 style="margin-top:14px; margin-bottom:6px;">Requisitos</h4>
                <p>${escape(r.requirements || '-')}</p>
                <hr style="margin:16px 0;">
                <h4 style="margin-bottom:8px;">Histórico de Decisões</h4>
                <ul style="list-style:none; padding:0; margin:0;">${approvalsHtml}</ul>
                ${actions.length ? `<div style="margin-top:18px; display:flex; gap:8px; flex-wrap:wrap;">${actions.join('')}</div>` : ''}
            `;
            UI.createModal(`Pedido ${r.code}`, content, `<button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>`);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    async decide(id, role, decision) {
        const comments = prompt(`Comentário (opcional):`);
        if (comments === null) return;
        try {
            UI.showLoading();
            await API.requisitions.decide(id, role, decision, comments || null);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast(`Decisão registada: ${decision}`, decision === 'aprovado' ? 'success' : 'warning');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async publish(id) {
        try {
            UI.showLoading();
            await API.requisitions.publish(id);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Vaga publicada', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    confirmDelete(id, code) {
        UI.confirm(`Eliminar pedido "${code}"?`, async () => {
            try {
                UI.showLoading();
                await API.requisitions.delete(id);
                UI.hideLoading();
                UI.showToast('Eliminado', 'success');
                this.loadData();
            } catch (e) {
                UI.hideLoading();
                UI.showToast(e.message, 'error');
            }
        });
    }
};
