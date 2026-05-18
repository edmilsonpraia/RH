// Módulo de Gestão de Colaboradores

MODULES.employees = {
    currentData: [],
    currentPagination: {},
    filters: { search: '', site: '', department: '', page: 1, limit: 25 },

    async load() {
        const container = document.getElementById('employeesModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Lista de Colaboradores</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.employees.showCreateForm()">
                        <i class="codicon codicon-add"></i> Novo Colaborador
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px; align-items:end;">
                        <div class="form-group" style="flex:2; min-width:200px; margin:0;">
                            <label class="form-label">Pesquisar</label>
                            <input type="text" class="form-control" id="empSearch" placeholder="Nome, MECA, função, email..." />
                        </div>
                        <div class="form-group" style="flex:1; min-width:140px; margin:0;">
                            <label class="form-label">Site</label>
                            <select class="form-control" id="empSiteFilter">
                                <option value="">Todos</option>
                                <option value="SEDE">SEDE</option>
                                <option value="AHCC">AHCC</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex:1; min-width:160px; margin:0;">
                            <label class="form-label">Departamento</label>
                            <select class="form-control" id="empDeptFilter">
                                <option value="">Todos</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <button class="btn btn-outline btn-sm" onclick="MODULES.employees.clearFilters()">Limpar</button>
                        </div>
                    </div>

                    <div id="employeesSummary" style="margin-bottom:10px; color:#666; font-size:13px;"></div>
                    <div id="employeesGrid"></div>
                    <div id="employeesPagination" style="margin-top:15px; display:flex; justify-content:center; gap:5px;"></div>
                </div>
            </div>
        `;

        // Bind filters
        document.getElementById('empSearch').addEventListener('input', this._debounce(() => {
            this.filters.search = document.getElementById('empSearch').value;
            this.filters.page = 1;
            this.loadData();
        }, 300));
        document.getElementById('empSiteFilter').addEventListener('change', () => {
            this.filters.site = document.getElementById('empSiteFilter').value;
            this.filters.page = 1;
            this.loadData();
        });
        document.getElementById('empDeptFilter').addEventListener('change', () => {
            this.filters.department = document.getElementById('empDeptFilter').value;
            this.filters.page = 1;
            this.loadData();
        });

        await this.loadData();
        await this.loadDepartmentsFilter();
    },

    _debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    },

    async loadDepartmentsFilter() {
        try {
            // Pedir lista grande para extrair todos os departamentos distintos
            const response = await API.employees.getAll({ limit: 500 });
            const depts = [...new Set((response.employees || []).map(e => e.department).filter(Boolean))].sort();
            const sel = document.getElementById('empDeptFilter');
            const current = sel.value;
            depts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                sel.appendChild(opt);
            });
            sel.value = current;
        } catch (e) { /* ignore */ }
    },

    clearFilters() {
        this.filters = { search: '', site: '', department: '', page: 1, limit: 25 };
        document.getElementById('empSearch').value = '';
        document.getElementById('empSiteFilter').value = '';
        document.getElementById('empDeptFilter').value = '';
        this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const params = { ...this.filters };
            // Limpar parametros vazios
            Object.keys(params).forEach(k => { if (params[k] === '' || params[k] == null) delete params[k]; });
            const response = await API.employees.getAll(params);
            this.currentData = response.employees || [];
            this.currentPagination = response.pagination || {};
            UI.hideLoading();
            this.renderGrid();
            this.renderSummary();
            this.renderPagination();
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar colaboradores', 'error');
        }
    },

    renderSummary() {
        const p = this.currentPagination;
        const total = p.total || 0;
        const from = total === 0 ? 0 : (p.page - 1) * p.limit + 1;
        const to = Math.min(p.page * p.limit, total);
        document.getElementById('employeesSummary').textContent =
            `A mostrar ${from}–${to} de ${total} colaboradores`;
    },

    renderPagination() {
        const p = this.currentPagination;
        const container = document.getElementById('employeesPagination');
        if (!p.pages || p.pages <= 1) { container.innerHTML = ''; return; }

        const buttons = [];
        const make = (label, page, disabled = false, active = false) => {
            const cls = active ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
            const dis = disabled ? 'disabled' : '';
            return `<button class="${cls}" ${dis} onclick="MODULES.employees.goToPage(${page})">${label}</button>`;
        };

        buttons.push(make('«', p.page - 1, p.page <= 1));
        const start = Math.max(1, p.page - 2);
        const end = Math.min(p.pages, p.page + 2);
        if (start > 1) buttons.push(make('1', 1, false, p.page === 1));
        if (start > 2) buttons.push('<span style="padding:0 8px;">…</span>');
        for (let i = start; i <= end; i++) buttons.push(make(i, i, false, i === p.page));
        if (end < p.pages - 1) buttons.push('<span style="padding:0 8px;">…</span>');
        if (end < p.pages) buttons.push(make(p.pages, p.pages, false, p.page === p.pages));
        buttons.push(make('»', p.page + 1, p.page >= p.pages));

        container.innerHTML = buttons.join('');
    },

    goToPage(page) {
        this.filters.page = page;
        this.loadData();
    },

    STATUS_LABELS: {
        active:    { label: 'Activo',   color: '#10b981', bg: '#ecfdf5' },
        inactive:  { label: 'Inactivo', color: '#dc2626', bg: '#fef2f2' },
        suspended: { label: 'Suspenso', color: '#f59e0b', bg: '#fffbeb' }
    },

    renderGrid() {
        const escape = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        const renderContractBadge = (row) => {
            if (!row.contract_type) return '-';
            const colors = {
                'Indeterminado': '#0d6efd',
                'Determinado': '#fd7e14',
                'Prestação de Serviço': '#6c757d',
                'Estágio': '#20c997'
            };
            const c = colors[row.contract_type] || '#999';
            return `<span style="background:${c}20; color:${c}; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:600;">${escape(row.contract_type)}</span>`;
        };

        const renderDocStatus = (row) => {
            if (!row.document_status) return '-';
            const s = row.document_status;
            let color = '#6c757d';
            if (/dentro/i.test(s)) color = '#28a745';
            else if (/expirad|caducad/i.test(s)) color = '#dc3545';
            else if (/falt/i.test(s)) color = '#fd7e14';
            return `<span style="color:${color}; font-size:12px;">${escape(s)}</span>`;
        };

        const photoAvatar = (row) => {
            if (row.has_photo) {
                return `<div class="emp-avatar" data-id="${row.id}" style="width:36px;height:36px;border-radius:50%;background:var(--ink-200);overflow:hidden;display:inline-flex;align-items:center;justify-content:center;"><i class="codicon codicon-account" style="color:var(--ink-400);"></i></div>`;
            }
            const initial = (row.name || '?').charAt(0).toUpperCase();
            return `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, var(--brand-400), var(--brand-700));color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;">${initial}</div>`;
        };

        const statusDropdown = (row) => {
            const opts = Object.entries(this.STATUS_LABELS).map(([k, v]) =>
                `<option value="${k}" ${k === row.status ? 'selected' : ''}>${v.label}</option>`).join('');
            return `<select onchange="event.stopPropagation(); MODULES.employees.quickStatus(${row.id}, this.value)" onclick="event.stopPropagation();" style="padding:4px 8px; border:1px solid var(--ink-300); border-radius:4px; font-size:12px; background:#fff; cursor:pointer;">${opts}</select>`;
        };

        const rows = this.currentData.map(r => `
            <tr style="cursor:pointer;" onclick="MODULES.employees.showDetails(${r.id})">
                <td style="width:50px;">${photoAvatar(r)}</td>
                <td>${r.meca ? `<strong>${escape(r.meca)}</strong>` : '-'}</td>
                <td><strong>${escape(r.name)}</strong></td>
                <td>${escape(r.position || '-')}</td>
                <td>${escape(r.department || '-')}</td>
                <td>${escape(r.site || '-')}</td>
                <td>${renderContractBadge(r)}</td>
                <td>${renderDocStatus(r)}</td>
                <td>${escape(r.phone || '-')}</td>
                <td onclick="event.stopPropagation();">${statusDropdown(r)}</td>
                <td class="actions" onclick="event.stopPropagation();">
                    <button class="btn-icon edit" onclick="MODULES.employees.showEditForm(${r.id})" title="Editar"><i class="codicon codicon-edit"></i></button>
                    <button class="btn-icon delete" onclick="MODULES.employees.confirmDelete(${r.id}, '${escape(r.name).replace(/'/g, '&#39;')}')" title="Eliminar"><i class="codicon codicon-trash"></i></button>
                </td>
            </tr>
        `).join('');

        const container = document.getElementById('employeesGrid');
        container.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Foto</th><th>MECA</th><th>Nome</th><th>Função</th><th>Departamento</th>
                            <th>Site</th><th>Contrato</th><th>Doc.</th><th>Contacto</th><th>Estado</th><th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--ink-500);">Sem colaboradores.</td></tr>'}</tbody>
                </table>
            </div>
        `;

        // Carregar fotos async
        this.currentData.filter(r => r.has_photo).forEach(r => {
            API.employees.loadPhotoUrl(r.id).then(url => {
                if (!url) return;
                const el = container.querySelector(`.emp-avatar[data-id="${r.id}"]`);
                if (el) el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            });
        });
    },

    async quickStatus(id, newStatus) {
        try {
            await API.employees.changeStatus(id, newStatus);
            const item = this.currentData.find(e => e.id === id);
            if (item) item.status = newStatus;
            UI.showToast(`Estado: ${this.STATUS_LABELS[newStatus]?.label || newStatus}`, 'success');
        } catch (e) {
            UI.showToast(e.message || 'Erro ao mudar estado', 'error');
            this.loadData();
        }
    },

    async showDetails(id) {
        try {
            const e = await API.employees.getById(id);
            const escape = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const fmt = (v) => v ? v : '-';
            const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '-';
            const sLabel = this.STATUS_LABELS[e.status] || { label: e.status, color: '#666', bg: '#eee' };
            const hasPhoto = !!e.has_photo;

            const photoBlock = hasPhoto
                ? `<div id="empDetailsPhoto" data-id="${e.id}" style="width:120px;height:120px;border-radius:50%;background:var(--ink-200);overflow:hidden;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="codicon codicon-loading codicon-modifier-spin"></i></div>`
                : `<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg, var(--brand-400), var(--brand-700));color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:48px;font-weight:600;flex-shrink:0;">${escape((e.name || '?').charAt(0).toUpperCase())}</div>`;

            const content = `
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:18px; padding:14px; background:var(--ink-50); border-radius:8px;">
                    ${photoBlock}
                    <div style="flex:1;">
                        <h2 style="margin:0; font-size:20px;">${escape(e.name)}</h2>
                        <div style="color:var(--ink-600); margin-top:4px;">${escape(fmt(e.position))} · ${escape(fmt(e.department))}</div>
                        <div style="margin-top:8px;">
                            <span class="badge" style="background:${sLabel.bg}; color:${sLabel.color};">${sLabel.label}</span>
                            ${e.meca ? `<span style="margin-left:10px; color:var(--ink-500); font-size:13px;">MECA <strong>${escape(e.meca)}</strong></span>` : ''}
                        </div>
                    </div>
                </div>

                <h4 style="font-size:13px; color:var(--ink-500); margin:14px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Dados Pessoais</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size:14px;">
                    <div><strong>Email:</strong> ${escape(fmt(e.email))}</div>
                    <div><strong>Contacto:</strong> ${escape(fmt(e.phone))}</div>
                    <div><strong>Nacionalidade:</strong> ${escape(fmt(e.nationality))}</div>
                    <div><strong>Género:</strong> ${escape(fmt(e.gender))}</div>
                    <div><strong>Data nascimento:</strong> ${fmtDate(e.birth_date)}</div>
                    <div><strong>Filhos:</strong> ${fmt(e.children)}</div>
                </div>

                <h4 style="font-size:13px; color:var(--ink-500); margin:16px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Documento</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size:14px;">
                    <div><strong>Tipo:</strong> ${escape(fmt(e.document_type))}</div>
                    <div><strong>Número:</strong> ${escape(fmt(e.document_number))}</div>
                    <div><strong>Caducidade:</strong> ${fmtDate(e.document_expiry)}</div>
                    <div><strong>Estado:</strong> ${escape(fmt(e.document_status))}</div>
                </div>

                <h4 style="font-size:13px; color:var(--ink-500); margin:16px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Função e Local</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size:14px;">
                    <div><strong>Função:</strong> ${escape(fmt(e.position))}</div>
                    <div><strong>Departamento:</strong> ${escape(fmt(e.department))}</div>
                    <div><strong>Site:</strong> ${escape(fmt(e.site))}</div>
                    <div><strong>Empresa:</strong> ${escape(fmt(e.company))}</div>
                    <div><strong>Tipo actividade:</strong> ${escape(fmt(e.activity_type))}</div>
                    <div><strong>Grau académico:</strong> ${escape(fmt(e.academic_degree))}</div>
                </div>

                <h4 style="font-size:13px; color:var(--ink-500); margin:16px 0 8px; text-transform:uppercase; letter-spacing:0.5px;">Contrato</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size:14px;">
                    <div><strong>Tipo:</strong> ${escape(fmt(e.contract_type))}</div>
                    <div><strong>Duração (dias):</strong> ${fmt(e.contract_duration_days)}</div>
                    <div><strong>Admissão:</strong> ${fmtDate(e.hire_date)}</div>
                    <div><strong>Antiguidade:</strong> ${escape(fmt(e.seniority))}</div>
                    <div><strong>Última renovação:</strong> ${fmtDate(e.last_renewal_date)}</div>
                    <div><strong>Próxima renovação:</strong> ${fmtDate(e.next_renewal_date)}</div>
                    <div><strong>Estado contrato:</strong> ${escape(fmt(e.contract_status))}</div>
                    <div><strong>Salário:</strong> ${UI.formatCurrency(e.salary || 0)}</div>
                </div>
            `;
            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>
                <button class="btn btn-primary btn-sm" onclick="MODULES.employees.showEditForm(${e.id})"><i class="codicon codicon-edit"></i> Editar</button>
            `;
            UI.createModal(`Detalhes do Colaborador`, content, footer);

            // Carregar foto no slot
            if (hasPhoto) {
                const url = await API.employees.loadPhotoUrl(e.id);
                const el = document.getElementById('empDetailsPhoto');
                if (el && url) el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            }
        } catch (err) {
            UI.showToast('Erro ao carregar detalhes', 'error');
        }
    },

    showCreateForm() {
        const content = this.getFormHTML();
        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.employees.submitCreate()">Criar</button>
        `;
        UI.createModal('Novo Colaborador', content, footer);
    },

    async showEditForm(id) {
        try {
            const employee = await API.employees.getById(id);
            const content = this.getFormHTML(employee);
            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.employees.submitEdit(${id})">Atualizar</button>
            `;
            UI.createModal('Editar Colaborador', content, footer);

            // Carregar foto existente no preview
            if (employee.has_photo) {
                const url = await API.employees.loadPhotoUrl(id);
                const el = document.getElementById('empPhotoPreview');
                if (el && url) el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            }
        } catch (error) {
            UI.showToast('Erro ao carregar colaborador', 'error');
        }
    },

    _previewPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            UI.showToast('Foto excede 3MB', 'error');
            event.target.value = '';
            return;
        }
        const url = URL.createObjectURL(file);
        const el = document.getElementById('empPhotoPreview');
        if (el) el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
    },

    getFormHTML(data = {}) {
        const sel = (val, current) => val === current ? 'selected' : '';
        const departments = [...new Set(this.currentData.map(e => e.department).filter(Boolean))].sort();
        const deptOptions = ['Administrativo','Engenharia','HST','Transportes','Topografia','Civil','Capital Humano','QHSE','Lisandra Eventos','Departamento Técnico','Geologia','Informática','Comercial','Conselho de Administração','Comunicação e Marketing','Contabilidade e Finanças','Gabinete Jurídico','Departamento Médico', ...departments];
        const uniqueDepts = [...new Set(deptOptions)].sort();

        const photoPreview = data.id && data.has_photo
            ? `<div id="empPhotoPreview" data-id="${data.id}" style="width:80px;height:80px;border-radius:50%;background:var(--ink-200);overflow:hidden;display:inline-flex;align-items:center;justify-content:center;"><i class="codicon codicon-loading codicon-modifier-spin"></i></div>`
            : `<div id="empPhotoPreview" style="width:80px;height:80px;border-radius:50%;background:var(--ink-100);display:inline-flex;align-items:center;justify-content:center;color:var(--ink-400);"><i class="codicon codicon-account" style="font-size:32px;"></i></div>`;

        return `
            <form id="employeeForm">
                <div style="display:flex; align-items:center; gap:14px; padding:14px; background:var(--ink-50); border-radius:8px; margin-bottom:14px;">
                    ${photoPreview}
                    <div style="flex:1;">
                        <label class="form-label" style="margin-bottom:6px;">Fotografia <span style="font-size:11px; color:var(--ink-500);">— JPG/PNG, máx 3MB</span></label>
                        <input type="file" class="form-control" id="empPhotoFile" accept="image/*" onchange="MODULES.employees._previewPhoto(event)">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">MECA</label>
                        <input type="text" class="form-control" id="empMeca" value="${data.meca || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-control" id="empName" value="${data.name || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" id="empEmail" value="${data.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input type="tel" class="form-control" id="empPhone" value="${data.phone || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Função *</label>
                        <input type="text" class="form-control" id="empPosition" value="${data.position || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Departamento *</label>
                        <select class="form-control" id="empDepartment" required>
                            <option value="">Selecione...</option>
                            ${uniqueDepts.map(d => `<option ${sel(d, data.department)}>${d}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Site</label>
                        <select class="form-control" id="empSite">
                            <option value="">-</option>
                            <option ${sel('SEDE', data.site)}>SEDE</option>
                            <option ${sel('AHCC', data.site)}>AHCC</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Empresa</label>
                        <input type="text" class="form-control" id="empCompany" value="${data.company || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo de Contrato</label>
                        <select class="form-control" id="empContractType">
                            <option value="">-</option>
                            <option ${sel('Determinado', data.contract_type)}>Determinado</option>
                            <option ${sel('Indeterminado', data.contract_type)}>Indeterminado</option>
                            <option ${sel('Prestação de Serviço', data.contract_type)}>Prestação de Serviço</option>
                            <option ${sel('Estágio', data.contract_type)}>Estágio</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Admissão *</label>
                        <input type="date" class="form-control" id="empHireDate" value="${data.hire_date || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo Documento</label>
                        <input type="text" class="form-control" id="empDocType" value="${data.document_type || 'Bilhete de Identidade'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nº Documento</label>
                        <input type="text" class="form-control" id="empDocNumber" value="${data.document_number || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Caducidade Doc.</label>
                        <input type="date" class="form-control" id="empDocExpiry" value="${data.document_expiry || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data Nascimento</label>
                        <input type="date" class="form-control" id="empBirthDate" value="${data.birth_date || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Género</label>
                        <select class="form-control" id="empGender">
                            <option value="">-</option>
                            <option ${sel('Masculino', data.gender)}>Masculino</option>
                            <option ${sel('Feminino', data.gender)}>Feminino</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nacionalidade</label>
                        <input type="text" class="form-control" id="empNationality" value="${data.nationality || 'Angolana'}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Grau Académico</label>
                        <select class="form-control" id="empDegree">
                            <option value="">-</option>
                            <option ${sel('Base', data.academic_degree)}>Base</option>
                            <option ${sel('Técnico Médio', data.academic_degree)}>Técnico Médio</option>
                            <option ${sel('Licenciatura', data.academic_degree)}>Licenciatura</option>
                            <option ${sel('Pós-Graduação', data.academic_degree)}>Pós-Graduação</option>
                            <option ${sel('Mestrado', data.academic_degree)}>Mestrado</option>
                            <option ${sel('Doutoramento', data.academic_degree)}>Doutoramento</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Filhos</label>
                        <input type="number" min="0" class="form-control" id="empChildren" value="${data.children || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Salário (Kz)</label>
                        <input type="number" class="form-control" id="empSalary" value="${data.salary || 0}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" id="empStatus">
                            <option value="active" ${sel('active', data.status)}>Activo</option>
                            <option value="inactive" ${sel('inactive', data.status)}>Inactivo</option>
                            <option value="suspended" ${sel('suspended', data.status)}>Suspenso</option>
                        </select>
                    </div>
                </div>
            </form>
        `;
    },

    async submitCreate() {
        const formData = await this.getFormData();
        if (!formData) return;

        try {
            UI.showLoading();
            await API.employees.create(formData);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Colaborador criado com sucesso', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    async submitEdit(id) {
        const formData = await this.getFormData();
        if (!formData) return;

        try {
            UI.showLoading();
            await API.employees.update(id, formData);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Colaborador atualizado com sucesso', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    async getFormData() {
        const v = (id) => document.getElementById(id)?.value || '';
        const data = {
            meca: v('empMeca'),
            name: v('empName'),
            email: v('empEmail'),
            phone: v('empPhone'),
            position: v('empPosition'),
            department: v('empDepartment'),
            site: v('empSite'),
            company: v('empCompany'),
            contract_type: v('empContractType'),
            hireDate: v('empHireDate'),
            document_type: v('empDocType'),
            document_number: v('empDocNumber'),
            document_expiry: v('empDocExpiry'),
            birth_date: v('empBirthDate'),
            gender: v('empGender'),
            nationality: v('empNationality'),
            academic_degree: v('empDegree'),
            children: parseInt(v('empChildren')) || 0,
            salary: parseFloat(v('empSalary')) || 0,
            status: v('empStatus') || 'active'
        };

        if (!data.name || !data.email || !data.position || !data.department || !data.hireDate) {
            UI.showToast('Por favor, preencha os campos obrigatórios (Nome, Email, Função, Departamento, Admissão)', 'error');
            return null;
        }

        // Processar foto
        const photoInput = document.getElementById('empPhotoFile');
        if (photoInput?.files?.[0]) {
            const f = photoInput.files[0];
            const obj = await API.fileToObject(f);
            data.photo_data = obj.data;
            data.photo_mime_type = obj.mime;
        }

        return data;
    },

    confirmDelete(id, name) {
        UI.confirm(
            `Tem a certeza que deseja eliminar o colaborador "${name}"?`,
            async () => {
                try {
                    UI.showLoading();
                    await API.employees.delete(id);
                    UI.hideLoading();
                    UI.showToast('Colaborador eliminado com sucesso', 'success');
                    this.loadData();
                } catch (error) {
                    UI.hideLoading();
                    UI.showToast(error.message, 'error');
                }
            }
        );
    }
};
