// Modulo: Offboarding (Despedimentos / Saídas)

MODULES.offboarding = {
    items: [],
    employees: [],

    TYPES: {
        justa_causa: 'Justa Causa',
        fim_contrato: 'Fim de Contrato',
        fim_experimental: 'Fim Período Experimental',
        demissao_voluntaria: 'Demissão Voluntária',
        reforma: 'Reforma'
    },

    async load() {
        const c = document.getElementById('offboardingModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Offboarding & Despedimentos</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.offboarding.showCreateForm()">
                        <i class="codicon codicon-add"></i> Iniciar Saída
                    </button>
                </div>
                <div class="card-body">
                    <div id="offboardingList"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            this.items = await API.offboarding.getAll();
            const empResp = await API.employees.getAll({ limit: 500 });
            this.employees = (empResp.employees || []).filter(e => e.status === 'active');
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    render() {
        const c = document.getElementById('offboardingList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-sign-out"></i><p>Sem processos de saída.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const checkIcon = v => v ? '<i class="codicon codicon-check" style="color:#10b981;"></i>' : '<i class="codicon codicon-circle-large-outline" style="color:#cbd5e1;"></i>';

        const rows = this.items.map(t => `
            <tr>
                <td><strong>${escape(t.meca || '-')}</strong></td>
                <td>${escape(t.employee_name)}</td>
                <td><span class="badge badge-warning">${this.TYPES[t.type] || t.type}</span></td>
                <td>${t.effective_date ? new Date(t.effective_date).toLocaleDateString('pt-PT') : '-'}</td>
                <td style="text-align:center;">${checkIcon(t.equipment_returned)}</td>
                <td style="text-align:center;">${checkIcon(t.work_certificate_issued)}</td>
                <td style="text-align:center;">${checkIcon(t.internal_communication_sent)}</td>
                <td>${t.final_settlement ? Number(t.final_settlement).toLocaleString('pt-PT') + ' Kz' : '-'}</td>
                <td class="actions">
                    <button class="btn-icon edit" onclick="MODULES.offboarding.showChecklist(${t.id})" title="Checklist"><i class="codicon codicon-checklist"></i></button>
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>MECA</th><th>Colaborador</th><th>Tipo</th><th>Data Efetiva</th><th title="Equipamento devolvido">Equip.</th><th title="Certificado de trabalho">Cert.</th><th title="Comunicação interna">Com.</th><th>Fecho de Contas</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    showCreateForm() {
        const empOpts = this.employees.map(e => `<option value="${e.id}">${e.name} (${e.department})</option>`).join('');
        const content = `
            <form>
                <div class="form-group">
                    <label class="form-label">Colaborador *</label>
                    <select class="form-control" id="offEmp" required>
                        <option value="">Selecione...</option>${empOpts}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo *</label>
                        <select class="form-control" id="offType" required>
                            <option value="">Selecione...</option>
                            ${Object.entries(this.TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data da Comunicação</label>
                        <input type="date" class="form-control" id="offNotice">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Data Efetiva (último dia) *</label>
                        <input type="date" class="form-control" id="offEffective" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pré-aviso (dias)</label>
                        <input type="number" class="form-control" id="offNoticeDays" placeholder="ex: 30">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Indemnização (Kz)</label>
                        <input type="number" class="form-control" id="offSeverance">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecho de Contas (Kz)</label>
                        <input type="number" class="form-control" id="offSettlement">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Motivo</label>
                    <textarea class="form-control" id="offReason" rows="3"></textarea>
                </div>
                <div class="alert alert-warning">
                    <i class="codicon codicon-warning"></i>
                    <span>Ao iniciar a saída, o colaborador é marcado como <strong>inativo</strong>.</span>
                </div>
            </form>
        `;
        UI.createModal('Iniciar Processo de Saída', content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="MODULES.offboarding.submit()">Iniciar</button>
        `);
    },

    async submit() {
        const v = id => document.getElementById(id)?.value;
        const data = {
            employee_id: parseInt(v('offEmp')),
            type: v('offType'),
            notice_date: v('offNotice') || null,
            effective_date: v('offEffective'),
            notice_period_days: parseInt(v('offNoticeDays')) || null,
            severance_amount: parseFloat(v('offSeverance')) || null,
            final_settlement: parseFloat(v('offSettlement')) || null,
            reason: v('offReason')
        };
        if (!data.employee_id || !data.type || !data.effective_date) {
            UI.showToast('Preencha colaborador, tipo e data efetiva', 'error');
            return;
        }
        try {
            UI.showLoading();
            await API.offboarding.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Processo iniciado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    showChecklist(id) {
        const t = this.items.find(i => i.id === id);
        if (!t) return;
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const cb = (id, label, checked, extra = '') => `
            <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--ink-50); border-radius:6px; margin-bottom:8px; cursor:pointer;">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span style="flex:1;">${label}</span>
                ${extra}
            </label>
        `;

        const content = `
            <p style="margin-bottom:14px; color:var(--ink-600);">
                <strong>${escape(t.employee_name)}</strong> · ${this.TYPES[t.type]} · saída em ${t.effective_date ? new Date(t.effective_date).toLocaleDateString('pt-PT') : '-'}
            </p>
            ${cb('chkEquip', 'Equipamentos devolvidos (computador, telemóvel, etc.)', t.equipment_returned)}
            <div class="form-group" style="margin-top:-4px; margin-bottom:12px;">
                <label class="form-label" style="font-size:12px; color:var(--ink-500);">Valor pendente de equipamento (a descontar no fecho)</label>
                <input type="number" class="form-control" id="chkEquipValue" value="${t.equipment_pending_value || 0}">
            </div>
            ${cb('chkCert', 'Certificado de Trabalho emitido', t.work_certificate_issued)}
            ${cb('chkComm', 'Comunicação interna enviada (e-mail formal)', t.internal_communication_sent)}
            ${t.type === 'justa_causa' ? cb('chkInsp', 'Inspeção Geral do Trabalho notificada (justa causa)', t.inspection_notified) : ''}
            <div class="form-group" style="margin-top:14px;">
                <label class="form-label">Fecho de Contas (Kz)</label>
                <input type="number" class="form-control" id="chkSettlement" value="${t.final_settlement || ''}">
            </div>
        `;
        UI.createModal(`Checklist de Saída`, content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.offboarding.saveChecklist(${id})">Guardar</button>
        `);
    },

    async saveChecklist(id) {
        const data = {
            equipment_returned: document.getElementById('chkEquip').checked ? 1 : 0,
            equipment_pending_value: parseFloat(document.getElementById('chkEquipValue').value) || 0,
            work_certificate_issued: document.getElementById('chkCert').checked ? 1 : 0,
            internal_communication_sent: document.getElementById('chkComm').checked ? 1 : 0,
            final_settlement: parseFloat(document.getElementById('chkSettlement').value) || null
        };
        const inspCheck = document.getElementById('chkInsp');
        if (inspCheck) data.inspection_notified = inspCheck.checked ? 1 : 0;

        try {
            UI.showLoading();
            await API.offboarding.updateChecklist(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Checklist guardada', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    }
};
