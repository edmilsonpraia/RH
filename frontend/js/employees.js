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
                        ➕ Novo Colaborador
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

        const columns = [
            { key: 'meca', label: 'MECA', render: (row) => row.meca ? `<strong>${escape(row.meca)}</strong>` : '-' },
            { key: 'name', label: 'Nome', sortable: true },
            { key: 'position', label: 'Função' },
            { key: 'department', label: 'Departamento' },
            { key: 'site', label: 'Site', render: (row) => row.site || '-' },
            { key: 'contract_type', label: 'Contrato', render: renderContractBadge },
            { key: 'document_status', label: 'Doc.', render: renderDocStatus },
            { key: 'phone', label: 'Contacto', render: (row) => row.phone || '-' },
            {
                key: 'actions',
                label: 'Ações',
                className: 'actions',
                render: (row) => `
                    <button class="btn-icon view" onclick="MODULES.employees.showDetails(${row.id})" title="Ver">👁️</button>
                    <button class="btn-icon edit" onclick="MODULES.employees.showEditForm(${row.id})" title="Editar">✏️</button>
                    <button class="btn-icon delete" onclick="MODULES.employees.confirmDelete(${row.id}, '${escape(row.name).replace(/'/g, '&#39;')}')" title="Eliminar">🗑️</button>
                `
            }
        ];

        UI.renderDataGrid(this.currentData, columns, 'employeesGrid', {});
    },

    async showDetails(id) {
        try {
            const e = await API.employees.getById(id);
            const fmt = (v) => v ? v : '-';
            const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '-';
            const content = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; font-size:14px;">
                    <div><strong>MECA:</strong> ${fmt(e.meca)}</div>
                    <div><strong>Nome:</strong> ${fmt(e.name)}</div>
                    <div><strong>Email:</strong> ${fmt(e.email)}</div>
                    <div><strong>Contacto:</strong> ${fmt(e.phone)}</div>
                    <div><strong>Nacionalidade:</strong> ${fmt(e.nationality)}</div>
                    <div><strong>Género:</strong> ${fmt(e.gender)}</div>
                    <div><strong>Data nascimento:</strong> ${fmtDate(e.birth_date)}</div>
                    <div><strong>Filhos:</strong> ${fmt(e.children)}</div>
                    <div style="grid-column: span 2;"><hr></div>
                    <div><strong>Tipo doc:</strong> ${fmt(e.document_type)}</div>
                    <div><strong>Nº doc:</strong> ${fmt(e.document_number)}</div>
                    <div><strong>Caducidade:</strong> ${fmtDate(e.document_expiry)}</div>
                    <div><strong>Estado doc:</strong> ${fmt(e.document_status)}</div>
                    <div style="grid-column: span 2;"><hr></div>
                    <div><strong>Departamento:</strong> ${fmt(e.department)}</div>
                    <div><strong>Função:</strong> ${fmt(e.position)}</div>
                    <div><strong>Site:</strong> ${fmt(e.site)}</div>
                    <div><strong>Empresa:</strong> ${fmt(e.company)}</div>
                    <div><strong>Tipo actividade:</strong> ${fmt(e.activity_type)}</div>
                    <div><strong>Grau académico:</strong> ${fmt(e.academic_degree)}</div>
                    <div style="grid-column: span 2;"><hr></div>
                    <div><strong>Tipo contrato:</strong> ${fmt(e.contract_type)}</div>
                    <div><strong>Duração (dias):</strong> ${fmt(e.contract_duration_days)}</div>
                    <div><strong>Antiguidade:</strong> ${fmt(e.seniority)}</div>
                    <div><strong>Estado contrato:</strong> ${fmt(e.contract_status)}</div>
                    <div><strong>Admissão:</strong> ${fmtDate(e.hire_date)}</div>
                    <div><strong>Última renovação:</strong> ${fmtDate(e.last_renewal_date)}</div>
                    <div><strong>Próxima renovação:</strong> ${fmtDate(e.next_renewal_date)}</div>
                    <div><strong>Salário:</strong> ${UI.formatCurrency(e.salary || 0)}</div>
                </div>
            `;
            const footer = `<button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>`;
            UI.createModal(`${e.name} - Detalhes`, content, footer);
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
        } catch (error) {
            UI.showToast('Erro ao carregar colaborador', 'error');
        }
    },

    getFormHTML(data = {}) {
        const sel = (val, current) => val === current ? 'selected' : '';
        const departments = [...new Set(this.currentData.map(e => e.department).filter(Boolean))].sort();
        const deptOptions = ['Administrativo','Engenharia','HST','Transportes','Topografia','Civil','Capital Humano','QHSE','Lisandra Eventos','Departamento Técnico','Geologia','Informática','Comercial','Conselho de Administração','Comunicação e Marketing','Contabilidade e Finanças','Gabinete Jurídico','Departamento Médico', ...departments];
        const uniqueDepts = [...new Set(deptOptions)].sort();

        return `
            <form id="employeeForm">
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
        const formData = this.getFormData();
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
        const formData = this.getFormData();
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

    getFormData() {
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
