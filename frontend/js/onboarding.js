// Módulo de Onboarding e Offboarding

MODULES.onboarding = {
    async load() {
        const container = document.getElementById('onboardingModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Onboarding & Offboarding</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-success btn-sm" onclick="MODULES.onboarding.showCreateForm('onboarding')">
                            ➕ Novo Onboarding
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="MODULES.onboarding.showCreateForm('offboarding')">
                            ➖ Novo Offboarding
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="form-row mb-2">
                        <div class="form-group">
                            <label class="form-label">Tipo</label>
                            <select class="form-control" id="obType">
                                <option value="">Todos</option>
                                <option value="onboarding">Onboarding</option>
                                <option value="offboarding">Offboarding</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-control" id="obStatus">
                                <option value="">Todos</option>
                                <option value="pendente">Pendente</option>
                                <option value="em_progresso">Em Progresso</option>
                                <option value="concluido">Concluído</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn btn-primary" onclick="MODULES.onboarding.loadData()">Filtrar</button>
                        </div>
                    </div>
                    <div id="onboardingGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const type = document.getElementById('obType')?.value || '';
            const status = document.getElementById('obStatus')?.value || '';

            const params = {};
            if (type) params.type = type;
            if (status) params.status = status;

            const data = await API.onboarding.getAll(params);
            UI.hideLoading();

            const columns = [
                { key: 'employee_name', label: 'Colaborador' },
                { key: 'position', label: 'Cargo' },
                { key: 'department', label: 'Departamento' },
                {
                    key: 'type',
                    label: 'Tipo',
                    render: (row) => row.type === 'onboarding'
                        ? '<span class="badge badge-success">Onboarding</span>'
                        : '<span class="badge badge-secondary">Offboarding</span>'
                },
                {
                    key: 'status',
                    label: 'Status',
                    render: (row) => UI.statusBadge(row.status)
                },
                {
                    key: 'progress',
                    label: 'Progresso',
                    render: (row) => {
                        const completed = row.checklist.filter(i => i.completed).length;
                        const total = row.checklist.length;
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return `${completed}/${total} (${percent}%)`;
                    }
                },
                { key: 'started_at', label: 'Início', render: (row) => UI.formatDate(row.started_at) },
                {
                    key: 'actions',
                    label: 'Ações',
                    className: 'actions',
                    render: (row) => `
                        <button class="btn-icon view" onclick="MODULES.onboarding.showChecklist(${row.id})" title="Ver Checklist">📋</button>
                        <button class="btn-icon delete" onclick="MODULES.onboarding.confirmDelete(${row.id})" title="Eliminar">🗑️</button>
                    `
                }
            ];

            UI.renderDataGrid(data, columns, 'onboardingGrid');
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar processos', 'error');
        }
    },

    async showCreateForm(type) {
        try {
            const employees = await API.employees.getAll();
            const activeEmployees = employees.employees?.filter(e => e.status === 'active') || [];

            const defaultOnboarding = [
                { task: 'Receber equipamentos (notebook, telemóvel)', completed: false },
                { task: 'Configurar email e acessos', completed: false },
                { task: 'Assinar contrato e documentos', completed: false },
                { task: 'Tour pelas instalações', completed: false },
                { task: 'Reunião com gestor direto', completed: false },
                { task: 'Formação inicial (políticas, processos)', completed: false },
                { task: 'Apresentação à equipa', completed: false }
            ];

            const defaultOffboarding = [
                { task: 'Devolver equipamentos (notebook, telemóvel, cartão)', completed: false },
                { task: 'Transferir conhecimento/documentação', completed: false },
                { task: 'Desativar acessos e email', completed: false },
                { task: 'Entrevista de saída', completed: false },
                { task: 'Processar documentos finais', completed: false },
                { task: 'Acertar pendências financeiras', completed: false }
            ];

            const checklist = type === 'onboarding' ? defaultOnboarding : defaultOffboarding;

            const content = `
                <form id="onboardingForm">
                    <div class="alert alert-${type === 'onboarding' ? 'success' : 'secondary'}">
                        <strong>${type === 'onboarding' ? '🎉' : '👋'} ${type === 'onboarding' ? 'Onboarding' : 'Offboarding'}</strong><br>
                        Crie um processo estruturado de ${type === 'onboarding' ? 'integração' : 'desligamento'} do colaborador.
                    </div>
                    <div class="form-group">
                        <label class="form-label">Colaborador *</label>
                        <select class="form-control" id="obEmployee" required>
                            <option value="">Selecione...</option>
                            ${activeEmployees.map(e => `<option value="${e.id}">${e.name} - ${e.position}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Checklist *</label>
                        <div id="checklistItems" style="background: #f5f5f5; padding: 15px; border-radius: 4px; max-height: 300px; overflow-y: auto;">
                            ${checklist.map((item, idx) => `
                                <div style="margin-bottom: 10px;">
                                    <input type="text" class="form-control" value="${item.task}" data-idx="${idx}">
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn-sm btn-outline mt-1" onclick="MODULES.onboarding.addChecklistItem()">
                            ➕ Adicionar Item
                        </button>
                    </div>
                </form>
            `;

            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-${type === 'onboarding' ? 'success' : 'secondary'}" onclick="MODULES.onboarding.submitCreate('${type}')">
                    Criar Processo
                </button>
            `;

            UI.createModal(`Novo ${type === 'onboarding' ? 'Onboarding' : 'Offboarding'}`, content, footer);
        } catch (error) {
            UI.showToast('Erro ao carregar formulário', 'error');
        }
    },

    addChecklistItem() {
        const container = document.getElementById('checklistItems');
        const idx = container.querySelectorAll('input').length;
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.innerHTML = `<input type="text" class="form-control" placeholder="Nova tarefa..." data-idx="${idx}">`;
        container.appendChild(div);
    },

    async submitCreate(type) {
        const employeeId = parseInt(document.getElementById('obEmployee').value);
        const inputs = document.querySelectorAll('#checklistItems input');

        const checklist = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(task => task.length > 0)
            .map(task => ({ task, completed: false }));

        if (!employeeId) {
            UI.showToast('Selecione um colaborador', 'error');
            return;
        }

        if (checklist.length === 0) {
            UI.showToast('Adicione pelo menos uma tarefa', 'error');
            return;
        }

        try {
            UI.showLoading();
            await API.onboarding.create({ employeeId, type, checklist });
            UI.hideLoading();
            UI.closeModal();
            UI.showToast(`Processo de ${type} criado com sucesso`, 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    async showChecklist(id) {
        try {
            const processes = await API.onboarding.getAll();
            const process = processes.find(p => p.id === id);

            if (!process) {
                UI.showToast('Processo não encontrado', 'error');
                return;
            }

            const content = `
                <div class="alert alert-${process.type === 'onboarding' ? 'success' : 'secondary'}">
                    <strong>${process.employee_name}</strong> - ${process.position}<br>
                    <small>Status: ${UI.statusBadge(process.status)}</small>
                </div>
                <div id="checklistContainer">
                    ${process.checklist.map((item, idx) => `
                        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                            <input
                                type="checkbox"
                                id="check_${idx}"
                                ${item.completed ? 'checked' : ''}
                                style="width: 20px; height: 20px; cursor: pointer;"
                                onchange="MODULES.onboarding.toggleCheckbox(${idx})"
                            >
                            <label for="check_${idx}" style="flex: 1; cursor: pointer; ${item.completed ? 'text-decoration: line-through; color: #999;' : ''}">
                                ${item.task}
                            </label>
                        </div>
                    `).join('')}
                </div>
            `;

            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>
                <button class="btn btn-primary" onclick="MODULES.onboarding.saveChecklist(${id})">
                    💾 Salvar Progresso
                </button>
            `;

            UI.createModal(`Checklist - ${process.type}`, content, footer);

            // Guardar referência para salvar depois
            window.currentChecklist = process.checklist;
            window.currentProcessId = id;
        } catch (error) {
            UI.showToast('Erro ao carregar checklist', 'error');
        }
    },

    toggleCheckbox(idx) {
        if (window.currentChecklist) {
            window.currentChecklist[idx].completed = document.getElementById(`check_${idx}`).checked;
        }
    },

    async saveChecklist(id) {
        if (!window.currentChecklist) return;

        try {
            UI.showLoading();
            await API.onboarding.update(id, { checklist: window.currentChecklist });
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Progresso salvo com sucesso', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    confirmDelete(id) {
        UI.confirm('Eliminar este processo?', async () => {
            try {
                UI.showLoading();
                await API.onboarding.delete(id);
                UI.hideLoading();
                UI.showToast('Processo eliminado', 'success');
                this.loadData();
            } catch (error) {
                UI.hideLoading();
                UI.showToast(error.message, 'error');
            }
        });
    }
};
