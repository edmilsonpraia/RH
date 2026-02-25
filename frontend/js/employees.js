// Módulo de Gestão de Colaboradores

MODULES.employees = {
    currentData: [],

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
                    <div id="employeesGrid"></div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    async loadData(searchTerm = '') {
        try {
            UI.showLoading();
            const response = await API.employees.getAll({ search: searchTerm });
            this.currentData = response.employees || [];
            UI.hideLoading();
            this.renderGrid();
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar colaboradores', 'error');
        }
    },

    renderGrid() {
        const columns = [
            { key: 'name', label: 'Nome', sortable: true },
            { key: 'email', label: 'Email' },
            { key: 'position', label: 'Cargo' },
            { key: 'department', label: 'Departamento' },
            {
                key: 'salary',
                label: 'Salário',
                className: 'currency',
                render: (row) => UI.formatCurrency(row.salary)
            },
            {
                key: 'status',
                label: 'Estado',
                render: (row) => UI.statusBadge(row.status)
            },
            {
                key: 'actions',
                label: 'Ações',
                className: 'actions',
                render: (row) => `
                    <button class="btn-icon edit" onclick="MODULES.employees.showEditForm(${row.id})" title="Editar">✏️</button>
                    <button class="btn-icon delete" onclick="MODULES.employees.confirmDelete(${row.id}, '${row.name}')" title="Eliminar">🗑️</button>
                `
            }
        ];

        const actions = `
            <button class="btn btn-primary btn-sm" onclick="MODULES.employees.showCreateForm()">
                ➕ Novo Colaborador
            </button>
        `;

        UI.renderDataGrid(this.currentData, columns, 'employeesGrid', {
            actions,
            onSearch: (term) => this.loadData(term)
        });
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
        return `
            <form id="employeeForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-control" id="empName" value="${data.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" id="empEmail" value="${data.email || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input type="tel" class="form-control" id="empPhone" value="${data.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Admissão *</label>
                        <input type="date" class="form-control" id="empHireDate" value="${data.hire_date || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Cargo *</label>
                        <input type="text" class="form-control" id="empPosition" value="${data.position || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Departamento *</label>
                        <select class="form-control" id="empDepartment" required>
                            <option value="">Selecione...</option>
                            <option ${data.department === 'Administração' ? 'selected' : ''}>Administração</option>
                            <option ${data.department === 'Financeiro' ? 'selected' : ''}>Financeiro</option>
                            <option ${data.department === 'RH' ? 'selected' : ''}>RH</option>
                            <option ${data.department === 'TI' ? 'selected' : ''}>TI</option>
                            <option ${data.department === 'Operações' ? 'selected' : ''}>Operações</option>
                            <option ${data.department === 'Comercial' ? 'selected' : ''}>Comercial</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Salário *</label>
                        <input type="number" class="form-control" id="empSalary" value="${data.salary || ''}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" id="empStatus">
                            <option value="active" ${data.status === 'active' ? 'selected' : ''}>Activo</option>
                            <option value="inactive" ${data.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                            <option value="suspended" ${data.status === 'suspended' ? 'selected' : ''}>Suspenso</option>
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
        const name = document.getElementById('empName').value;
        const email = document.getElementById('empEmail').value;
        const phone = document.getElementById('empPhone').value;
        const position = document.getElementById('empPosition').value;
        const department = document.getElementById('empDepartment').value;
        const salary = parseFloat(document.getElementById('empSalary').value);
        const hireDate = document.getElementById('empHireDate').value;
        const status = document.getElementById('empStatus').value;

        if (!name || !email || !position || !department || !salary || !hireDate) {
            UI.showToast('Por favor, preencha todos os campos obrigatórios', 'error');
            return null;
        }

        return { name, email, phone, position, department, salary, hireDate, status };
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
