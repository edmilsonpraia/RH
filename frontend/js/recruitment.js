// Módulo de Recrutamento

MODULES.recruitment = {
    async load() {
        const container = document.getElementById('recruitmentModule');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Candidaturas</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.recruitment.showCreateForm()">
                        ➕ Nova Candidatura
                    </button>
                </div>
                <div class="card-body">
                    <div id="recruitmentGrid"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const data = await API.recruitment.getAll();
            UI.hideLoading();

            const columns = [
                { key: 'candidate_name', label: 'Candidato' },
                { key: 'candidate_email', label: 'Email' },
                { key: 'position_title', label: 'Cargo' },
                { key: 'applied_date', label: 'Data', render: (row) => UI.formatDate(row.applied_date) },
                { key: 'status', label: 'Estado', render: (row) => UI.statusBadge(row.status) },
                {
                    key: 'actions',
                    label: 'Ações',
                    className: 'actions',
                    render: (row) => `
                        <button class="btn-icon edit" onclick="MODULES.recruitment.updateStatus(${row.id})" title="Atualizar">✏️</button>
                        <button class="btn-icon delete" onclick="MODULES.recruitment.confirmDelete(${row.id})" title="Eliminar">🗑️</button>
                    `
                }
            ];

            const actions = `
                <button class="btn btn-primary btn-sm" onclick="MODULES.recruitment.showCreateForm()">
                    ➕ Nova Candidatura
                </button>
            `;

            UI.renderDataGrid(data, columns, 'recruitmentGrid', { actions });
        } catch (error) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar candidaturas', 'error');
        }
    },

    showCreateForm() {
        const content = `
            <form id="recruitmentForm">
                <div class="form-group">
                    <label class="form-label">Cargo/Posição *</label>
                    <input type="text" class="form-control" id="recPosition" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nome do Candidato *</label>
                        <input type="text" class="form-control" id="recName" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" id="recEmail" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Telefone</label>
                    <input type="tel" class="form-control" id="recPhone">
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea class="form-control" id="recNotes"></textarea>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.recruitment.submitCreate()">Criar</button>
        `;

        UI.createModal('Nova Candidatura', content, footer);
    },

    async submitCreate() {
        const formData = {
            positionTitle: document.getElementById('recPosition').value,
            candidateName: document.getElementById('recName').value,
            candidateEmail: document.getElementById('recEmail').value,
            candidatePhone: document.getElementById('recPhone').value,
            notes: document.getElementById('recNotes').value
        };

        if (!formData.positionTitle || !formData.candidateName || !formData.candidateEmail) {
            UI.showToast('Preencha os campos obrigatórios', 'error');
            return;
        }

        try {
            UI.showLoading();
            await API.recruitment.create(formData);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Candidatura criada', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    updateStatus(id) {
        const content = `
            <form id="statusForm">
                <div class="form-group">
                    <label class="form-label">Novo Estado</label>
                    <select class="form-control" id="recStatus" required>
                        <option value="novo">Novo</option>
                        <option value="triagem">Triagem</option>
                        <option value="entrevista">Entrevista</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="rejeitado">Rejeitado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea class="form-control" id="recStatusNotes"></textarea>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.recruitment.submitUpdate(${id})">Atualizar</button>
        `;

        UI.createModal('Atualizar Status', content, footer);
    },

    async submitUpdate(id) {
        const status = document.getElementById('recStatus').value;
        const notes = document.getElementById('recStatusNotes').value;

        try {
            UI.showLoading();
            await API.recruitment.update(id, { status, notes });
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Status atualizado', 'success');
            this.loadData();
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
        }
    },

    confirmDelete(id) {
        UI.confirm('Eliminar esta candidatura?', async () => {
            try {
                UI.showLoading();
                await API.recruitment.delete(id);
                UI.hideLoading();
                UI.showToast('Candidatura eliminada', 'success');
                this.loadData();
            } catch (error) {
                UI.hideLoading();
                UI.showToast(error.message, 'error');
            }
        });
    }
};
