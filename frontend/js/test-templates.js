// Modulo: Banco de Testes (admin pode criar/editar templates)

MODULES.testTemplates = {
    items: [],
    currentQuestions: [],
    currentType: 'vf',

    async load() {
        const c = document.getElementById('testTemplatesModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Banco de Testes</h2>
                    <button class="btn btn-primary btn-sm" onclick="MODULES.testTemplates.showCreateForm()">
                        <i class="codicon codicon-add"></i> Criar Novo Teste
                    </button>
                </div>
                <div class="card-body">
                    <p style="color:var(--ink-600); margin-bottom:14px; font-size:14px;">
                        <i class="codicon codicon-info"></i>
                        Estes são os testes disponíveis para aplicar em entrevistas. Os <strong>built-in</strong> não podem ser eliminados.
                    </p>
                    <div id="testTemplatesList"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            this.items = await API.testTemplates.getAll();
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar testes', 'error');
        }
    },

    render() {
        const c = document.getElementById('testTemplatesList');
        if (!this.items.length) {
            c.innerHTML = `<div class="grid-empty"><i class="codicon codicon-checklist"></i><p>Sem testes ainda. Clique em "Criar Novo Teste".</p></div>`;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        const rows = this.items.map(t => `
            <tr style="cursor:pointer;" onclick="MODULES.testTemplates.showDetails(${t.id})">
                <td><strong>${escape(t.title)}</strong>${t.description ? `<div style="font-size:11px; color:var(--ink-500);">${escape(t.description)}</div>` : ''}</td>
                <td><code style="font-size:12px; color:var(--ink-700);">${escape(t.code)}</code></td>
                <td><span class="badge badge-${t.type === 'vf' ? 'info' : 'brand'}">${t.type === 'vf' ? 'V/F' : 'Múltipla'}</span></td>
                <td style="text-align:center;">${t.questions_count}</td>
                <td>${t.is_builtin ? '<span class="badge badge-secondary"><i class="codicon codicon-lock"></i> Built-in</span>' : '<span class="badge badge-brand">Personalizado</span>'}</td>
                <td class="actions" onclick="event.stopPropagation();">
                    <button class="btn-icon view" onclick="MODULES.testTemplates.showDetails(${t.id})" title="Ver"><i class="codicon codicon-eye"></i></button>
                    <button class="btn-icon edit" onclick="MODULES.testTemplates.showEditForm(${t.id})" title="Editar"><i class="codicon codicon-edit"></i></button>
                    ${!t.is_builtin ? `<button class="btn-icon delete" onclick="MODULES.testTemplates.confirmDelete(${t.id}, '${escape(t.title).replace(/'/g, '&#39;')}')" title="Eliminar"><i class="codicon codicon-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');

        c.innerHTML = `
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>Título</th><th>Código</th><th>Tipo</th><th>Perguntas</th><th>Origem</th><th>Ações</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    showCreateForm() {
        this.currentQuestions = [];
        this.currentType = 'vf';
        const content = this.getFormHTML();
        UI.createModal('Criar Novo Teste', content, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MODULES.testTemplates.submit()">Guardar Teste</button>
        `);
    },

    async showEditForm(id) {
        try {
            const t = await API.testTemplates.getById(id);
            this.currentQuestions = Array.isArray(t.questions) ? t.questions : (typeof t.questions === 'string' ? JSON.parse(t.questions) : []);
            this.currentType = t.type;
            const content = this.getFormHTML(t);
            UI.createModal(`Editar: ${t.title}`, content, `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="MODULES.testTemplates.submitUpdate(${id}, ${t.is_builtin ? 'true' : 'false'})">Atualizar</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    getFormHTML(d = {}) {
        const sel = (v, c) => v === c ? 'selected' : '';
        const isBuiltin = !!d.is_builtin;
        return `
            <form id="tplForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input type="text" class="form-control" id="tplTitle" value="${(d.title || '').replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Código (slug)</label>
                        <input type="text" class="form-control" id="tplCode" value="${d.code || ''}" placeholder="ex: vendas_basico" ${isBuiltin ? 'disabled' : ''}>
                        <small style="color:var(--ink-500); font-size:11px;">Identificador único (gerado automaticamente se vazio)</small>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Descrição</label>
                    <textarea class="form-control" id="tplDescription" rows="2">${d.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo *</label>
                    <select class="form-control" id="tplType" onchange="MODULES.testTemplates.changeType(this.value)" ${isBuiltin ? 'disabled' : ''}>
                        <option value="vf" ${sel('vf', d.type || 'vf')}>Verdadeiro / Falso</option>
                        <option value="mc" ${sel('mc', d.type)}>Múltipla Escolha</option>
                    </select>
                </div>

                <hr>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:15px;">Perguntas</h3>
                    ${isBuiltin ? '' : `<button type="button" class="btn btn-outline btn-sm" onclick="MODULES.testTemplates.addQuestion()"><i class="codicon codicon-add"></i> Adicionar Pergunta</button>`}
                </div>
                ${isBuiltin ? '<div class="alert alert-info" style="font-size:12px;"><i class="codicon codicon-lock"></i> Built-in: as perguntas não podem ser editadas (só título e descrição). Crie uma versão personalizada se precisar de alterações.</div>' : ''}
                <div id="tplQuestions">
                    ${this._renderQuestions(isBuiltin)}
                </div>
            </form>
        `;
    },

    _renderQuestions(readonly = false) {
        if (!this.currentQuestions.length) {
            return '<div style="text-align:center; padding:20px; color:var(--ink-500); border:2px dashed var(--ink-200); border-radius:8px;">Sem perguntas. Clique em "Adicionar Pergunta".</div>';
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        return this.currentQuestions.map((q, idx) => {
            if (this.currentType === 'vf') {
                return `
                    <div style="padding:12px; border:1px solid var(--ink-200); border-radius:8px; margin-bottom:8px;">
                        <div style="display:flex; gap:8px; align-items:flex-start; margin-bottom:8px;">
                            <strong style="color:var(--brand-700); padding-top:6px;">${idx + 1}.</strong>
                            <input type="text" class="form-control" placeholder="Texto da pergunta..." value="${escape(q.q)}" oninput="MODULES.testTemplates.setQ(${idx}, this.value)" ${readonly ? 'readonly' : ''}>
                            ${readonly ? '' : `<button type="button" class="btn-icon delete" onclick="MODULES.testTemplates.removeQ(${idx})" title="Remover"><i class="codicon codicon-trash"></i></button>`}
                        </div>
                        <div style="display:flex; gap:14px; padding-left:22px;">
                            <label style="cursor:pointer;"><input type="radio" name="q${idx}c" value="V" ${q.correct === 'V' ? 'checked' : ''} onchange="MODULES.testTemplates.setCorrect(${idx}, 'V')" ${readonly ? 'disabled' : ''}> Verdadeiro</label>
                            <label style="cursor:pointer;"><input type="radio" name="q${idx}c" value="F" ${q.correct === 'F' ? 'checked' : ''} onchange="MODULES.testTemplates.setCorrect(${idx}, 'F')" ${readonly ? 'disabled' : ''}> Falso</label>
                        </div>
                    </div>
                `;
            }
            const opts = (q.options || []).map((o, oi) => `
                <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                    <input type="radio" name="q${idx}c" value="${oi}" ${parseInt(q.correct) === oi ? 'checked' : ''} onchange="MODULES.testTemplates.setCorrect(${idx}, ${oi})" ${readonly ? 'disabled' : ''}>
                    <input type="text" class="form-control" style="flex:1; padding:6px 10px;" value="${escape(o)}" oninput="MODULES.testTemplates.setOpt(${idx}, ${oi}, this.value)" ${readonly ? 'readonly' : ''} placeholder="Opção ${String.fromCharCode(65 + oi)}">
                    ${readonly ? '' : `<button type="button" class="btn-icon delete" onclick="MODULES.testTemplates.removeOpt(${idx}, ${oi})" title="Remover opção" ${q.options.length <= 2 ? 'disabled style="opacity:0.3;"' : ''}><i class="codicon codicon-trash"></i></button>`}
                </div>
            `).join('');
            return `
                <div style="padding:12px; border:1px solid var(--ink-200); border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; gap:8px; align-items:flex-start; margin-bottom:8px;">
                        <strong style="color:var(--brand-700); padding-top:6px;">${idx + 1}.</strong>
                        <input type="text" class="form-control" placeholder="Texto da pergunta..." value="${escape(q.q)}" oninput="MODULES.testTemplates.setQ(${idx}, this.value)" ${readonly ? 'readonly' : ''}>
                        ${readonly ? '' : `<button type="button" class="btn-icon delete" onclick="MODULES.testTemplates.removeQ(${idx})" title="Remover"><i class="codicon codicon-trash"></i></button>`}
                    </div>
                    <div style="padding-left:22px;">
                        ${opts}
                        ${readonly ? '' : `<button type="button" class="btn btn-outline btn-sm" onclick="MODULES.testTemplates.addOpt(${idx})" style="margin-top:6px;"><i class="codicon codicon-add"></i> Adicionar opção</button>`}
                    </div>
                    <p style="font-size:11px; color:var(--ink-500); margin-top:6px; padding-left:22px;">⚙ Selecione a opção com a resposta CORRETA</p>
                </div>
            `;
        }).join('');
    },

    _refreshQuestions() {
        const el = document.getElementById('tplQuestions');
        if (el) el.innerHTML = this._renderQuestions(false);
    },

    changeType(newType) {
        if (newType === this.currentType) return;
        if (this.currentQuestions.length > 0) {
            if (!confirm('Mudar o tipo vai limpar as perguntas atuais. Continuar?')) {
                document.getElementById('tplType').value = this.currentType;
                return;
            }
            this.currentQuestions = [];
        }
        this.currentType = newType;
        this._refreshQuestions();
    },

    addQuestion() {
        if (this.currentType === 'vf') {
            this.currentQuestions.push({ q: '', correct: 'V' });
        } else {
            this.currentQuestions.push({ q: '', options: ['', ''], correct: 0 });
        }
        this._refreshQuestions();
    },

    removeQ(idx) {
        this.currentQuestions.splice(idx, 1);
        this._refreshQuestions();
    },

    setQ(idx, value) {
        if (this.currentQuestions[idx]) this.currentQuestions[idx].q = value;
    },

    setCorrect(idx, value) {
        if (this.currentQuestions[idx]) this.currentQuestions[idx].correct = value;
    },

    setOpt(idx, oi, value) {
        if (this.currentQuestions[idx] && this.currentQuestions[idx].options) {
            this.currentQuestions[idx].options[oi] = value;
        }
    },

    addOpt(idx) {
        const q = this.currentQuestions[idx];
        if (!q || !q.options) return;
        if (q.options.length >= 6) {
            UI.showToast('Máximo 6 opções por pergunta', 'warning');
            return;
        }
        q.options.push('');
        this._refreshQuestions();
    },

    removeOpt(idx, oi) {
        const q = this.currentQuestions[idx];
        if (!q || !q.options || q.options.length <= 2) return;
        q.options.splice(oi, 1);
        if (q.correct >= q.options.length) q.correct = q.options.length - 1;
        this._refreshQuestions();
    },

    _getFormData(includeQuestions = true) {
        const data = {
            title: document.getElementById('tplTitle')?.value.trim(),
            code: document.getElementById('tplCode')?.value.trim() || undefined,
            description: document.getElementById('tplDescription')?.value.trim(),
            type: document.getElementById('tplType')?.value
        };
        if (includeQuestions) {
            // Validar
            for (let i = 0; i < this.currentQuestions.length; i++) {
                const q = this.currentQuestions[i];
                if (!q.q || !q.q.trim()) {
                    UI.showToast(`Pergunta ${i + 1}: falta o texto`, 'error');
                    return null;
                }
                if (this.currentType === 'mc') {
                    if (!q.options || q.options.length < 2) {
                        UI.showToast(`Pergunta ${i + 1}: precisa de pelo menos 2 opções`, 'error');
                        return null;
                    }
                    if (q.options.some(o => !o || !o.trim())) {
                        UI.showToast(`Pergunta ${i + 1}: opção vazia`, 'error');
                        return null;
                    }
                }
            }
            data.questions = this.currentQuestions;
        }
        return data;
    },

    async submit() {
        const data = this._getFormData(true);
        if (!data) return;
        if (!data.title) { UI.showToast('Título obrigatório', 'error'); return; }
        if (!this.currentQuestions.length) { UI.showToast('Adicione pelo menos 1 pergunta', 'error'); return; }
        try {
            UI.showLoading();
            await API.testTemplates.create(data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Teste criado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async submitUpdate(id, isBuiltin) {
        const data = this._getFormData(!isBuiltin);
        if (!data) return;
        if (!data.title) { UI.showToast('Título obrigatório', 'error'); return; }
        try {
            UI.showLoading();
            await API.testTemplates.update(id, data);
            UI.hideLoading();
            UI.closeModal();
            UI.showToast('Teste atualizado', 'success');
            this.loadData();
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message, 'error');
        }
    },

    async showDetails(id) {
        try {
            const t = await API.testTemplates.getById(id);
            const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const questions = Array.isArray(t.questions) ? t.questions : (typeof t.questions === 'string' ? JSON.parse(t.questions) : []);

            const qsHtml = questions.map((q, idx) => {
                if (t.type === 'vf') {
                    return `<div style="padding:10px; background:var(--ink-50); border-radius:6px; margin-bottom:6px;">
                        <strong>${idx + 1}.</strong> ${escape(q.q)}
                        <div style="margin-top:4px;"><span class="badge badge-success">✓ ${q.correct === 'V' ? 'Verdadeiro' : 'Falso'}</span></div>
                    </div>`;
                }
                return `<div style="padding:10px; background:var(--ink-50); border-radius:6px; margin-bottom:6px;">
                    <strong>${idx + 1}.</strong> ${escape(q.q)}
                    <ul style="margin:6px 0 0 22px; padding:0;">
                        ${(q.options || []).map((o, oi) => `<li style="${parseInt(q.correct) === oi ? 'color:#10b981; font-weight:600;' : 'color:var(--ink-700);'}">${parseInt(q.correct) === oi ? '✓ ' : ''}${String.fromCharCode(65 + oi)}) ${escape(o)}</li>`).join('')}
                    </ul>
                </div>`;
            }).join('');

            const content = `
                <p><strong>Código:</strong> <code>${escape(t.code)}</code></p>
                <p><strong>Tipo:</strong> ${t.type === 'vf' ? 'Verdadeiro / Falso' : 'Múltipla Escolha'}</p>
                <p><strong>Total perguntas:</strong> ${questions.length}</p>
                ${t.description ? `<p>${escape(t.description)}</p>` : ''}
                <hr>
                <h4 style="margin-bottom:8px;">Perguntas e Respostas Corretas</h4>
                <div style="max-height: 60vh; overflow-y:auto;">${qsHtml}</div>
            `;
            UI.createModal(t.title, content, `
                <button class="btn btn-outline" onclick="UI.closeModal()">Fechar</button>
                <button class="btn btn-primary btn-sm" onclick="MODULES.testTemplates.showEditForm(${t.id})"><i class="codicon codicon-edit"></i> Editar</button>
            `);
        } catch (e) {
            UI.showToast('Erro ao carregar', 'error');
        }
    },

    confirmDelete(id, title) {
        UI.confirm(`Eliminar permanentemente o teste "${title}"?\n\nEntrevistas que usaram este teste mantêm o registo do score, mas o template fica indisponível.`, async () => {
            try {
                await API.testTemplates.delete(id);
                UI.showToast('Eliminado', 'success');
                this.loadData();
            } catch (e) {
                UI.showToast(e.message, 'error');
            }
        });
    }
};
