// Cliente HTTP para comunicação com o backend

const API = {
    BASE_URL: '/api',

    // Helper: converte File para { name, mime, size, data } (data em base64 puro)
    async fileToObject(file) {
        if (!file) return null;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                // result = "data:application/pdf;base64,JVBERi0..."
                const base64 = result.split(',')[1];
                resolve({
                    name: file.name,
                    mime: file.type || 'application/octet-stream',
                    size: file.size,
                    data: base64
                });
            };
            reader.onerror = () => reject(new Error('Erro a ler ficheiro'));
            reader.readAsDataURL(file);
        });
    },

    // Abre/descarrega ficheiro de um endpoint protegido (com token)
    async openFile(endpoint, fallbackName) {
        const token = AUTH.getToken();
        try {
            const r = await fetch(`${this.BASE_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!r.ok) throw new Error('Ficheiro não encontrado');
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win) {
                // Pop-up bloqueado: força download
                const a = document.createElement('a');
                a.href = url;
                a.download = fallbackName || 'documento';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            alert('Erro ao abrir: ' + e.message);
        }
    },

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
        getById(id) {
            return API.get(`/recruitment/${id}`);
        },
        create(data) {
            return API.post('/recruitment', data);
        },
        update(id, data) {
            return API.put(`/recruitment/${id}`, data);
        },
        delete(id) {
            return API.delete(`/recruitment/${id}`);
        },
        openCv(id, fileName) {
            return API.openFile(`/recruitment/${id}/cv`, fileName);
        },
        openDocument(id, idx, fileName) {
            return API.openFile(`/recruitment/${id}/documents/${idx}`, fileName);
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
    },

    // === PAD.CGC.04 - Recrutamento e Selecao ===

    requisitions: {
        getAll(params = {}) {
            const q = new URLSearchParams(params).toString();
            return API.get(`/requisitions${q ? '?' + q : ''}`);
        },
        getById(id) { return API.get(`/requisitions/${id}`); },
        create(data) { return API.post('/requisitions', data); },
        update(id, data) { return API.put(`/requisitions/${id}`, data); },
        submit(id) { return API.post(`/requisitions/${id}/submit`, {}); },
        decide(id, role, decision, comments) {
            return API.post(`/requisitions/${id}/decision`, { role, decision, comments });
        },
        publish(id) { return API.post(`/requisitions/${id}/publish`, {}); },
        delete(id) { return API.delete(`/requisitions/${id}`); }
    },

    mobility: {
        getAll() { return API.get('/mobility'); },
        create(data) { return API.post('/mobility', data); },
        decide(id, status, decision_comments, qhsa_assessment) {
            return API.put(`/mobility/${id}/decide`, { status, decision_comments, qhsa_assessment });
        }
    },

    offboarding: {
        getAll() { return API.get('/offboarding'); },
        create(data) { return API.post('/offboarding', data); },
        updateChecklist(id, data) { return API.put(`/offboarding/${id}/checklist`, data); }
    },

    rsDashboard: {
        kpis() { return API.get('/rs-dashboard/kpis'); },
        timeToApprove() { return API.get('/rs-dashboard/time-to-approve'); }
    },

    audit: {
        getAll(params = {}) {
            const q = new URLSearchParams(params).toString();
            return API.get(`/audit${q ? '?' + q : ''}`);
        }
    },

    talentPool: {
        getAll(params = {}) {
            const q = new URLSearchParams(params).toString();
            return API.get(`/talent-pool${q ? '?' + q : ''}`);
        },
        stats() { return API.get('/talent-pool/stats'); },
        getById(id) { return API.get(`/talent-pool/${id}`); },
        create(data) { return API.post('/talent-pool', data); },
        update(id, data) { return API.put(`/talent-pool/${id}`, data); },
        contact(id) { return API.post(`/talent-pool/${id}/contact`, {}); },
        convert(id, position_title) { return API.post(`/talent-pool/${id}/convert`, { position_title }); },
        delete(id) { return API.delete(`/talent-pool/${id}`); },
        openCv(id, fileName) { return API.openFile(`/talent-pool/${id}/cv`, fileName); },
        openDocument(id, idx, fileName) { return API.openFile(`/talent-pool/${id}/documents/${idx}`, fileName); }
    },

    evaluations: {
        getAll(params = {}) {
            const q = new URLSearchParams(params).toString();
            return API.get(`/evaluations${q ? '?' + q : ''}`);
        },
        getById(id) { return API.get(`/evaluations/${id}`); },
        nineBox() { return API.get('/evaluations/nine-box'); },
        history(employeeId) { return API.get(`/evaluations/employee/${employeeId}/history`); },
        stats() { return API.get('/evaluations/stats/global'); },
        create(data) { return API.post('/evaluations', data); },
        update(id, data) { return API.put(`/evaluations/${id}`, data); }
    }
};
