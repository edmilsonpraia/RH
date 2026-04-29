// Modulo: Auditoria (audit_logs)

MODULES.audit = {
    items: [],

    async load() {
        const c = document.getElementById('auditModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header"><h2>Logs de Auditoria</h2></div>
                <div class="card-body">
                    <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
                        <select class="form-control" id="auditFilterAction" style="max-width:160px;">
                            <option value="">Todas ações</option>
                            <option>CREATE</option><option>UPDATE</option><option>DELETE</option>
                            <option>LOGIN</option><option>SUBMIT</option><option>DECISION</option>
                            <option>PUBLISH</option><option>CHECK_IN</option><option>CHECK_OUT</option>
                        </select>
                        <select class="form-control" id="auditFilterTable" style="max-width:200px;">
                            <option value="">Todas tabelas</option>
                            <option>users</option><option>employees</option><option>job_requisitions</option>
                            <option>recruitment</option><option>mobility_requests</option><option>terminations</option>
                            <option>attendance</option><option>leave_requests</option><option>payroll</option>
                        </select>
                        <select class="form-control" id="auditLimit" style="max-width:120px;">
                            <option value="50">50</option><option value="100" selected>100</option>
                            <option value="200">200</option><option value="500">500</option>
                        </select>
                    </div>
                    <div id="auditList"></div>
                </div>
            </div>
        `;

        document.getElementById('auditFilterAction').addEventListener('change', () => this.loadData());
        document.getElementById('auditFilterTable').addEventListener('change', () => this.loadData());
        document.getElementById('auditLimit').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const params = {
                limit: document.getElementById('auditLimit').value,
                action: document.getElementById('auditFilterAction').value,
                table_name: document.getElementById('auditFilterTable').value
            };
            Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
            this.items = await API.audit.getAll(params);
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    render() {
        const c = document.getElementById('auditList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-history"></i><p>Sem logs.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const actionColor = {
            CREATE: '#10b981', UPDATE: '#0ea5e9', DELETE: '#dc2626',
            LOGIN: '#8b5cf6', SUBMIT: '#f59e0b', DECISION: '#6366f1',
            PUBLISH: '#10b981', CHECK_IN: '#10b981', CHECK_OUT: '#f59e0b'
        };

        const rows = this.items.map(l => {
            const color = actionColor[l.action] || '#64748b';
            return `
                <tr>
                    <td style="white-space:nowrap; color:var(--ink-500); font-size:13px;">${new Date(l.timestamp).toLocaleString('pt-PT')}</td>
                    <td><strong>${escape(l.username || '?')}</strong></td>
                    <td><span class="badge" style="background:${color}20; color:${color};">${l.action}</span></td>
                    <td><code style="font-size:12px; color:var(--ink-700);">${escape(l.table_name)}</code></td>
                    <td>${l.record_id || '-'}</td>
                    <td style="font-size:13px; color:var(--ink-700);">${escape(l.details || '')}</td>
                </tr>
            `;
        }).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>Data/Hora</th><th>Utilizador</th><th>Ação</th><th>Tabela</th><th>ID</th><th>Detalhes</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }
};
