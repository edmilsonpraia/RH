// Módulo de Gestão de Utilizadores

MODULES.users = {
    async load() {
        const container = document.getElementById('usersModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Gestão de Utilizadores</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.users.showCreateForm()">
                        ➕ Criar Utilizador
                    </button>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <strong>ℹ️ Como funciona:</strong> Primeiro crie o colaborador, depois crie o utilizador vinculado a ele.
                        <br>Utilizadores do tipo "user" têm acesso ao portal de auto-serviço.
                    </div>
                    <div id="usersGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const data = await API.users.getAll();
            UI.hideLoading();

            const columns = [
                { key: 'username', label: 'Username' },
                { key: 'employee_name', label: 'Colaborador', render: (row) => row.employee_name || '-' },
                { key: 'position', label: 'Cargo', render: (row) => row.position || '-' },
                {
                    key: 'role',
                    label: 'Tipo',
                    render: (row) => `<span class="badge badge-${row.role === 'admin' ? 'warning' : 'info'}">${row.role === 'admin' ? 'Admin' : 'Usuário'}</span>`
                },
                { key: 'created_at', label: 'Criado em', render: (row) => UI.formatDate(row.created_at) }
            ];

            const actions = `
                <button class="btn btn-primary btn-sm" onclick="MODULES.users.showCreateForm()">
                    ➕ Criar Utilizador
                </button>
            `;

            UI.renderDataGrid(data, columns, 'usersGrid', { actions });
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar utilizadores', 'error');
        }
    },

    async showCreateForm() {
        try {
            // Carregar colaboradores sem utilizador
            const employees = await API.employees.getAll();
            const users = await API.users.getAll();

            const employeesWithUsers = users.map(u => u.employee_id).filter(Boolean);
            const availableEmployees = employees.employees?.filter(e => !employeesWithUsers.includes(e.id)) || [];

            if (availableEmployees.length === 0) {
                UI.showToast('Todos os colaboradores já têm utilizador. Crie um novo colaborador primeiro.', 'warning');
                return;
            }

            const content = `
                <form id="userForm">
                    <div class="alert alert-info">
                        Selecione um colaborador existente para criar o seu acesso ao sistema.
                    </div>
                    <div class="form-group">
                        <label class="form-label">Colaborador *</label>
                        <select class="form-control" id="userEmployee" required>
                            <option value="">Selecione...</option>
                            ${availableEmployees.map(e =>
                                `<option value="${e.id}">${e.name} - ${e.position} (${e.department})</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Username *</label>
                        <input type="text" class="form-control" id="userUsername" placeholder="Ex: joao.silva" required>
                        <small style="color: #666;">Recomendado: usar nome.sobrenome</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password Inicial *</label>
                        <input type="password" class="form-control" id="userPassword" required>
                        <small style="color: #666;">O utilizador poderá alterar depois do primeiro login</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirmar Password *</label>
                        <input type="password" class="form-control" id="userPasswordConfirm" required>
                    </div>
                </form>
            `;

            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.users.submitCreate()">Criar Utilizador</button>
            `;

            UI.createModal('Criar Novo Utilizador', content, footer);
        } catch (error) {
            UI.showToast('Erro ao carregar formulário', 'error');
        }
    },

    async submitCreate() {
        const employeeId = parseInt(document.getElementById('userEmployee').value);
        const username = document.getElementById('userUsername').value.trim();
        const password = document.getElementById('userPassword').value;
        const passwordConfirm = document.getElementById('userPasswordConfirm').value;

        if (!employeeId || !username || !password) {
            UI.showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            UI.showToast('As passwords não coincidem', 'error');
            return;
        }

        if (password.length < 6) {
            UI.showToast('Password deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        try {
            UI.showLoading();
            const result = await API.users.createUser({ employeeId, username, password });
            UI.hideLoading();
            UI.closeModal();

            UI.showToast(`Utilizador "${result.username}" criado com sucesso para ${result.employee}`, 'success');

            // Mostrar modal com as credenciais
            setTimeout(() => {
                this.showCredentials(result.username, password);
            }, 500);

            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    showCredentials(username, password) {
        const content = `
            <div class="alert alert-success">
                <strong>✓ Utilizador criado com sucesso!</strong>
            </div>
            <p><strong>Envie estas credenciais ao colaborador:</strong></p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 4px; border-left: 4px solid var(--primary-orange);">
                <p><strong>URL do Sistema:</strong></p>
                <p><code>http://localhost:3000</code></p>
                <br>
                <p><strong>Username:</strong></p>
                <p><code style="font-size: 16px; color: var(--primary-orange);">${username}</code></p>
                <br>
                <p><strong>Password:</strong></p>
                <p><code style="font-size: 16px; color: var(--primary-orange);">${password}</code></p>
            </div>
            <br>
            <p style="color: #666; font-size: 14px;">
                ⚠️ <strong>Importante:</strong> Guarde estas informações. O utilizador deve alterar a password no primeiro login.
            </p>
        `;

        const footer = `
            <button class="btn btn-primary" onclick="UI.closeModal()">Entendi</button>
        `;

        UI.createModal('Credenciais do Novo Utilizador', content, footer);
    }
};
