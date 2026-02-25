// Módulo de Relatórios Completo

MODULES.reports = {
    async load() {
        const container = document.getElementById('reportsModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Relatórios Analíticos</h2>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card" style="cursor: pointer;" onclick="MODULES.reports.headcount()">
                            <div class="stat-icon orange">👥</div>
                            <div class="stat-info">
                                <p>Headcount</p>
                                <small>Por departamento</small>
                            </div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="MODULES.reports.absenteeism()">
                            <div class="stat-icon brown">📉</div>
                            <div class="stat-info">
                                <p>Absentismo</p>
                                <small>Faltas e doenças</small>
                            </div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="MODULES.reports.payrollCosts()">
                            <div class="stat-icon success">💰</div>
                            <div class="stat-info">
                                <p>Custos Salariais</p>
                                <small>Por mês/ano</small>
                            </div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="MODULES.reports.recruitmentReport()">
                            <div class="stat-icon info">📝</div>
                            <div class="stat-info">
                                <p>Recrutamento</p>
                                <small>Pipeline</small>
                            </div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="MODULES.reports.auditLogs()">
                            <div class="stat-icon brown">📋</div>
                            <div class="stat-info">
                                <p>Logs de Auditoria</p>
                                <small>Últimas 100 ações</small>
                            </div>
                        </div>
                        <div class="stat-card" style="cursor: pointer;" onclick="MODULES.reports.exportAll()">
                            <div class="stat-icon orange">📊</div>
                            <div class="stat-info">
                                <p>Export Completo</p>
                                <small>CSV/Excel</small>
                            </div>
                        </div>
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

            let total = data.totalActive;
            let chartHTML = '';

            // Criar barra de progresso para cada departamento
            data.byDepartment.forEach(dept => {
                const percent = total > 0 ? Math.round((dept.active / total) * 100) : 0;
                chartHTML += `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong>${dept.department}</strong>
                            <span>${dept.active} colaboradores (${percent}%)</span>
                        </div>
                        <div style="background: #e0e0e0; height: 30px; border-radius: 4px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, var(--primary-orange), var(--primary-bronze)); height: 100%; width: ${percent}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });

            const html = `
                <div class="card">
                    <div class="card-header">
                        <h2>📊 Relatório de Headcount</h2>
                        <button class="btn btn-outline btn-sm" onclick="MODULES.reports.exportCSV('headcount')">
                            📥 Export CSV
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <strong>Total de Colaboradores Activos:</strong> ${total}
                        </div>
                        ${chartHTML}
                        <h3 class="mt-3 mb-2">Detalhes por Departamento</h3>
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Departamento</th>
                                    <th>Total</th>
                                    <th>Activos</th>
                                    <th>Inativos</th>
                                    <th>% do Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.byDepartment.map(d => `
                                    <tr>
                                        <td><strong>${d.department}</strong></td>
                                        <td>${d.total}</td>
                                        <td><span class="badge badge-success">${d.active}</span></td>
                                        <td><span class="badge badge-secondary">${d.inactive}</span></td>
                                        <td>${total > 0 ? Math.round((d.active / total) * 100) : 0}%</td>
                                    </tr>
                                `).join('')}
                                <tr style="background: #f5f5f5; font-weight: bold;">
                                    <td>TOTAL</td>
                                    <td>${data.byDepartment.reduce((sum, d) => sum + d.total, 0)}</td>
                                    <td>${total}</td>
                                    <td>${data.byDepartment.reduce((sum, d) => sum + d.inactive, 0)}</td>
                                    <td>100%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('reportData').innerHTML = html;
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao gerar relatório', 'error');
        }
    },

    async absenteeism() {
        const now = new Date();
        const content = `
            <form id="absenteeismForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Mês</label>
                        <select class="form-control" id="absMonth">
                            ${Array.from({length: 12}, (_, i) => {
                                const month = i + 1;
                                return `<option value="${month}" ${month === now.getMonth() + 1 ? 'selected' : ''}>${month}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ano</label>
                        <select class="form-control" id="absYear">
                            ${[2025, 2024, 2023].map(y => `<option value="${y}" ${y === 2025 ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.reports.generateAbsenteeism()">Gerar Relatório</button>
        `;

        UI.createModal('Relatório de Absentismo', content, footer);
    },

    async generateAbsenteeism() {
        const month = document.getElementById('absMonth').value;
        const year = document.getElementById('absYear').value;

        try {
            UI.closeModal();
            UI.showLoading();
            const data = await API.reports.absenteeism({ month, year });
            UI.hideLoading();

            if (data.length === 0) {
                document.getElementById('reportData').innerHTML = `
                    <div class="alert alert-info">
                        Nenhum registo de absentismo para ${month}/${year}
                    </div>
                `;
                return;
            }

            const totalAbsences = data.reduce((sum, d) => sum + d.absences, 0);

            const html = `
                <div class="card">
                    <div class="card-header">
                        <h2>📉 Relatório de Absentismo - ${month}/${year}</h2>
                        <button class="btn btn-outline btn-sm" onclick="MODULES.reports.exportCSV('absenteeism', ${month}, ${year})">
                            📥 Export CSV
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-warning">
                            <strong>Total de Faltas/Doenças:</strong> ${totalAbsences}
                        </div>
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Colaborador</th>
                                    <th>Departamento</th>
                                    <th>Total Ausências</th>
                                    <th>Faltas</th>
                                    <th>Doenças</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(d => `
                                    <tr>
                                        <td><strong>${d.name}</strong></td>
                                        <td>${d.department}</td>
                                        <td><span class="badge badge-warning">${d.absences}</span></td>
                                        <td><span class="badge badge-danger">${d.unexcused}</span></td>
                                        <td><span class="badge badge-info">${d.sick}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('reportData').innerHTML = html;
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao gerar relatório', 'error');
        }
    },

    async payrollCosts() {
        try {
            UI.showLoading();
            const data = await API.reports.payrollCosts({ year: 2025 });
            UI.hideLoading();

            if (data.length === 0) {
                document.getElementById('reportData').innerHTML = `
                    <div class="alert alert-info">
                        Nenhuma folha de pagamento processada para 2025
                    </div>
                `;
                return;
            }

            const totalCost = data.reduce((sum, d) => sum + d.total_net, 0);

            const html = `
                <div class="card">
                    <div class="card-header">
                        <h2>💰 Relatório de Custos Salariais - 2025</h2>
                        <button class="btn btn-outline btn-sm" onclick="MODULES.reports.exportCSV('payroll')">
                            📥 Export CSV
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-success">
                            <strong>Custo Total Anual:</strong> ${UI.formatCurrency(totalCost)}
                        </div>
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Mês</th>
                                    <th>Colaboradores</th>
                                    <th>Salário Base</th>
                                    <th>Bónus</th>
                                    <th>Deduções</th>
                                    <th>Total Líquido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(d => `
                                    <tr>
                                        <td><strong>${d.month}/${d.year}</strong></td>
                                        <td>${d.employees_count}</td>
                                        <td class="currency">${UI.formatCurrency(d.total_base)}</td>
                                        <td class="currency">${UI.formatCurrency(d.total_bonuses)}</td>
                                        <td class="currency">${UI.formatCurrency(d.total_deductions)}</td>
                                        <td class="currency"><strong>${UI.formatCurrency(d.total_net)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('reportData').innerHTML = html;
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao gerar relatório', 'error');
        }
    },

    async recruitmentReport() {
        try {
            UI.showLoading();
            const data = await API.reports.recruitment();
            UI.hideLoading();

            const html = `
                <div class="card">
                    <div class="card-header">
                        <h2>📝 Relatório de Recrutamento</h2>
                    </div>
                    <div class="card-body">
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Posição</th>
                                    <th>Status</th>
                                    <th>Candidatos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(d => `
                                    <tr>
                                        <td><strong>${d.position_title}</strong></td>
                                        <td>${UI.statusBadge(d.status)}</td>
                                        <td>${d.count}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('reportData').innerHTML = html;
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao gerar relatório', 'error');
        }
    },

    async auditLogs() {
        try {
            UI.showLoading();
            const data = await API.reports.auditLogs(100);
            UI.hideLoading();

            const html = `
                <div class="card">
                    <div class="card-header">
                        <h2>📋 Logs de Auditoria (Últimas 100)</h2>
                    </div>
                    <div class="card-body">
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Utilizador</th>
                                    <th>Ação</th>
                                    <th>Tabela</th>
                                    <th>Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(d => `
                                    <tr>
                                        <td class="date">${UI.formatDateTime(d.timestamp)}</td>
                                        <td><strong>${d.username}</strong></td>
                                        <td><span class="badge badge-info">${d.action}</span></td>
                                        <td>${d.table_name}</td>
                                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${d.details || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('reportData').innerHTML = html;
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao gerar relatório', 'error');
        }
    },

    exportCSV(type, ...args) {
        UI.showToast(`Export de ${type} em desenvolvimento. Dados serão baixados em breve.`, 'info');
        // TODO: Implementar export real
    },

    exportAll() {
        UI.showToast('Export completo será implementado em breve com todos os dados do sistema.', 'info');
    }
};
