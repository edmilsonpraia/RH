// Cliente HTTP para comunicação com o backend

const API = {
    BASE_URL: '/api',

    async request(endpoint, options = {}) {
        const token = AUTH.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            ...options
        };

        try {
            const response = await fetch(`${this.BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    AUTH.logout();
                }
                throw new Error(data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Endpoints específicos
    users: {
        getAll() {
            return API.get('/users');
        },
        createUser(data) {
            return API.post('/users/create-user', data);
        },
        changePassword(data) {
            return API.put('/users/change-password', data);
        }
    },

    employees: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/employees${query ? '?' + query : ''}`);
        },
        getById(id) {
            return API.get(`/employees/${id}`);
        },
        create(data) {
            return API.post('/employees', data);
        },
        update(id, data) {
            return API.put(`/employees/${id}`, data);
        },
        delete(id) {
            return API.delete(`/employees/${id}`);
        }
    },

    attendance: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/attendance${query ? '?' + query : ''}`);
        },
        checkIn() {
            return API.post('/attendance/check', { type: 'in' });
        },
        checkOut() {
            return API.post('/attendance/check', { type: 'out' });
        },
        getLeaveRequests() {
            return API.get('/attendance/leave-requests');
        },
        requestLeave(data) {
            return API.post('/attendance/leave-requests', data);
        },
        reviewLeave(id, status) {
            return API.put(`/attendance/leave-requests/${id}`, { status });
        }
    },

    recruitment: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/recruitment${query ? '?' + query : ''}`);
        },
        create(data) {
            return API.post('/recruitment', data);
        },
        update(id, data) {
            return API.put(`/recruitment/${id}`, data);
        },
        delete(id) {
            return API.delete(`/recruitment/${id}`);
        }
    },

    payroll: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/payroll${query ? '?' + query : ''}`);
        },
        process(month, year) {
            return API.post('/payroll/process', { month, year });
        },
        getById(id) {
            return API.get(`/payroll/${id}`);
        }
    },

    performance: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/performance${query ? '?' + query : ''}`);
        },
        create(data) {
            return API.post('/performance', data);
        },
        update(id, data) {
            return API.put(`/performance/${id}`, data);
        }
    },

    onboarding: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/onboarding${query ? '?' + query : ''}`);
        },
        create(data) {
            return API.post('/onboarding', data);
        },
        update(id, data) {
            return API.put(`/onboarding/${id}`, data);
        },
        delete(id) {
            return API.delete(`/onboarding/${id}`);
        }
    },

    reports: {
        headcount() {
            return API.get('/reports/headcount');
        },
        absenteeism(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/reports/absenteeism${query ? '?' + query : ''}`);
        },
        payrollCosts(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/reports/payroll-costs${query ? '?' + query : ''}`);
        },
        recruitment() {
            return API.get('/reports/recruitment');
        },
        auditLogs(limit = 100) {
            return API.get(`/reports/audit-logs?limit=${limit}`);
        }
    }
};
