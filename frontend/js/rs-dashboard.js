// Modulo: Dashboard de Recrutamento e Selecao - KPIs

MODULES.rsDashboard = {
    async load() {
        const c = document.getElementById('rsDashboardModule');
        c.innerHTML = `
            <div class="stats-grid" id="rsKpis">
                <div class="grid-empty"><i class="codicon codicon-loading codicon-modifier-spin"></i><p>A carregar KPIs...</p></div>
            </div>
            <div class="card">
                <div class="card-header"><h2>Funil de Conversão de Candidatos</h2></div>
                <div class="card-body" id="rsFunnel"></div>
            </div>
            <div class="card">
                <div class="card-header"><h2>Tempo de Aprovação dos Pedidos</h2></div>
                <div class="card-body" id="rsTimeApprove"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        try {
            const [kpis, tta] = await Promise.all([
                API.rsDashboard.kpis(),
                API.rsDashboard.timeToApprove()
            ]);
            this.renderKpis(kpis);
            this.renderFunnel(kpis.funnel || {});
            this.renderTimeToApprove(tta);
        } catch (e) {
            UI.showToast('Erro ao carregar dashboard R&S', 'error');
        }
    },

    renderKpis(k) {
        const card = (icon, color, value, label) => `
            <div class="stat-card">
                <div class="stat-icon ${color}"><i class="codicon codicon-${icon}"></i></div>
                <div class="stat-info"><h3>${value}</h3><p>${label}</p></div>
            </div>
        `;
        document.getElementById('rsKpis').innerHTML = `
            ${card('checklist', 'brand', k.active_requisitions || 0, 'Pedidos Ativos')}
            ${card('clock', 'warning', k.pending_requisitions || 0, 'Aguardam Aprovação')}
            ${card('check', 'success', k.filled_requisitions || 0, 'Vagas Preenchidas')}
            ${card('search', 'info', k.active_candidates || 0, 'Candidatos em Fluxo')}
            ${card('person-add', 'purple', k.hired_this_month || 0, 'Contratados (mês)')}
            ${card('close', 'danger', k.rejected_this_month || 0, 'Rejeitados (mês)')}
        `;
    },

    renderFunnel(f) {
        const stages = [
            { key: 'novo', label: 'Novo', color: '#0ea5e9' },
            { key: 'triagem', label: 'Triagem', color: '#6366f1' },
            { key: 'entrevista', label: 'Entrevista', color: '#8b5cf6' },
            { key: 'aprovado', label: 'Aprovado', color: '#10b981' },
            { key: 'rejeitado', label: 'Rejeitado', color: '#dc2626' }
        ];
        const total = Object.values(f).reduce((s, n) => s + n, 0) || 1;

        const bars = stages.map(s => {
            const n = f[s.key] || 0;
            const pct = ((n / total) * 100).toFixed(1);
            return `
                <div style="margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-weight:500;">${s.label}</span>
                        <span style="color:var(--ink-500);">${n} (${pct}%)</span>
                    </div>
                    <div style="background:var(--ink-100); border-radius:6px; height:24px; overflow:hidden;">
                        <div style="background:${s.color}; height:100%; width:${pct}%; transition:width 0.5s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('rsFunnel').innerHTML = total === 1 && Object.keys(f).length === 0
            ? '<p style="color:var(--ink-500);">Sem dados de candidaturas ainda.</p>'
            : bars;
    },

    renderTimeToApprove(tta) {
        const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        if (!tta.items || !tta.items.length) {
            document.getElementById('rsTimeApprove').innerHTML = '<p style="color:var(--ink-500);">Sem pedidos aprovados ainda.</p>';
            return;
        }
        const rows = tta.items.slice(0, 10).map(i => `
            <tr>
                <td><strong>${escape(i.code)}</strong></td>
                <td>${i.created_at ? new Date(i.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                <td>${i.updated_at ? new Date(i.updated_at).toLocaleDateString('pt-PT') : '-'}</td>
                <td style="text-align:right;"><strong>${i.days || 0}</strong> dias</td>
            </tr>
        `).join('');

        document.getElementById('rsTimeApprove').innerHTML = `
            <p style="margin-bottom:12px;">Tempo médio: <strong>${tta.average_days} dias</strong></p>
            <div class="grid-container">
                <table class="data-grid">
                    <thead><tr><th>Código</th><th>Criado</th><th>Aprovado</th><th style="text-align:right;">Tempo</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }
};
