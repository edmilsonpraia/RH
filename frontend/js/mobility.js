// Modulo: Mobilidade Interna (transferências de área/site)

MODULES.mobility = {
    items: [],
    employees: [],

    STATUS: {
        pendente: { label: 'Pendente', color: '#f59e0b', bg: '#fffbeb' },
        aprovado: { label: 'Aprovado', color: '#10b981', bg: '#ecfdf5' },
        rejeitado: { label: 'Rejeitado', color: '#dc2626', bg: '#fef2f2' },
        concluido: { label: 'Concluído', color: '#0d9488', bg: '#f0fdfa' }
    },

    async load() {
        const c = document.getElementById('mobilityModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Pedidos de Mobilidade Interna</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.mobility.showCreateForm()">
                        <i class="codicon codicon-add"></i> Novo Pedido
                    </button>
                </div>
                <div class="card-body">
                    <div id="mobilityList"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            this.items = await API.mobility.getAll();
            const empResp = await API.employees.getAll({ limit: 500 });
            this.employees = empResp.employees || [];
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    render() {
        const c = document.getElementById('mobilityList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-arrow-swap"></i><p>Sem pedidos de mobilidade.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const badge = st => {
            const s = this.STATUS[st] || { label: st, color: '#666', bg: '#eee' };
            return `<span class="badge" style="background:${s.bg}; color:${s.color};">${s.label}</span>`;
        };

        const rows = this.items.map(m => `
            <tr>
                <td><strong>${escape(m.meca || '-')}</strong></td>
                <td>${escape(m.employee_name)}</td>
                <td>${escape(m.from_department)} → ${escape(m.to_department)}</td>
                <td>${escape(m.from_site || '-')} → ${escape(m.to_site || '-')}</td>
                <td>${m.qhsa_required ? '<span class="badge badge-warning">SIM</span>' : '<span class="badge badge-secondary">NÃO</span>'}</td>
                <td>${badge(m.status)}</td>
                <td>${m.requested_at ? new Date(m.requested_at).toLocaleDateString('pt-PT') : '-'}</td>
                <td class="actions">
                    ${m.status === 'pendente' ? `
                        <button class="btn-icon edit" onclick="MODULES.mobility.decide(${m.id}, 'aprovado')" title="Aprovar"><i class="codicon codicon-check"></i></button>
                        <button class="btn-icon delete" onclick="MODULES.mobility.decide(${m.id}, 'rejeitado')" title="Rejeitar"><i class="codicon codicon-close"></i></button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>MECA</th><th>Colaborador</th><th>Dept (origem → destino)</th><th>Site</th><th>QHSA</th><th>Estado</th><th>Pedido</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    showCreateForm() {
        const empOpts = this.employees
            .filter(e => e.status === 'active')
            .map(e => `<option value="${e.id}">${e.name} (${e.department})</option>`).join('');
        const content = `
            <form id="mobForm">
                <div class="form-group">
                    <label class="form-label">Colaborador *</label>
                    <select class="form-control" id="mobEmployee" required>
                        <option value="">Selecione...</option>${empOpts}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Dept Origem *</label>
                        <input type="text" class="form-control" id="mobFromDept" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dept Destino *</label>
                        <input type="text" class="form-control" id="mobToDept" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Site Origem</label>
                        <select class="form-control" id="mobFromSite"><option value="">-</option><option>SEDE</option><option>AHCC</option></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Site Destino</label>
                        <select class="form-control" id="mobToSite"><option value="">-</option><option>SEDE</option><option>AHCC</option></select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Função Origem</label>
                        <input type="text" class="form-control" id="mobFromPos">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Função Destino</label>
                        <input type="text" class="form-control" id="mobToPos">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Motivo</label>
                    <textarea class="form-control" id="mobReason" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="mobQhsa">
                        Requer avaliação QHSA (mudança de site/atividade operativa)
                    </label>
                </div>
            </form>
        `;
        UI.createModal('Novo Pedido de Mobilidade', content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.mobility.submit()">Submeter</button>
        `);

        // Auto-preencher origem ao selecionar colaborador
        document.getElementById('mobEmployee').addEventListener('change', (ev) => {
            const emp = this.employees.find(e => e.id == ev.target.value);
            if (emp) {
                document.getElementById('mobFromDept').value = emp.department || '';
                document.getElementById('mobFromSite').value = emp.site || '';
                document.getElementById('mobFromPos').value = emp.position || '';
            }
        });
    },

    async submit() {
        const v = id => document.getElementById(id)?.value;
        const data = {
            employee_id: parseInt(v('mobEmployee')),
            from_department: v('mobFromDept'),
            to_department: v('mobToDept'),
            from_site: v('mobFromSite'),
            to_site: v('mobToSite'),
            from_position: v('mobFromPos'),
            to_position: v('mobToPos'),
            reason: v('mobReason'),
            qhsa_required: document.getElementById('mobQhsa').checked
        };
        if (!data.employee_id || !data.from_department || !data.to_department) {
            UI.showToast('Preencha colaborador e departamentos', 'error');
            return;
        }
        try {
            UI.showLoading();
            await API.mobility.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Pedido criado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async decide(id, status) {
        const comments = prompt(`Comentário (opcional):`);
        if (comments === null) return;
        let qhsa_assessment = null;
        const item = this.items.find(i => i.id === id);
        if (item && item.qhsa_required) {
            qhsa_assessment = prompt('Avaliação QHSA:') || '';
        }
        try {
            UI.showLoading();
            await API.mobility.decide(id, status, comments || null, qhsa_assessment);
            UI.hideLoading();
            UI.showToast(`Pedido ${status}`, status === 'aprovado' ? 'success' : 'warning');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    }
};
