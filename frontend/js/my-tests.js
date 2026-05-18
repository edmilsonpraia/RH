// Modulo do user-dashboard: Os Meus Testes (testes atribuidos ao colaborador autenticado)

const MY_TESTS = {
    items: [],
    currentTest: null,  // { interviewId, type, questions, answers }

    async load() {
        const c = document.getElementById('myTestsModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header"><h2>Os Meus Testes</h2></div>
                <div class="card-body">
                    <p style="color:var(--ink-600); margin-bottom:14px; font-size:14px;">
                        <i class="codicon codicon-info"></i>
                        Aqui aparecem os testes que te foram atribuídos. Clica em "Fazer Teste" para começar.
                    </p>
                    <div id="myTestsList"></div>
                </div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            UI.showLoading();
            this.items = await API.interviews.myPending();
            UI.hideLoading();
            this.render();
        } catch (e) {
            UI.hideLoading();
            UI.showToast('Erro ao carregar testes', 'error');
        }
    },

    render() {
        const c = document.getElementById('myTestsList');
        if (!this.items.length) {
            c.innerHTML = `
                <div class="grid-empty">
                    <i class="codicon codicon-check"></i>
                    <p>Não tens testes pendentes neste momento.</p>
                    <p style="font-size:13px; color:var(--ink-500); margin-top:8px;">
                        Quando o RH te atribuir um teste, vais vê-lo aqui.
                    </p>
                </div>
            `;
            return;
        }
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        c.innerHTML = this.items.map(t => `
            <div style="background:#fff; border:1px solid var(--ink-200); border-radius:8px; padding:16px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px;">
                    <div style="flex:1;">
                        <h3 style="margin:0 0 4px; font-size:16px;">${escape(t.test_title || 'Teste')}</h3>
                        ${t.position_title ? `<div style="font-size:13px; color:var(--ink-600);">Para: <strong>${escape(t.position_title)}</strong></div>` : ''}
                        ${t.test_description ? `<p style="font-size:13px; color:var(--ink-600); margin:6px 0 0;">${escape(t.test_description)}</p>` : ''}
                        <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;">
                            <span class="badge badge-${t.test_type === 'vf' ? 'info' : 'brand'}">${t.test_type === 'vf' ? 'V/F' : 'Múltipla escolha'}</span>
                            <span class="badge badge-secondary">${t.questions_count} perguntas</span>
                            ${t.test_started_at ? '<span class="badge badge-warning">Em curso</span>' : '<span class="badge badge-success">Pendente</span>'}
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="MY_TESTS.startTest(${t.interview_id})">
                        <i class="codicon codicon-play"></i> Fazer Teste
                    </button>
                </div>
            </div>
        `).join('');
    },

    async startTest(interviewId) {
        try {
            UI.showLoading();
            const data = await API.interviews.getMyTest(interviewId);
            UI.hideLoading();

            const t = data.test;
            this.currentTest = {
                interviewId,
                type: t.type,
                questions: t.questions,
                answers: new Array(t.questions.length).fill(null)
            };
            this.renderTest(data);
        } catch (e) {
            UI.hideLoading();
            UI.showToast(e.message || 'Erro ao abrir teste', 'error');
        }
    },

    renderTest(data) {
        const t = data.test;
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        const qsHtml = t.questions.map((q, idx) => {
            if (t.type === 'vf') {
                return `
                    <div class="question" id="my-q-${idx}" style="padding:14px; border:1px solid var(--ink-200); border-radius:8px; margin-bottom:10px;">
                        <div style="font-size:15px; margin-bottom:10px;"><strong style="color:var(--brand-700); margin-right:6px;">${idx + 1}.</strong>${escape(q.q)}</div>
                        <div style="display:flex; gap:14px; padding-left:22px;">
                            <label style="cursor:pointer;"><input type="radio" name="myq${idx}" value="V" onchange="MY_TESTS.setAnswer(${idx}, 'V')"> Verdadeiro</label>
                            <label style="cursor:pointer;"><input type="radio" name="myq${idx}" value="F" onchange="MY_TESTS.setAnswer(${idx}, 'F')"> Falso</label>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="question" id="my-q-${idx}" style="padding:14px; border:1px solid var(--ink-200); border-radius:8px; margin-bottom:10px;">
                    <div style="font-size:15px; margin-bottom:10px;"><strong style="color:var(--brand-700); margin-right:6px;">${idx + 1}.</strong>${escape(q.q)}</div>
                    <div style="padding-left:22px; display:flex; flex-direction:column; gap:6px;">
                        ${q.options.map((opt, oi) => `
                            <label style="cursor:pointer; padding:6px 10px; border-radius:4px;">
                                <input type="radio" name="myq${idx}" value="${oi}" onchange="MY_TESTS.setAnswer(${idx}, ${oi})">
                                <strong style="margin-left:6px;">${String.fromCharCode(65 + oi)})</strong> ${escape(opt)}
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        const c = document.getElementById('myTestsModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div>
                        <h2 style="margin:0 0 2px;">${escape(t.title)}</h2>
                        <div style="font-size:13px; color:var(--ink-600);">${escape(data.candidateName)} ${data.positionTitle ? '· ' + escape(data.positionTitle) : ''}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="MY_TESTS.load()">
                        <i class="codicon codicon-arrow-left"></i> Voltar
                    </button>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <i class="codicon codicon-info"></i>
                        <span>
                            ${t.questions.length} perguntas · O teste só pode ser submetido uma vez.
                            <br><strong>Progresso:</strong> <span id="myTestProgress">0 / ${t.questions.length} respondidas</span>
                        </span>
                    </div>
                    ${qsHtml}
                    <div style="margin-top:18px; display:flex; gap:10px; justify-content:flex-end;">
                        <button class="btn btn-outline" onclick="MY_TESTS.load()">Cancelar</button>
                        <button class="btn btn-primary" onclick="MY_TESTS.submit()" id="myTestSubmitBtn">
                            <i class="codicon codicon-check"></i> Submeter Teste
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    setAnswer(idx, value) {
        if (!this.currentTest) return;
        this.currentTest.answers[idx] = value;
        const answered = this.currentTest.answers.filter(a => a !== null).length;
        const total = this.currentTest.answers.length;
        const el = document.getElementById('myTestProgress');
        if (el) el.textContent = `${answered} / ${total} respondidas`;
    },

    async submit() {
        const t = this.currentTest;
        if (!t) return;
        const answered = t.answers.filter(a => a !== null).length;
        const total = t.answers.length;
        if (answered === 0) {
            UI.showToast('Responde pelo menos a uma pergunta', 'error');
            return;
        }
        if (answered < total) {
            if (!confirm(`Apenas respondeste ${answered} de ${total}. As não respondidas contam como erradas. Submeter mesmo assim?`)) return;
        }

        const btn = document.getElementById('myTestSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="codicon codicon-loading codicon-modifier-spin"></i> A submeter…';
        }

        try {
            const result = await API.interviews.submitMyTest(t.interviewId, t.answers);
            this.renderResult(result);
            this.currentTest = null;
        } catch (e) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="codicon codicon-check"></i> Submeter Teste';
            }
            UI.showToast(e.message || 'Erro ao submeter', 'error');
        }
    },

    renderResult(r) {
        const color = r.score >= 70 ? '#10b981' : r.score >= 50 ? '#f59e0b' : '#dc2626';
        const message = r.score >= 70
            ? 'Excelente desempenho! 🎉'
            : r.score >= 50
            ? 'Bom desempenho.'
            : 'Obrigado pela participação.';

        const c = document.getElementById('myTestsModule');
        c.innerHTML = `
            <div class="card">
                <div class="card-body" style="text-align:center; padding:50px 28px;">
                    <i class="codicon codicon-check" style="font-size:64px; color:${color};"></i>
                    <h2 style="margin:14px 0 4px;">Teste submetido com sucesso</h2>
                    <p style="color:var(--ink-600);">${message}</p>
                    <div style="font-size:56px; font-weight:800; margin:14px 0 4px; color:${color};">${r.score}%</div>
                    <div style="font-size:13px; color:var(--ink-500); text-transform:uppercase; letter-spacing:0.5px;">
                        ${r.correct} de ${r.total} respostas corretas
                    </div>
                    <p style="margin-top:24px; color:var(--ink-600); font-size:14px;">
                        A equipa de Capital Humano foi notificada do resultado.
                    </p>
                    <button class="btn btn-outline" style="margin-top:14px;" onclick="MY_TESTS.load()">
                        <i class="codicon codicon-arrow-left"></i> Voltar aos meus testes
                    </button>
                </div>
            </div>
        `;
    }
};
