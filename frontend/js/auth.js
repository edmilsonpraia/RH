// Gestão de Autenticação

const AUTH = {
    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    },

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        if (!this.isAdmin()) {
            alert('Acesso negado. Apenas administradores.');
            window.location.href = 'user-dashboard.html';
            return false;
        }
        return true;
    }
};

// Verificar autenticação ao carregar páginas protegidas
document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
    const isAdminPage = window.location.pathname.includes('admin-dashboard.html');

    if (!isLoginPage) {
        AUTH.requireAuth();
        if (isAdminPage) {
            AUTH.requireAdmin();
        }
    }
});
