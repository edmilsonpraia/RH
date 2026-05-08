// Módulo de Gestão de Utilizadores

MODULES.users = {
    items: [],
    currentUserId: null,

    async load() {
        const me = AUTH.getUser();
        this.currentUserId = me ? me.id : null;
        const container = document.getElementById('usersModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Gestão de Utilizadores</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.users.showCreateForm()">
                        <i class="codicon codicon-add"></i> Criar Utilizador (vincular a colaborador)
                    </button>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <i class="codicon codicon-info"></i>
                        <span>
                            <strong>Auto-registo:</strong> qualquer pessoa pode criar conta em <code>/signup.html</code>.
                            Aqui podes <strong>promover utilizadores a Admin</strong> ou despromover.
                        </span>
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
            this.items = await API.users.getAll();
            UI.hideLoading();
            this.render();
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar utilizadores', 'error');
        }
    },

    render() {
        const container = document.getElementById('usersGrid');
        if (!this.items.length) {
            container.innerHTML = `<div class="grid-empty"><i class="codicon codicon-account"></i><p>Sem utilizadores.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        const rows = this.items.map(u => {
            const isMe = u.id === this.currentUserId;
            const isAdmin = u.role === 'admin';
            const roleBadge = isAdmin
                ? `<span class="badge" style="background:#fef3c7; color:#92400e;"><i class="codicon codicon-shield"></i> Admin</span>`
                : `<span class="badge" style="background:#dbeafe; color:#1e40af;"><i class="codicon codicon-account"></i> Utilizador</span>`;

            const promoteBtn = isAdmin
                ? `<button class="btn-icon" style="color:#64748b;" onclick="MODULES.users.changeRole(${u.id}, 'user', '${escape(u.username).replace(/'/g, "&#39;")}')" title="Despromover a utilizador" ${isMe ? 'disabled' : ''}><i class="codicon codicon-arrow-down"></i></button>`
                : `<button class="btn-icon" style="color:#f59e0b;" onclick="MODULES.users.changeRole(${u.id}, 'admin', '${escape(u.username).replace(/'/g, "&#39;")}')" title="Promover a admin"><i class="codicon codicon-shield"></i></button>`;

            const deleteBtn = isMe
                ? ''
                : `<button class="btn-icon delete" onclick="MODULES.users.confirmDelete(${u.id}, '${escape(u.username).replace(/'/g, "&#39;")}')" title="Eliminar utilizador"><i class="codicon codicon-trash"></i></button>`;

            return `
                <tr>
                    <td><strong>${escape(u.username)}</strong>${isMe ? ' <span style="font-size:11px; color:var(--ink-500);">(tu)</span>' : ''}</td>
                    <td>${escape(u.employee_name || '-')}</td>
                    <td>${escape(u.position || '-')}</td>
                    <td>${roleBadge}</td>
                    <td>${u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                    <td class="actions">
                        ${promoteBtn}
                        ${deleteBtn}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>Username (email)</th><th>Colaborador</th><th>Cargo</th><th>Role</th><th>Criado</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    changeRole(id, newRole, username) {
        const verb = newRole === 'admin' ? 'promover a Admin' : 'despromover a Utilizador';
        UI.confirm(`Tem a certeza que deseja ${verb} "${username}"?`, async () => {
            try {
                UI.showLoading();
                await API.users.changeRole(id, newRole);
                UI.hideLoading();
                UI.showToast(`Role atualizado: ${newRole}`, 'success');
                this.loadData();
            } catch (e) {
                UI.hideLoading();
                UI.showToast(e.message, 'error');
            }
        });
    },

    confirmDelete(id, username) {
        UI.confirm(`Eliminar permanentemente o utilizador "${username}"? O colaborador associado mantém-se.`, async () => {
            try {
                UI.showLoading();
                await API.users.delete(id);
                UI.hideLoading();
                UI.showToast('Utilizador eliminado', 'success');
                this.loadData();
            } catch (e) {
                UI.hideLoading();
                UI.showToast(e.message, 'error');
            }
        });
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
