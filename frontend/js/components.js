// Componentes UI Reutilizáveis

const UI = {
    // Toast Notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <strong>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</strong>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    // Modal
    createModal(title, content, footer = '') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" onclick="UI.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        // Fechar ao clicar fora
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });

        return overlay;
    },

    closeModal() {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => overlay.remove(), 200);
        }
    },

    // Loading Spinner
    showLoading() {
        if (document.getElementById('loadingOverlay')) return;

        const loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.className = 'loading-overlay';
        loading.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loading);
    },

    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.remove();
    },

    // Confirm Dialog
    confirm(message, onConfirm) {
        const footer = `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="UI.confirmAction()">Confirmar</button>
        `;

        this.createModal('Confirmação', `<p>${message}</p>`, footer);

        window.UI.confirmAction = () => {
            onConfirm();
            this.closeModal();
        };
    },

    // Data Grid
    renderDataGrid(data, columns, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Toolbar
        const toolbar = `
            <div class="grid-toolbar">
                <div class="grid-search">
                    <input type="text" placeholder="Pesquisar..." id="${containerId}Search">
                    <i>🔍</i>
                </div>
                ${options.actions || ''}
            </div>
        `;

        // Tabela
        let tableHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead>
                        <tr>
        `;

        columns.forEach(col => {
            tableHTML += `<th class="${col.sortable ? 'sortable' : ''}" data-key="${col.key}">${col.label}</th>`;
        });

        tableHTML += `</tr></thead><tbody>`;

        if (data.length === 0) {
            tableHTML += `
                <tr>
                    <td colspan="${columns.length}" class="grid-empty">
                        <i>📋</i>
                        <p>Nenhum registo encontrado</p>
                    </td>
                </tr>
            `;
        } else {
            data.forEach(row => {
                tableHTML += '<tr>';
                columns.forEach(col => {
                    const value = col.render ? col.render(row) : row[col.key];
                    tableHTML += `<td class="${col.className || ''}">${value}</td>`;
                });
                tableHTML += '</tr>';
            });
        }

        tableHTML += `</tbody></table></div>`;

        container.innerHTML = toolbar + tableHTML;

        // Event listener para pesquisa
        const searchInput = document.getElementById(`${containerId}Search`);
        if (searchInput && options.onSearch) {
            searchInput.addEventListener('input', (e) => {
                options.onSearch(e.target.value);
            });
        }
    },

    // Format Currency
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: 'MZN'
        }).format(value);
    },

    // Format Date
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT');
    },

    // Format DateTime
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pt-PT');
    },

    // Status Badge
    statusBadge(status) {
        const statusMap = {
            'active': { label: 'Activo', class: 'success' },
            'inactive': { label: 'Inactivo', class: 'secondary' },
            'pendente': { label: 'Pendente', class: 'warning' },
            'aprovado': { label: 'Aprovado', class: 'success' },
            'rejeitado': { label: 'Rejeitado', class: 'danger' },
            'presente': { label: 'Presente', class: 'success' },
            'falta': { label: 'Falta', class: 'danger' },
            'ferias': { label: 'Férias', class: 'info' },
            'novo': { label: 'Novo', class: 'info' },
            'triagem': { label: 'Triagem', class: 'warning' },
            'entrevista': { label: 'Entrevista', class: 'warning' },
        };

        const badge = statusMap[status] || { label: status, class: 'secondary' };
        return `<span class="badge badge-${badge.class}">${badge.label}</span>`;
    }
};

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        UI.closeModal();
    }
});
