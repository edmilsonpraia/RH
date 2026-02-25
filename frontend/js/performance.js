// Módulo de Avaliação de Desempenho

MODULES.performance = {
    async load() {
        const container = document.getElementById('performanceModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Avaliações de Desempenho</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.performance.showCreateForm()">
                        ➕ Nova Avaliação
                    </button>
                </div>
                <div class="card-body">
                    <div id="performanceGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const data = await API.performance.getAll();
            UI.hideLoading();

            const columns = [
                { key: 'employee_name', label: 'Colaborador' },
                { key: 'review_date', label: 'Data', render: (row) => UI.formatDate(row.review_date) },
                { key: 'reviewer_name', label: 'Avaliador' },
                {
                    key: 'rating',
                    label: 'Rating',
                    render: (row) => '⭐'.repeat(row.rating) + '☆'.repeat(5 - row.rating)
                },
                { key: 'feedback', label: 'Feedback', render: (row) => (row.feedback || '').substring(0, 50) + '...' }
            ];

            const actions = `
                <button class="btn btn-primary btn-sm" onclick="MODULES.performance.showCreateForm()">
                    ➕ Nova Avaliação
                </button>
            `;

            UI.renderDataGrid(data, columns, 'performanceGrid', { actions });
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar avaliações', 'error');
        }
    },

    async showCreateForm() {
        try {
            // Carregar lista de colaboradores
            const employees = await API.employees.getAll();

            const content = `
                <form id="performanceForm">
                    <div class="form-group">
                        <label class="form-label">Colaborador *</label>
                        <select class="form-control" id="perfEmployee" required>
                            <option value="">Selecione...</option>
                            ${employees.employees?.map(e => `<option value="${e.id}">${e.name} - ${e.position}</option>`).join('') || ''}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Data da Avaliação *</label>
                            <input type="date" class="form-control" id="perfDate" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rating (1-5) *</label>
                            <select class="form-control" id="perfRating" required>
                                <option value="">Selecione...</option>
                                <option value="1">1 - Insatisfatório</option>
                                <option value="2">2 - Abaixo do Esperado</option>
                                <option value="3">3 - Satisfatório</option>
                                <option value="4">4 - Bom</option>
                                <option value="5">5 - Excelente</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Feedback</label>
                        <textarea class="form-control" id="perfFeedback" rows="4"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Objetivos</label>
                        <textarea class="form-control" id="perfGoals" rows="3"></textarea>
                    </div>
                </form>
            `;

            const footer = `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.performance.submitCreate()">Criar</button>
            `;

            UI.createModal('Nova Avaliação de Desempenho', content, footer);
        } catch (error) {
            UI.showToast('Erro ao carregar formulário', 'error');
        }
    },

    async submitCreate() {
        const formData = {
            employeeId: parseInt(document.getElementById('perfEmployee').value),
            reviewDate: document.getElementById('perfDate').value,
            rating: parseInt(document.getElementById('perfRating').value),
            feedback: document.getElementById('perfFeedback').value,
            goals: document.getElementById('perfGoals').value
        };

        if (!formData.employeeId || !formData.reviewDate || !formData.rating) {
            UI.showToast('Preencha os campos obrigatórios', 'error');
            return;
        }

        try {
            UI.showLoading();
            await API.performance.create(formData);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Avaliação criada com sucesso', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    }
};

// Módulo de Relatórios
MODULES.reports = {
    async load() {
        const container = document.getElementById('reportsModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Relatórios Analíticos</h2>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <button class="btn btn-primary" onclick="MODULES.reports.headcount()">📊 Headcount</button>
                        <button class="btn btn-secondary" onclick="MODULES.reports.absenteeism()">📉 Absentismo</button>
                        <button class="btn btn-success" onclick="MODULES.reports.payrollCosts()">💰 Custos Salariais</button>
                        <button class="btn btn-info" onclick="MODULES.reports.recruitment()">📝 Recrutamento</button>
                        <button class="btn btn-outline" onclick="MODULES.reports.auditLogs()">📋 Logs de Auditoria</button>
                    </div>
                    <div id="reportData" class="mt-3"></div>
                </div>
            </div>
        `;
    },

    async headcount() {
        try {
            UI.showLoading();
            const data = await API.reports.headcount();
            UI.hideLoading();

            const html = `
                <h3>Relatório de Headcount</h3>
                <p><strong>Total Activos:</strong> ${data.totalActive}</p>
                <table class="data-grid">
                    <thead>
                        <tr><th>Departamento</th><th>Total</th><th>Activos</th><th>Inativos</th></tr>
                    </thead>
                    <tbody>
                        ${data.byDepartment.map(d => `
                            <tr>
                                <td>${d.department}</td>
                                <td>${d.total}</td>
                                <td>${d.active}</td>
                                <td>${d.inactive}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('reportData').innerHTML = html;
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao gerar relatório', 'error');
        }
    },

    async absenteeism() {
        UI.showToast('Relatório de absentismo em desenvolvimento', 'info');
    },

    async payrollCosts() {
        UI.showToast('Relatório de custos em desenvolvimento', 'info');
    },

    async recruitment() {
        UI.showToast('Relatório de recrutamento em desenvolvimento', 'info');
    },

    async auditLogs() {
        UI.showToast('Logs de auditoria em desenvolvimento', 'info');
    }
};
