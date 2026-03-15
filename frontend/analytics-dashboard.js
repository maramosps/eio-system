// ═══════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD - DADOS REAIS VIA API (action_logs)
// ═══════════════════════════════════════════════════════════

const API_BASE = 'https://eio-system.vercel.app';
let actionsHistory = [];
let leadsData = [];
let actionsChart = null;

document.addEventListener('DOMContentLoaded', () => {
    const pageContent = document.querySelector('.eio-page-content');
    if (pageContent) pageContent.scrollTo({ top: 0, behavior: 'auto' });

    setupNavigation();
    setupPeriodFilter();
    setupExportButtons();
    fetchDashboardData();
});

// ═══════════════════════════════════════════════════════════
// FETCH REAL — API /analytics/dashboard (action_logs)
// ═══════════════════════════════════════════════════════════
async function fetchDashboardData() {
    const token = localStorage.getItem('eio_token') || localStorage.getItem('accessToken');
    if (!token) {
        console.warn('[Analytics] Sem token de autenticação');
        showSyncWarning('Faça login para ver dados');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/analytics/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[Analytics] Erro HTTP:', response.status);
            showSyncWarning('Erro ao buscar dados');
            return;
        }

        const data = await response.json();
        if (data.success) {
            actionsHistory = data.recent_activity || [];
            updateKPIs(data.stats);
            updateActionsTable(actionsHistory);
            updateActionsByType(actionsHistory);
            updateActionsByHour(actionsHistory);
            updateChart(actionsHistory);
            showSyncConnected();
            console.log('[Analytics] ✅ Dados carregados:', data.stats);
        } else {
            console.warn('[Analytics] API retornou success: false');
            showSyncWarning('Dados indisponíveis');
        }
    } catch (error) {
        console.error('[Analytics] Erro ao buscar dados:', error);
        showSyncWarning('Erro de conexão');
    }
}

function showSyncConnected() {
    const syncStatus = document.querySelector('.eio-sync-status');
    if (syncStatus) {
        syncStatus.innerHTML = '<span class="eio-sync-dot"></span><span>Sincronizado com API</span>';
        syncStatus.style.background = 'rgba(37, 211, 102, 0.1)';
        syncStatus.style.borderColor = 'rgba(37, 211, 102, 0.2)';
        syncStatus.style.color = '#25d366';
    }
}

function showSyncWarning(msg) {
    const syncStatus = document.querySelector('.eio-sync-status');
    if (syncStatus) {
        syncStatus.innerHTML = `<span class="eio-sync-dot" style="background: #FFC107;"></span><span>${msg}</span>`;
        syncStatus.style.background = 'rgba(255, 193, 7, 0.1)';
        syncStatus.style.borderColor = 'rgba(255, 193, 7, 0.2)';
        syncStatus.style.color = '#FFC107';
    }
}

// ═══════════════════════════════════════════════════════════
// KPIs
// ═══════════════════════════════════════════════════════════
function updateKPIs(stats) {
    const s = stats || {};
    document.getElementById('totalFollows').textContent = formatNumber(s.follows || 0);
    document.getElementById('totalLikes').textContent = formatNumber(s.likes || 0);
    document.getElementById('totalComments').textContent = formatNumber(s.comments || 0);
    document.getElementById('totalUnfollows').textContent = formatNumber(s.unfollows || 0);

    const total = (s.follows || 0) + (s.likes || 0) + (s.comments || 0) + (s.unfollows || 0);
    document.getElementById('totalActions').textContent = formatNumber(total);

    const dmsEl = document.getElementById('totalDMs');
    if (dmsEl) dmsEl.textContent = formatNumber(s.dms || 0);
    const storiesEl = document.getElementById('totalStories');
    if (storiesEl) storiesEl.textContent = formatNumber(s.stories || 0);
    const leadsEl = document.getElementById('totalLeads');
    if (leadsEl) leadsEl.textContent = formatNumber(leadsData.length);
}

