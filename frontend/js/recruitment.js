// Modulo de Recrutamento (Candidatos)

MODULES.recruitment = {
    items: [],

    STATUS: {
        novo:       { label: 'Novo',       color: '#0ea5e9', bg: '#f0f9ff' },
        triagem:    { label: 'Triagem',    color: '#6366f1', bg: '#eef2ff' },
        entrevista: { label: 'Entrevista', color: '#8b5cf6', bg: '#f5f3ff' },
        aprovado:   { label: 'Aprovado',   color: '#10b981', bg: '#ecfdf5' },
        rejeitado:  { label: 'Rejeitado',  color: '#dc2626', bg: '#fef2f2' }
    },

    async load() {
        const c = document.getElementById('recruitmentModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Candidaturas</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.recruitment.showCreateForm()">
                        <i class="codicon codicon-add"></i> Nova Candidatura
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters-bar" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
                        <select class="form-control" id="recFilterStatus" style="max-width:180px;">
                            <option value="">Todos os estados</option>
                            ${Object.entries(this.STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                        </select>
                    </div>
                    <div id="recList"></div>
                </div>
            </div>
        `;

        document.getElementById('recFilterStatus').addEventListener('change', () => this.loadData());
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            const status = document.getElementById('recFilterStatus')?.value;
            const params = status ? { status } : {};
            this.items = await API.recruitment.getAll(params);
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar candidaturas', 'error');
        }
    },

    render() {
        const c = document.getElementById('recList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-search"></i><p>Sem candidaturas. Adicione candidatos manualmente ou converta a partir do Talent Scouting.</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const badge = st => {
            const s = this.STATUS[st] || { label: st, color: '#666', bg: '#eee' };
            return `<span class="badge" style="background:${s.bg}; color:${s.color};">${s.label}</span>`;
        };

        const cvIcon = r => r.has_cv && r.cv_file_name
            ? `<button class="btn-icon view" onclick="event.stopPropagation(); API.recruitment.openCv(${r.id}, '${escape(r.cv_file_name).replace(/'/g, "\\'")}')" title="Abrir CV"><i class="codicon codicon-file-text" style="color:var(--brand-600);"></i></button>`
            : '<i class="codicon codicon-file" style="color:var(--ink-300);" title="Sem CV"></i>';

        const docsIcon = r => r.documents_count > 0
            ? `<span class="badge badge-secondary" title="${r.documents_count} documento(s)"><i class="codicon codicon-files"></i> ${r.documents_count}</span>`
            : '-';

        const rows = this.items.map(r => `
            <tr>
                <td><strong>${escape(r.candidate_name)}</strong></td>
                <td>${escape(r.candidate_email)}</td>
                <td>${escape(r.candidate_phone || '-')}</td>
                <td>${escape(r.position_title)}</td>
                <td>${r.applied_date ? new Date(r.applied_date).toLocaleDateString('pt-PT') : '-'}</td>
                <td>${badge(r.status)}</td>
                <td style="text-align:center;">${cvIcon(r)}</td>
                <td style="text-align:center;">${docsIcon(r)}</td>
                <td class="actions">
                    <button class="btn-icon view" onclick="MODULES.recruitment.showDetails(${r.id})" title="Ver"><i class="codicon codicon-eye"></i></button>
                    <button class="btn-icon edit" onclick="MODULES.recruitment.showEditForm(${r.id})" title="Editar"><i class="codicon codicon-edit"></i></button>
                    <button class="btn-icon delete" onclick="MODULES.recruitment.confirmDelete(${r.id}, '${escape(r.candidate_name).replace(/'/g, "\\'")}')" title="Eliminar"><i class="codicon codicon-trash"></i></button>
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>Candidato</th><th>Email</th><th>Telefone</th><th>Cargo</th><th>Data</th><th>Estado</th><th>CV</th><th>Docs</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    showCreateForm() {
        UI.createModal('Nova Candidatura', this.getFormHTML(), `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.recruitment.submit()">Criar</button>
        `);
    },

    async showEditForm(id) {
        try {
            const r = await API.recruitment.getById(id);
            UI.createModal(`Editar: ${r.candidate_name}`, this.getFormHTML(r), `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.recruitment.update(${id})">Atualizar</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    getFormHTML(d = {}) {
        const sel = (val, current) => val === current ? 'selected' : '';
        return `
            <form id="recForm">
                <div class="form-group">
                    <label class="form-label">Cargo / Vaga *</label>
                    <input type="text" class="form-control" id="recPosition" value="${d.position_title || ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-control" id="recName" value="${d.candidate_name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" id="recEmail" value="${d.candidate_email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input type="tel" class="form-control" id="recPhone" value="${d.candidate_phone || ''}">
                    </div>
                </div>
                ${d.id ? `
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" id="recStatus">
                            ${Object.entries(this.STATUS).map(([k, v]) => `<option value="${k}" ${sel(k, d.status)}>${v.label}</option>`).join('')}
                        </select>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea class="form-control" id="recNotes" rows="2">${d.notes || ''}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">CV (PDF/DOCX) <span style="font-size:11px; color:var(--ink-500);">— máx 10MB</span></label>
                    <input type="file" class="form-control" id="recCvFile" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg">
                    ${d.cv_file_name ? `
                        <div style="margin-top:6px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--ink-50); border-radius:6px;">
                            <i class="codicon codicon-file-text" style="color:var(--brand-600);"></i>
                            <span style="font-size:13px; flex:1;">${d.cv_file_name}</span>
                            <button type="button" class="btn-icon view" onclick="API.recruitment.openCv(${d.id}, '${(d.cv_file_name).replace(/'/g, "\\'")}')" title="Abrir"><i class="codicon codicon-eye"></i></button>
                            <button type="button" class="btn-icon delete" onclick="MODULES.recruitment.removeCv(${d.id})" title="Remover"><i class="codicon codicon-trash"></i></button>
                        </div>
                    ` : ''}
                </div>

                <div class="form-group">
                    <label class="form-label">Documentos adicionais <span style="font-size:11px; color:var(--ink-500);">— diplomas, certificados, cartas de recomendação</span></label>
                    <input type="file" class="form-control" id="recDocsFile" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" multiple>
                    <div style="margin-top:8px;">
                        ${this._renderDocsList(d)}
                    </div>
                </div>
            </form>
        `;
    },

    _renderDocsList(d = {}) {
        const docs = Array.isArray(d.documents) ? d.documents : [];
        if (!docs.length) return '<div style="font-size:12px; color:var(--ink-500);">Sem documentos anexados.</div>';
        return docs.map((doc, idx) => `
            <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--ink-50); border-radius:6px; margin-bottom:4px;">
                <i class="codicon codicon-file"></i>
                <span style="flex:1; font-size:13px;">${doc.name}</span>
                <span style="font-size:11px; color:var(--ink-500);">${(doc.size / 1024).toFixed(1)} KB</span>
                <button type="button" class="btn-icon view" onclick="API.recruitment.openDocument(${d.id}, ${idx}, '${doc.name.replace(/'/g, "\\'")}')" title="Abrir"><i class="codicon codicon-eye"></i></button>
            </div>
        `).join('');
    },

    async getFormData() {
        const v = id => document.getElementById(id)?.value;
        const data = {
            position_title: v('recPosition'),
            candidate_name: v('recName'),
            candidate_email: v('recEmail'),
            candidate_phone: v('recPhone') || null,
            notes: v('recNotes') || null
        };
        const status = document.getElementById('recStatus')?.value;
        if (status) data.status = status;

        if (!data.position_title || !data.candidate_name || !data.candidate_email) {
            UI.showToast('Preencha cargo, nome e email', 'error');
            return null;
        }

        // CV
        const cvInput = document.getElementById('recCvFile');
        if (cvInput?.files?.[0]) {
            const f = cvInput.files[0];
            if (f.size > 10 * 1024 * 1024) {
                UI.showToast('CV excede 10MB', 'error');
                return null;
            }
            const obj = await API.fileToObject(f);
            data.cv_file_name = obj.name;
            data.cv_file_data = obj.data;
            data.cv_mime_type = obj.mime;
        }

        // Documentos extras
        const docsInput = document.getElementById('recDocsFile');
        if (docsInput?.files?.length) {
            const docs = [];
            for (const f of docsInput.files) {
                if (f.size > 5 * 1024 * 1024) {
                    UI.showToast(`"${f.name}" excede 5MB - ignorado`, 'warning');
                    continue;
                }
                docs.push(await API.fileToObject(f));
            }
            if (docs.length) data.documents = docs;
        }

        return data;
    },

    async submit() {
        const data = await this.getFormData();
        if (!data) return;
        // Mapeamento legacy: positionTitle, candidateName, etc.
        const payload = {
            positionTitle: data.position_title,
            candidateName: data.candidate_name,
            candidateEmail: data.candidate_email,
            candidatePhone: data.candidate_phone,
            notes: data.notes,
            cv_file_name: data.cv_file_name,
            cv_file_data: data.cv_file_data,
            cv_mime_type: data.cv_mime_type,
            documents: data.documents
        };
        try {
            UI.showLoading();
            await API.recruitment.create(payload);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Candidatura criada', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async update(id) {
        const data = await this.getFormData();
        if (!data) return;
        try {
            UI.showLoading();
            await API.recruitment.update(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Atualizado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async removeCv(id) {
        if (!confirm('Remover o CV anexado?')) return;
        try {
            await API.recruitment.update(id, { cv_file_name: null, cv_file_data: null, cv_mime_type: null });
            UI.closeModal();
            UI.showToast('CV removido', 'success');
            this.loadData();
        } catch (e) {
            UI.showToast(e.message, 'error');
        }
    },

    async showDetails(id) {
        try {
            const r = await API.recruitment.getById(id);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const fmt = v => v || '-';
            const sLabel = this.STATUS[r.status] || { label: r.status, color: '#666', bg: '#eee' };

            const docsHtml = (r.documents || []).map(d => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--ink-50); border-radius:6px; margin-bottom:4px;">
                    <i class="codicon codicon-file"></i>
                    <span style="flex:1; font-size:13px;">${escape(d.name)}</span>
                    <span style="font-size:11px; color:var(--ink-500);">${(d.size / 1024).toFixed(1)} KB</span>
                    <button class="btn btn-outline btn-sm" onclick="API.recruitment.openDocument(${r.id}, ${d.idx}, '${escape(d.name).replace(/'/g, "\\'")}')"><i class="codicon codicon-eye"></i> Abrir</button>
                </div>
            `).join('');

            const content = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 20px; font-size:14px; margin-bottom:14px;">
                    <div><strong>Nome:</strong> ${escape(r.candidate_name)}</div>
                    <div><strong>Estado:</strong> <span class="badge" style="background:${sLabel.bg}; color:${sLabel.color};">${sLabel.label}</span></div>
                    <div><strong>Email:</strong> ${escape(r.candidate_email)}</div>
                    <div><strong>Telefone:</strong> ${fmt(r.candidate_phone)}</div>
                    <div><strong>Cargo:</strong> ${escape(r.position_title)}</div>
                    <div><strong>Candidatura:</strong> ${r.applied_date ? new Date(r.applied_date).toLocaleDateString('pt-PT') : '-'}</div>
                </div>
                ${r.notes ? `<hr><h4 style="margin-bottom:6px;">Notas</h4><p>${escape(r.notes)}</p>` : ''}
                <hr>
                <h4 style="margin-bottom:8px;">Anexos</h4>
                ${r.cv_file_name ? `
                    <div style="display:flex; align-items:center; gap:8px; padding:10px; background:var(--brand-50); border-radius:6px; margin-bottom:8px;">
                        <i class="codicon codicon-file-text" style="color:var(--brand-600); font-size:20px;"></i>
                        <div style="flex:1;">
                            <div style="font-weight:500;">${escape(r.cv_file_name)}</div>
                            <div style="font-size:11px; color:var(--ink-500);">CV / Currículo</div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="API.recruitment.openCv(${r.id}, '${escape(r.cv_file_name).replace(/'/g, "\\'")}')"><i class="codicon codicon-eye"></i> Abrir CV</button>
                    </div>
                ` : '<p style="color:var(--ink-500); font-size:13px;">Sem CV anexado.</p>'}
                ${docsHtml ? `<div style="margin-top:8px;"><strong style="font-size:13px;">Documentos adicionais:</strong>${docsHtml}</div>` : ''}
            `;
            UI.createModal(r.candidate_name, content, `<button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>`);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    confirmDelete(id, name) {
        UI.confirm(`Eliminar candidatura de "${name}"?`, async () => {
            try {
                await API.recruitment.delete(id);
                UI.showToast('Eliminada', 'success');
                this.loadData();
            } catch (e) {
                UI.showToast(e.message, 'error');
            }
        });
    }
};
