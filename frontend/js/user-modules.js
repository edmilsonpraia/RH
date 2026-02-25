// Módulos do Portal do Colaborador

const USER_MODULES = {
    // Módulo: Meu Perfil
    profile: {
        async load() {
            const container = document.getElementById('profileModule');
            const user = AUTH.getUser();

            if (!user.employeeId) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        Este utilizador não está associado a um colaborador.
                    </div>
                `;
                return;
            }

            try {
                UI.showLoading();
                const employee = await API.employees.getById(user.employeeId);
                UI.hideLoading();

                container.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h2>👤 Meus Dados Pessoais</h2>
                            <button class="btn btn-primary btn-sm" onclick="USER_MODULES.profile.editProfile()">
                                ✏️ Editar Contactos
                            </button>
                        </div>
                        <div class="card-body">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                                <div class="form-group">
                                    <label class="form-label">Nome Completo</label>
                                    <input type="text" class="form-control" value="${employee.name}" disabled>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="text" class="form-control" value="${employee.email}" disabled>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Telefone</label>
                                    <input type="text" class="form-control" id="profilePhone" value="${employee.phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Cargo</label>
                                    <input type="text" class="form-control" value="${employee.position}" disabled>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Departamento</label>
                                    <input type="text" class="form-control" value="${employee.department}" disabled>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Data de Admissão</label>
                                    <input type="text" class="form-control" value="${UI.formatDate(employee.hire_date)}" disabled>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Salário Base</label>
                                    <input type="text" class="form-control" value="${UI.formatCurrency(employee.salary)}" disabled>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Status</label>
                                    <input type="text" class="form-control" value="${employee.status === 'active' ? 'Ativo' : 'Inativo'}" disabled>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header">
                            <h2>🔐 Alterar Password</h2>
                        </div>
                        <div class="card-body">
                            <form id="changePasswordForm" onsubmit="event.preventDefault(); USER_MODULES.profile.changePassword();">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Password Atual</label>
                                        <input type="password" class="form-control" id="currentPassword" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Nova Password</label>
                                        <input type="password" class="form-control" id="newPassword" required minlength="6">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Confirmar Nova Password</label>
                                        <input type="password" class="form-control" id="confirmPassword" required minlength="6">
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary">Alterar Password</button>
                            </form>
                        </div>
                    </div>
                `;

                // Guardar referência do employee
                window.currentEmployee = employee;
            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar perfil', 'error');
            }
        },

        editProfile() {
            const phone = document.getElementById('profilePhone').value;
            const employee = window.currentEmployee;

            if (!employee) return;

            UI.confirm('Deseja atualizar o seu número de telefone?', async () => {
                try {
                    UI.showLoading();
                    await API.employees.update(employee.id, { phone });
                    UI.hideLoading();
                    UI.showToast('Telefone atualizado com sucesso', 'success');
                    this.load();
                } catch (error) {
                    UI.hideLoading();
                    UI.showToast(error.message, 'error');
                }
            });
        },

        async changePassword() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                UI.showToast('As passwords não coincidem', 'error');
                return;
            }

            if (newPassword.length < 6) {
                UI.showToast('A password deve ter pelo menos 6 caracteres', 'error');
                return;
            }

            try {
                UI.showLoading();
                await API.fetch('/users/change-password', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                UI.hideLoading();
                UI.showToast('Password alterada com sucesso', 'success');
                document.getElementById('changePasswordForm').reset();
            } catch (error) {
                UI.hideLoading();
                UI.showToast(error.message, 'error');
            }
        }
    },

    // Módulo: Assiduidade
    attendance: {
        async load() {
            const container = document.getElementById('attendanceModule');
            const user = AUTH.getUser();

            if (!user.employeeId) {
                container.innerHTML = `<div class="alert alert-warning">Utilizador não associado a colaborador.</div>`;
                return;
            }

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>🕐 Minha Assiduidade</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-row mb-3">
                            <div class="form-group">
                                <label class="form-label">Mês</label>
                                <select class="form-control" id="attMonth">
                                    ${Array.from({length: 12}, (_, i) => {
                                        const month = i + 1;
                                        const selected = month === new Date().getMonth() + 1 ? 'selected' : '';
                                        return `<option value="${month}" ${selected}>${month}</option>`;
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
                                <button class="btn btn-primary" onclick="USER_MODULES.attendance.load()">Filtrar</button>
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
                const user = AUTH.getUser();
                const month = parseInt(document.getElementById('attMonth')?.value || new Date().getMonth() + 1);
                const year = parseInt(document.getElementById('attYear')?.value || 2025);

                UI.showLoading();
                const data = await API.attendance.getAll({ month, year });
                UI.hideLoading();

                // Filtrar apenas os registros do utilizador
                const myAttendance = data.filter(a => a.employee_id === user.employeeId);

                const columns = [
                    { key: 'date', label: 'Data', render: (row) => UI.formatDate(row.date) },
                    { key: 'check_in', label: 'Entrada', render: (row) => row.check_in || '-' },
                    { key: 'check_out', label: 'Saída', render: (row) => row.check_out || '-' },
                    {
                        key: 'hours_worked',
                        label: 'Horas',
                        render: (row) => row.hours_worked ? `${row.hours_worked.toFixed(1)}h` : '-'
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (row) => {
                            const badges = {
                                'presente': 'success',
                                'ausente': 'danger',
                                'falta': 'danger',
                                'ferias': 'info',
                                'doenca': 'warning'
                            };
                            return `<span class="badge badge-${badges[row.status] || 'secondary'}">${row.status}</span>`;
                        }
                    }
                ];

                // Calcular estatísticas
                const totalHours = myAttendance.reduce((sum, a) => sum + (a.hours_worked || 0), 0);
                const daysPresent = myAttendance.filter(a => a.status === 'presente').length;
                const daysAbsent = myAttendance.filter(a => ['ausente', 'falta'].includes(a.status)).length;

                const statsHTML = `
                    <div class="alert alert-info mb-3">
                        <strong>Resumo do Mês:</strong>
                        ${daysPresent} dias presente |
                        ${daysAbsent} faltas |
                        ${totalHours.toFixed(1)} horas trabalhadas
                    </div>
                `;

                document.getElementById('attendanceGrid').innerHTML = statsHTML;

                const gridContainer = document.createElement('div');
                document.getElementById('attendanceGrid').appendChild(gridContainer);
                UI.renderDataGrid(myAttendance, columns, gridContainer);

            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar assiduidade', 'error');
            }
        }
    },

    // Módulo: Férias
    leave: {
        async load() {
            const container = document.getElementById('leaveModule');
            const user = AUTH.getUser();

            if (!user.employeeId) {
                container.innerHTML = `<div class="alert alert-warning">Utilizador não associado a colaborador.</div>`;
                return;
            }

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>🏖️ Minhas Férias</h2>
                        <button class="btn btn-primary btn-sm" onclick="USER.requestLeave()">
                            ➕ Novo Pedido
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="leaveSummary" class="mb-3"></div>
                        <div id="leaveGrid"></div>
                    </div>
                </div>
            `;

            await this.loadData();
        },

        async loadData() {
            try {
                const user = AUTH.getUser();
                UI.showLoading();
                const data = await API.attendance.getLeaveRequests();
                UI.hideLoading();

                // Filtrar pedidos do utilizador
                const myLeave = data.filter(l => l.employee_id === user.employeeId);

                // Calcular saldo
                const usedDays = myLeave
                    .filter(l => l.status === 'aprovado')
                    .reduce((sum, l) => sum + l.days, 0);
                const totalDays = 22; // Exemplo: 22 dias por ano
                const balance = totalDays - usedDays;

                document.getElementById('leaveSummary').innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon success">📅</div>
                            <div class="stat-info">
                                <h3>${totalDays}</h3>
                                <p>Dias Anuais</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon danger">✓</div>
                            <div class="stat-info">
                                <h3>${usedDays}</h3>
                                <p>Dias Usados</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon orange">📊</div>
                            <div class="stat-info">
                                <h3>${balance}</h3>
                                <p>Saldo Disponível</p>
                            </div>
                        </div>
                    </div>
                `;

                const columns = [
                    { key: 'start_date', label: 'Início', render: (row) => UI.formatDate(row.start_date) },
                    { key: 'end_date', label: 'Fim', render: (row) => UI.formatDate(row.end_date) },
                    { key: 'days', label: 'Dias', render: (row) => `${row.days} dias` },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (row) => UI.statusBadge(row.status)
                    },
                    { key: 'requested_at', label: 'Solicitado', render: (row) => UI.formatDate(row.requested_at) }
                ];

                UI.renderDataGrid(myLeave, columns, 'leaveGrid');

            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar férias', 'error');
            }
        }
    },

    // Módulo: Recibos de Vencimento
    payslips: {
        async load() {
            const container = document.getElementById('payslipsModule');
            const user = AUTH.getUser();

            if (!user.employeeId) {
                container.innerHTML = `<div class="alert alert-warning">Utilizador não associado a colaborador.</div>`;
                return;
            }

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>💰 Recibos de Vencimento</h2>
                    </div>
                    <div class="card-body">
                        <div id="payslipsGrid"></div>
                    </div>
                </div>
            `;

            await this.loadData();
        },

        async loadData() {
            try {
                const user = AUTH.getUser();
                UI.showLoading();
                const data = await API.payroll.getAll();
                UI.hideLoading();

                // Filtrar recibos do utilizador
                const myPayslips = data.filter(p => p.employee_id === user.employeeId);

                if (myPayslips.length === 0) {
                    document.getElementById('payslipsGrid').innerHTML = `
                        <div class="alert alert-info">
                            Nenhum recibo de vencimento disponível.
                        </div>
                    `;
                    return;
                }

                const columns = [
                    {
                        key: 'month',
                        label: 'Mês/Ano',
                        render: (row) => `${row.month}/${row.year}`
                    },
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
                        render: (row) => UI.formatCurrency(row.bonuses || 0)
                    },
                    {
                        key: 'deductions',
                        label: 'Deduções',
                        className: 'currency',
                        render: (row) => UI.formatCurrency(row.deductions || 0)
                    },
                    {
                        key: 'net_salary',
                        label: 'Líquido',
                        className: 'currency',
                        render: (row) => `<strong>${UI.formatCurrency(row.net_salary)}</strong>`
                    },
                    {
                        key: 'actions',
                        label: 'Ações',
                        className: 'actions',
                        render: (row) => `
                            <button class="btn-icon view" onclick="USER_MODULES.payslips.viewDetails(${row.id})" title="Ver Detalhes">👁️</button>
                            <button class="btn-icon" onclick="USER_MODULES.payslips.downloadPDF(${row.id})" title="Download PDF">📥</button>
                        `
                    }
                ];

                UI.renderDataGrid(myPayslips, columns, 'payslipsGrid');

            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar recibos', 'error');
            }
        },

        async viewDetails(payrollId) {
            try {
                UI.showLoading();
                const data = await API.payroll.getAll();
                const payslip = data.find(p => p.id === payrollId);
                UI.hideLoading();

                if (!payslip) {
                    UI.showToast('Recibo não encontrado', 'error');
                    return;
                }

                const content = `
                    <div style="font-family: monospace;">
                        <h3 style="text-align: center; color: #8B4513;">RECIBO DE VENCIMENTO</h3>
                        <p style="text-align: center; margin-bottom: 20px;">
                            <strong>Mês/Ano:</strong> ${payslip.month}/${payslip.year}
                        </p>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 2px solid #333;">
                                <td style="padding: 10px;"><strong>Colaborador:</strong></td>
                                <td style="padding: 10px; text-align: right;">${payslip.employee_name}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #ddd;">
                                <td style="padding: 10px;">Salário Base</td>
                                <td style="padding: 10px; text-align: right;">${UI.formatCurrency(payslip.base_salary)}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #ddd;">
                                <td style="padding: 10px;">Bónus</td>
                                <td style="padding: 10px; text-align: right; color: green;">+ ${UI.formatCurrency(payslip.bonuses || 0)}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #ddd;">
                                <td style="padding: 10px;">Deduções (IRT, INSS)</td>
                                <td style="padding: 10px; text-align: right; color: red;">- ${UI.formatCurrency(payslip.deductions || 0)}</td>
                            </tr>
                            <tr style="border-top: 2px solid #333; background: #f5f5f5;">
                                <td style="padding: 15px;"><strong>TOTAL LÍQUIDO</strong></td>
                                <td style="padding: 15px; text-align: right; font-size: 18px;"><strong>${UI.formatCurrency(payslip.net_salary)}</strong></td>
                            </tr>
                        </table>

                        <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                            Processado em: ${UI.formatDate(payslip.processed_at)}
                        </p>
                    </div>
                `;

                const footer = `
                    <button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>
                    <button class="btn btn-primary" onclick="USER_MODULES.payslips.downloadPDF(${payrollId})">
                        📥 Download PDF
                    </button>
                `;

                UI.createModal('Recibo de Vencimento', content, footer);

            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar detalhes', 'error');
            }
        },

        downloadPDF(payrollId) {
            UI.showToast('Download de PDF será implementado em breve', 'info');
            // TODO: Implementar geração de PDF real
        }
    },

    // Módulo: Avaliações
    performance: {
        async load() {
            const container = document.getElementById('performanceModule');
            const user = AUTH.getUser();

            if (!user.employeeId) {
                container.innerHTML = `<div class="alert alert-warning">Utilizador não associado a colaborador.</div>`;
                return;
            }

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>⭐ Minhas Avaliações de Desempenho</h2>
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
                const user = AUTH.getUser();
                UI.showLoading();
                const data = await API.performance.getAll();
                UI.hideLoading();

                // Filtrar avaliações do utilizador
                const myReviews = data.filter(p => p.employee_id === user.employeeId);

                if (myReviews.length === 0) {
                    document.getElementById('performanceGrid').innerHTML = `
                        <div class="alert alert-info">
                            Nenhuma avaliação de desempenho disponível.
                        </div>
                    `;
                    return;
                }

                const columns = [
                    {
                        key: 'review_date',
                        label: 'Data da Avaliação',
                        render: (row) => UI.formatDate(row.review_date)
                    },
                    {
                        key: 'reviewer_name',
                        label: 'Avaliador',
                        render: (row) => row.reviewer_name || 'Gestor'
                    },
                    {
                        key: 'rating',
                        label: 'Classificação',
                        render: (row) => {
                            const stars = '⭐'.repeat(row.rating);
                            const empty = '☆'.repeat(5 - row.rating);
                            return `<span style="font-size: 18px;">${stars}${empty}</span> (${row.rating}/5)`;
                        }
                    },
                    {
                        key: 'actions',
                        label: 'Ações',
                        className: 'actions',
                        render: (row) => `
                            <button class="btn-icon view" onclick="USER_MODULES.performance.viewDetails(${row.id})" title="Ver Detalhes">👁️</button>
                        `
                    }
                ];

                UI.renderDataGrid(myReviews, columns, 'performanceGrid');

            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar avaliações', 'error');
            }
        },

        async viewDetails(reviewId) {
            try {
                UI.showLoading();
                const data = await API.performance.getAll();
                const review = data.find(r => r.id === reviewId);
                UI.hideLoading();

                if (!review) {
                    UI.showToast('Avaliação não encontrada', 'error');
                    return;
                }

                const stars = '⭐'.repeat(review.rating);
                const empty = '☆'.repeat(5 - review.rating);

                const content = `
                    <div class="alert alert-info">
                        <strong>Data da Avaliação:</strong> ${UI.formatDate(review.review_date)}<br>
                        <strong>Avaliador:</strong> ${review.reviewer_name || 'Gestor'}<br>
                        <strong>Classificação:</strong> <span style="font-size: 24px;">${stars}${empty}</span> (${review.rating}/5)
                    </div>

                    <h3>📝 Feedback:</h3>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; white-space: pre-wrap;">
                        ${review.feedback || 'Sem feedback escrito.'}
                    </div>

                    <h3>🎯 Objetivos:</h3>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
                        ${review.goals || 'Nenhum objetivo definido.'}
                    </div>
                `;

                UI.createModal(`Avaliação de Desempenho - ${UI.formatDate(review.review_date)}`, content, `
                    <button class="btn btn-primary" onclick="UI.closeModal()">Fechar</button>
                `);

            } catch (error) {
                UI.hideLoading();
                UI.showToast('Erro ao carregar detalhes', 'error');
            }
        }
    }
};
