// Módulo de Assiduidade

MODULES.attendance = {
    async load() {
        const container = document.getElementById('attendanceModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Registos de Assiduidade</h2>
                </div>
                <div class="card-body">
                    <div class="form-row mb-2">
                        <div class="form-group">
                            <label class="form-label">Mês</label>
                            <select class="form-control" id="attMonth">
                                ${Array.from({length: 12}, (_, i) => {
                                    const month = i + 1;
                                    const current = new Date().getMonth() + 1;
                                    return `<option value="${month}" ${month === current ? 'selected' : ''}>${month}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ano</label>
                            <select class="form-control" id="attYear">
                                ${[2025, 2024, 2023].map(y => `<option value="${y}" ${y === 2025 ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn btn-primary" onclick="MODULES.attendance.loadData()">Filtrar</button>
                        </div>
                    </div>
                    <div id="attendanceGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const month = document.getElementById('attMonth').value;
            const year = document.getElementById('attYear').value;
            const data = await API.attendance.getAll({ month, year });
            UI.hideLoading();

            const columns = [
                { key: 'date', label: 'Data', render: (row) => UI.formatDate(row.date) },
                { key: 'employee_name', label: 'Colaborador' },
                { key: 'check_in', label: 'Entrada' },
                { key: 'check_out', label: 'Saída' },
                { key: 'hours_worked', label: 'Horas', render: (row) => `${row.hours_worked || 0}h` },
                { key: 'status', label: 'Estado', render: (row) => UI.statusBadge(row.status) }
            ];

            UI.renderDataGrid(data, columns, 'attendanceGrid');
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar assiduidade', 'error');
        }
    }
};

MODULES.leave = {
    async load() {
        const container = document.getElementById('leaveModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Pedidos de Férias</h2>
                </div>
                <div class="card-body">
                    <div id="leaveGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const data = await API.attendance.getLeaveRequests();
            UI.hideLoading();

            const columns = [
                { key: 'employee_name', label: 'Colaborador' },
                { key: 'start_date', label: 'Início', render: (row) => UI.formatDate(row.start_date) },
                { key: 'end_date', label: 'Fim', render: (row) => UI.formatDate(row.end_date) },
                { key: 'days', label: 'Dias' },
                { key: 'status', label: 'Estado', render: (row) => UI.statusBadge(row.status) },
                {
                    key: 'actions',
                    label: 'Ações',
                    className: 'actions',
                    render: (row) => row.status === 'pendente' ? `
                        <button class="btn-icon" style="color: #28A745;" onclick="MODULES.leave.approve(${row.id})" title="Aprovar">✓</button>
                        <button class="btn-icon" style="color: #DC3545;" onclick="MODULES.leave.reject(${row.id})" title="Rejeitar">✗</button>
                    ` : '-'
                }
            ];

            UI.renderDataGrid(data, columns, 'leaveGrid');
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar férias', 'error');
        }
    },

    async approve(id) {
        try {
            UI.showLoading();
            await API.attendance.reviewLeave(id, 'aprovado');
            UI.hideLoading();
            UI.showToast('Férias aprovadas', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    async reject(id) {
        try {
            UI.showLoading();
            await API.attendance.reviewLeave(id, 'rejeitado');
            UI.hideLoading();
            UI.showToast('Férias rejeitadas', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    }
};
