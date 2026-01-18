// Analytics JavaScript - Conectado à API Real
document.addEventListener('DOMContentLoaded', () => {
    // ✅ SCROLL AO TOPO
    const pageContent = document.querySelector('.eio-page-content');
    if (pageContent) {
        pageContent.scrollTo({ top: 0, behavior: 'auto' });
    }

    fetchRealAnalyticsData();
    initializeNavigation();
});

async function fetchRealAnalyticsData() {
    const token = localStorage.getItem('eio_token') || localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch('https://eio-system.vercel.app/api/v1/analytics/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateKPIs(data.stats);
                renderActivityTable(data.recent_activity);
                initializeCharts(data.stats);
            }
        }
    } catch (error) {
        console.error('Erro ao buscar analytics:', error);
    }
}

function updateKPIs(stats) {
    document.getElementById('totalFollows').textContent = stats.follows || 0;
    document.getElementById('totalLikes').textContent = stats.likes || 0;
    document.getElementById('totalComments').textContent = stats.comments || 0;
    document.getElementById('totalUnfollows').textContent = stats.unfollows || 0;

    // Calcular total de ações
    const total = (stats.follows || 0) + (stats.likes || 0) + (stats.comments || 0) + (stats.unfollows || 0);
    document.getElementById('totalActions').textContent = total;
}

function renderActivityTable(logs) {
    const tableBody = document.getElementById('actionsTableBody');
    if (!tableBody || !logs || logs.length === 0) {
        const noData = document.getElementById('noActionsData');
        if (noData) noData.style.display = 'block';
        return;
    }

    tableBody.innerHTML = logs.map(log => `
        <tr>
            <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
            <td><span class="eio-badge">${log.action || 'ação'}</span></td>
            <td>${log.message.split('@')[1] || '---'}</td>
            <td><span class="status-pill status-active">Sucesso</span></td>
        </tr>
    `).join('');
}

function initializeCharts(stats) {
    // Growth Chart (Dinamizado com os totais atuais)
    const ctx = document.getElementById('growthChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Início', 'Hoje'],
                datasets: [{
                    label: 'Ações Acumuladas',
                    data: [0, (stats.follows || 0) + (stats.likes || 0)],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Engagement Pie com dados reais
    const pieCtx = document.getElementById('engagementPieChart');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Follows', 'Curtidas', 'Unfollows'],
                datasets: [{
                    data: [stats.follows || 0, stats.likes || 0, stats.unfollows || 0],
                    backgroundColor: ['#2196F3', '#4CAF50', '#FF9800']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.eio-nav-item[data-page]');
    const sections = document.querySelectorAll('.eio-content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                navItems.forEach(n => n.classList.remove('eio-nav-item-active'));
                sections.forEach(s => s.classList.remove('eio-content-active'));
                item.classList.add('eio-nav-item-active');
                const target = document.querySelector(`[data-section="${page}"]`);
                if (target) target.classList.add('eio-content-active');
            }
        });
    });
}