// ═══════════════════════════════════════════════════════════
// TABELA DE AÇÕES
// ═══════════════════════════════════════════════════════════
function updateActionsTable(actions) {
    const tbody = document.getElementById('actionsTableBody');
    const noData = document.getElementById('noActionsData');
    const table = document.getElementById('actionsTable');

    if (!actions || actions.length === 0) {
        if (tbody) tbody.innerHTML = '';
        if (table) table.style.display = 'none';
        if (noData) noData.style.display = 'block';
        return;
    }

    if (table) table.style.display = 'table';
    if (noData) noData.style.display = 'none';

    const recentActions = actions.slice(0, 50);

    tbody.innerHTML = recentActions.map(a => {
        const date = new Date(a.created_at);
        const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const actionType = a.action || 'ação';
        const target = a.target || '---';
        const actionEmoji = getActionEmoji(actionType);
        const isSuccess = a.success !== false;
        const statusClass = isSuccess ? 'eio-status-success' : 'eio-status-error';
        const statusText = isSuccess ? '✅ Sucesso' : '❌ Falhou';

        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${actionEmoji} ${translateAction(actionType)}</td>
                <td>@${target}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// AÇÕES POR TIPO
// ═══════════════════════════════════════════════════════════
function updateActionsByType(actions) {
    const container = document.getElementById('actionsByType');
    if (!container) return;
    const typeCounts = {};

    (actions || []).forEach(a => {
        const type = a.action || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = actions.length || 1;
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

    if (sortedTypes.length === 0) {
        container.innerHTML = '<div class="eio-no-data"><div class="eio-no-data-text">Sem dados</div></div>';
        return;
    }

    container.innerHTML = sortedTypes.map(([type, count]) => {
        const percent = Math.round((count / total) * 100);
        const color = getActionColor(type);
        return `
            <div class="eio-stat-item">
                <span class="eio-stat-label">${getActionEmoji(type)} ${translateAction(type)}</span>
                <div class="eio-stat-bar">
                    <div class="eio-stat-fill" style="width: ${percent}%; background: ${color};"></div>
                </div>
                <span class="eio-stat-value">${count} (${percent}%)</span>
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// AÇÕES POR HORÁRIO
// ═══════════════════════════════════════════════════════════
function updateActionsByHour(actions) {
    const container = document.getElementById('actionsByHour');
    if (!container) return;
    const hourCounts = {};

    (actions || []).forEach(a => {
        const date = new Date(a.created_at);
        const hour = date.getHours();
        const period = hour < 6 ? 'Madrugada (00-06)' :
            hour < 12 ? 'Manhã (06-12)' :
                hour < 18 ? 'Tarde (12-18)' : 'Noite (18-24)';
        hourCounts[period] = (hourCounts[period] || 0) + 1;
    });

    const total = actions.length || 1;
    const periods = ['Manhã (06-12)', 'Tarde (12-18)', 'Noite (18-24)', 'Madrugada (00-06)'];

    container.innerHTML = periods.map(period => {
        const count = hourCounts[period] || 0;
        const percent = Math.round((count / total) * 100);
        return `
            <div class="eio-stat-item">
                <span class="eio-stat-label">${period}</span>
                <div class="eio-stat-bar">
                    <div class="eio-stat-fill" style="width: ${percent}%; background: #2196F3;"></div>
                </div>
                <span class="eio-stat-value">${count} (${percent}%)</span>
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// GRÁFICO
// ═══════════════════════════════════════════════════════════
function updateChart(actions) {
    const wrapper = document.getElementById('actionsChartWrapper');
    const noData = document.getElementById('noChartData');

    if (!actions || actions.length === 0) {
        if (wrapper) wrapper.style.display = 'none';
        if (noData) noData.style.display = 'block';
        return;
    }

    if (wrapper) wrapper.style.display = 'block';
    if (noData) noData.style.display = 'none';

    const dailyCounts = {};
    actions.forEach(a => {
        const date = new Date(a.created_at);
        // Use local timezone for grouping (sv-SE produces YYYY-MM-DD format)
        const dayKey = date.toLocaleDateString('sv-SE');
        dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
    });

    const labels = Object.keys(dailyCounts).sort();
    const data = labels.map(day => dailyCounts[day]);

    const ctx = document.getElementById('actionsChart')?.getContext('2d');
    if (!ctx) return;

    if (actionsChart) actionsChart.destroy();

    actionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(d => {
                const date = new Date(d);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }),
            datasets: [{
                label: 'Ações',
                data: data,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getActionEmoji(type) {
    const emojis = {
        follow: '➕', unfollow: '➖', like: '❤️', like_feed_2: '❤️',
        comment: '💬', dm: '✉️', dm_welcome: '✉️', story: '👁️', story_interact: '👁️'
    };
    return emojis[type] || '⚡';
}

function getActionColor(type) {
    const colors = {
        follow: '#2196F3', unfollow: '#FF9800', like: '#F44336', like_feed_2: '#F44336',
        comment: '#4CAF50', dm: '#9C27B0', dm_welcome: '#9C27B0', story: '#00BCD4', story_interact: '#00BCD4'
    };
    return colors[type] || '#2196F3';
}

function translateAction(type) {
    const translations = {
        follow: 'Seguir', unfollow: 'Deixar de Seguir', like: 'Curtir', like_feed_2: 'Curtir Post',
        comment: 'Comentar', dm: 'Enviar DM', dm_welcome: 'DM Boas-vindas', story: 'Ver Story', story_interact: 'Ver Story'
    };
    return translations[type] || type;
}

// ═══════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ═══════════════════════════════════════════════════════════
function setupNavigation() {
    document.querySelectorAll('.eio-nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            document.querySelectorAll('.eio-nav-item').forEach(l => l.classList.remove('eio-nav-item-active'));
            link.classList.add('eio-nav-item-active');

            document.querySelectorAll('.eio-content-section').forEach(s => s.classList.remove('eio-content-active'));
            const target = document.querySelector(`[data-section="${page}"]`);
            if (target) target.classList.add('eio-content-active');
        });
    });
}

function setupPeriodFilter() {
    const select = document.getElementById('periodSelect');
    if (select) select.addEventListener('change', () => fetchDashboardData());
}

function setupExportButtons() {
    document.getElementById('btnExportActions')?.addEventListener('click', () => {
        exportToCSV(actionsHistory, 'eio_actions_history.csv');
    });

    document.getElementById('btnExportLeads')?.addEventListener('click', () => {
        exportToCSV(leadsData, 'eio_leads.csv');
    });
}

function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        alert('Nenhum dado para exportar');
        return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
