// Módulo de Folha de Pagamento

MODULES.payroll = {
    async load() {
        const container = document.getElementById('payrollModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Folha de Pagamento</h2>
                    <button class="btn btn-success btn-sm" onclick="MODULES.payroll.showProcessForm()">
                        💰 Processar Folha
                    </button>
                </div>
                <div class="card-body">
                    <div class="form-row mb-2">
                        <div class="form-group">
                            <label class="form-label">Mês</label>
                            <select class="form-control" id="payMonth">
                                ${Array.from({length: 12}, (_, i) => {
                                    const month = i + 1;
                                    const current = new Date().getMonth() + 1;
                                    return `<option value="${month}" ${month === current ? 'selected' : ''}>${month}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ano</label>
                            <select class="form-control" id="payYear">
                                ${[2025, 2024, 2023].map(y => `<option value="${y}" ${y === 2025 ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn btn-primary" onclick="MODULES.payroll.loadData()">Filtrar</button>
                        </div>
                    </div>
                    <div id="payrollGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const month = document.getElementById('payMonth').value;
            const year = document.getElementById('payYear').value;
            const data = await API.payroll.getAll({ month, year });
            UI.hideLoading();

            const columns = [
                { key: 'employee_name', label: 'Colaborador' },
                { key: 'month', label: 'Mês' },
                { key: 'year', label: 'Ano' },
                {
                    key: 'base_salary',
                    label: 'Salário Base',
                    className: 'currency',
                    render: (row) => UI.formatCurrency(row.base_salary)
                },
                {
                    key: 'bonuses',
                    label: 'Bónus',
                    className: 'currency',
                    render: (row) => UI.formatCurrency(row.bonuses)
                },
                {
                    key: 'deductions',
                    label: 'Deduções',
                    className: 'currency',
                    render: (row) => UI.formatCurrency(row.deductions)
                },
                {
                    key: 'net_salary',
                    label: 'Líquido',
                    className: 'currency',
                    render: (row) => UI.formatCurrency(row.net_salary)
                }
            ];

            const actions = `
                <button class="btn btn-success btn-sm" onclick="MODULES.payroll.showProcessForm()">
                    💰 Processar Folha
                </button>
            `;

            UI.renderDataGrid(data, columns, 'payrollGrid', { actions });
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar folha de pagamento', 'error');
        }
    },

    showProcessForm() {
        const now = new Date();
        const content = `
            <div class="alert alert-info">
                Esta ação irá processar a folha de pagamento para todos os colaboradores ativos do período selecionado.
            </div>
            <form id="processForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Mês *</label>
                        <select class="form-control" id="procMonth" required>
                            ${Array.from({length: 12}, (_, i) => {
                                const month = i + 1;
                                return `<option value="${month}" ${month === now.getMonth() + 1 ? 'selected' : ''}>${month}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ano *</label>
                        <select class="form-control" id="procYear" required>
                            ${[2025, 2024].map(y => `<option value="${y}" ${y === 2025 ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-success" onclick="MODULES.payroll.submitProcess()">Processar</button>
        `;

        UI.createModal('Processar Folha de Pagamento', content, footer);
    },

    async submitProcess() {
        const month = parseInt(document.getElementById('procMonth').value);
        const year = parseInt(document.getElementById('procYear').value);

        try {
            UI.showLoading();
            const result = await API.payroll.process(month, year);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast(`Folha processada: ${result.processed} colaboradores`, 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    }
};
