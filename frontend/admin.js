/*
E.I.O Admin Panel - JavaScript
*/

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Panel iniciando...');

    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Load admin profile from localStorage immediately
    loadAdminProfile();

    // Setup navigation
    setupNavigation();

    // Setup button listeners
    setupButtonListeners();

    // Load initial data
    await loadDashboardData();
});

/**
 * Load admin profile from localStorage
 */
function loadAdminProfile() {
    const storedUser = localStorage.getItem('user');
    let user = null;

    if (storedUser) {
        try {
            user = JSON.parse(storedUser);
        } catch (e) {
            console.warn('Could not parse user data');
        }
    }

    const adminNameEl = document.getElementById('adminName');
    const adminEmailEl = document.getElementById('adminEmail');
    const adminAvatarEl = document.getElementById('adminAvatar');

    if (user && user.name) {
        if (adminNameEl) adminNameEl.textContent = user.name;
        if (adminEmailEl) adminEmailEl.textContent = user.email || '';
        if (adminAvatarEl) adminAvatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'admin'}`;
    } else {
        // Fallback for admin bypass
        if (adminNameEl) adminNameEl.textContent = 'Administrador';
        if (adminEmailEl) adminEmailEl.textContent = 'admin@eio.com';
    }
}

/**
 * Setup sidebar navigation
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.eio-nav-item');
    const sections = document.querySelectorAll('.eio-content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');

            // Update active states
            navItems.forEach(n => n.classList.remove('eio-nav-item-active'));
            sections.forEach(s => s.classList.remove('eio-content-active'));

            item.classList.add('eio-nav-item-active');

            const targetSection = document.querySelector(`[data-section="${page}"]`);
            if (targetSection) {
                targetSection.classList.add('eio-content-active');

                const titleEl = document.querySelector('.eio-page-title');
                const spanText = item.querySelector('span')?.textContent;
                if (titleEl && spanText) titleEl.textContent = spanText;

                // Load section data
                loadSectionData(page);
            }
        });
    });
}

/**
 * Setup button listeners
 */
function setupButtonListeners() {
    // Add User
    const btnAddUser = document.getElementById('btnAddUser');
    if (btnAddUser) {
        btnAddUser.addEventListener('click', addNewUser);
    }

    // Save Messages
    const btnSaveMessages = document.getElementById('btnSaveMessages');
    if (btnSaveMessages) {
        btnSaveMessages.addEventListener('click', saveAutoMessages);
    }

    // Clear Logs
    const btnClearLogs = document.getElementById('btnClearLogs');
    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', () => {
            const container = document.getElementById('logsContainer');
            if (container) container.innerHTML = '<div style="color: #666;">Logs limpos</div>';
        });
    }
}

async function loadSectionData(section) {
    switch (section) {
        case 'overview':
            await loadDashboardData();
            break;
        case 'users':
            await loadUsersTable();
            break;
        case 'subscriptions':
            await loadSubscriptionsData();
            break;
        case 'finances':
            await loadFinancesData();
            break;
        case 'logs':
            await loadLogs();
            break;
    }
}

async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        loadRecentActivity()
    ]);
    initializeCharts();
}

async function loadStats() {
    try {
        const response = await api.getAdminStats();

        if (response && response.success) {
            const stats = response.stats || {};

            updateElement('stat-total-users', (stats.totalUsers || 0).toLocaleString());
            updateElement('stat-mrr', `R$ ${(stats.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            updateElement('stat-active-subs', (stats.activeSubscriptions || 0).toLocaleString());
            updateElement('stat-total-leads', (stats.totalLeads || 0).toLocaleString());
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSubscriptionsData() {
    try {
        const response = await api.getAdminStats();

        if (response && response.success) {
            const stats = response.stats || {};
            updateElement('stat-subs-active', (stats.activeSubscriptions || 0).toLocaleString());
            updateElement('stat-subs-trial', (stats.trialSubscriptions || 0).toLocaleString());
            updateElement('stat-subs-retention', `${stats.retentionRate || 0}% retenção`);
        }

        await loadSubscriptionsTable();
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

async function loadRecentActivity() {
    const tbody = document.getElementById('recentActivityBody');
    if (!tbody) return;

    try {
        const response = await api.getAdminUsers();

        if (response && response.success && response.users && response.users.length > 0) {
            const recentUsers = response.users.slice(0, 5);

            tbody.innerHTML = recentUsers.map((user) => {
                const createdAt = new Date(user.created_at);
                const timeAgo = getTimeAgo(createdAt);
                const hasSubscription = user.subscription && user.subscription.status === 'active';

                return `
                <tr>
                  <td>
                    <div class="eio-user-cell">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}" class="eio-table-avatar">
                      <div>
                        <div class="eio-table-name">${user.name || 'Sem nome'}</div>
                        <div class="eio-table-email">${user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>${hasSubscription ? 'Assinatura ativa' : 'Novo cadastro'}</td>
                  <td><span class="eio-badge eio-badge-${hasSubscription ? 'success' : 'info'}">${hasSubscription ? 'Ativo' : 'Trial'}</span></td>
                  <td>${timeAgo}</td>
                </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 30px; color:#888;">Nenhuma atividade recente</td></tr>';
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 30px; color:#888;">Nenhuma atividade disponível</td></tr>';
    }
}

async function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">Carregando...</td></tr>';

    try {
        const response = await api.getAdminUsers();

        if (response && response.success && response.users) {
            const users = response.users;

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">Nenhum usuário cadastrado</td></tr>';
                return;
            }

            tbody.innerHTML = users.map((user) => {
                const sub = user.subscription || {};
                const status = sub.status || 'inactive';
                const planName = sub.plan || 'Trial';
                const createdAt = new Date(user.created_at).toLocaleDateString('pt-BR');

                return `
                <tr data-id="${user.id}">
                  <td>
                    <div class="eio-user-cell">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}" class="eio-table-avatar">
                      <div>
                        <div class="eio-table-name">${user.name || 'Sem nome'}</div>
                        <div class="eio-table-email">${user.instagram_handle || '@—'} ${user.role === 'admin' ? '<span class="eio-badge eio-badge-info" style="font-size:0.6rem;padding:2px 4px;">ADMIN</span>' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size: 0.9rem;">${user.email}</td>
                  <td><span style="font-weight: 600;">${planName.toUpperCase()}</span></td>
                  <td>
                    <span class="eio-badge eio-badge-${status === 'active' ? 'success' : 'warning'}">
                      ${status === 'active' ? '✓ Ativo' : '○ Inativo'}
                    </span>
                  </td>
                  <td>${sub.mercadopago_subscription_id ? 'M.Pago' : sub.stripe_subscription_id ? 'Stripe' : '—'}</td>
                  <td>${createdAt}</td>
                  <td>
                    <button class="eio-btn eio-btn-ghost eio-btn-sm" onclick="editUser('${user.id}')" title="Editar">✏️</button>
                    <button class="eio-btn eio-btn-ghost eio-btn-sm" onclick="deleteUser('${user.id}')" title="Remover" style="color:#ff4d4d;">🗑️</button>
                  </td>
                </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#ff6b6b;">Nenhum usuário encontrado</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#ff6b6b;">Erro ao carregar usuários. Verifique a conexão.</td></tr>';
    }
}

async function loadSubscriptionsTable() {
    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;

    try {
        const response = await api.getAdminUsers();

        if (response && response.success && response.users) {
            const usersWithSub = response.users.filter(u => u.subscription);

            if (usersWithSub.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px;">Nenhuma assinatura encontrada</td></tr>';
                return;
            }

            tbody.innerHTML = usersWithSub.map((user) => {
                const sub = user.subscription;
                const status = sub.status || 'trial';
                const prices = { 'professional': 399.90, 'premium': 799.90, 'basic': 199.90 };
                const value = prices[sub.plan] || 0;
                const nextPayment = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '—';

                return `
                <tr>
                  <td>
                    <div class="eio-table-name">${user.name || 'Sem nome'}</div>
                    <div class="eio-table-email">${user.email}</div>
                  </td>
                  <td>${(sub.plan || 'trial').toUpperCase()}</td>
                  <td><span class="eio-badge eio-badge-${status === 'active' ? 'success' : 'info'}">${status}</span></td>
                  <td>R$ ${value.toFixed(2)}</td>
                  <td>${nextPayment}</td>
                  <td><button class="eio-btn eio-btn-ghost eio-btn-sm" onclick="viewUser('${user.id}')">Ver</button></td>
                </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

async function loadFinancesData() {
    try {
        const statsResponse = await api.getAdminStats();
        if (statsResponse && statsResponse.success) {
            const mrr = statsResponse.stats?.mrr || 0;
            updateElement('stat-finance-mrr', `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        }

        // Load transactions
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        const response = await api.getAdminFinances();

        if (response && response.success && response.transactions && response.transactions.length > 0) {
            updateElement('stat-finance-transactions', response.transactions.length.toString());

            tbody.innerHTML = response.transactions.map((tr) => {
                const date = new Date(tr.date).toLocaleDateString('pt-BR');
                return `
                <tr>
                  <td>${date}</td>
                  <td>
                    <div style="font-weight:600">${tr.customer}</div>
                    <div style="font-size:0.75rem; color:#aaa">${tr.email}</div>
                  </td>
                  <td>${tr.description}</td>
                  <td style="color:#00d2ff; font-weight:600">R$ ${tr.value.toFixed(2)}</td>
                  <td><span class="eio-badge eio-badge-success">Pago</span></td>
                  <td>${tr.method}</td>
                </tr>
                `;
            }).join('');
        } else {
            updateElement('stat-finance-transactions', '0');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color:#888;">Nenhuma transação registrada</td></tr>';
        }
    } catch (error) {
        console.error('Error loading finances:', error);
    }
}

async function loadLogs() {
    const container = document.getElementById('logsContainer');
    if (!container) return;

    try {
        const response = await api.getAdminLogs();

        if (response && response.success && response.logs) {
            container.innerHTML = response.logs.map(log => `
                <div style="margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #222;">
                    <span style="color: #555;">[${new Date(log.timestamp).toLocaleString('pt-BR')}]</span> 
                    <span style="color: ${log.level === 'ERROR' ? '#ff4d4d' : log.level === 'SUCCESS' ? '#4CAF50' : '#00d2ff'}">${log.level}:</span> 
                    <span style="color: #ccc;">${log.message}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="color: #666;">Nenhum log disponível</div>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        container.innerHTML = '<div style="color: #666;">Erro ao carregar logs</div>';
    }
}

// Utility functions
function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
}

// User actions
window.editUser = async function (id) {
    const newName = prompt('Novo nome:');
    if (newName) {
        try {
            await api.updateAdminUser(id, { name: newName });
            alert('Usuário atualizado!');
            loadUsersTable();
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }
};

window.deleteUser = async function (id) {
    if (confirm('Remover este usuário?')) {
        try {
            await api.deleteAdminUser(id);
            alert('Usuário removido!');
            loadUsersTable();
            loadStats();
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }
};

window.viewUser = function (id) {
    alert('ID do usuário: ' + id);
};

async function addNewUser() {
    const email = prompt('Email do novo usuário:');
    if (!email) return;

    const name = prompt('Nome:');
    if (!name) return;

    const password = prompt('Senha:');
    if (!password) return;

    try {
        const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (data.success) {
            alert('Usuário criado!');
            loadUsersTable();
            loadStats();
        } else {
            alert('Erro: ' + (data.message || 'Falha'));
        }
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

function saveAutoMessages() {
    const messages = {
        welcome: {
            enabled: document.getElementById('toggleWelcome')?.checked,
            text: document.getElementById('msgWelcome')?.value
        },
        payment: {
            enabled: document.getElementById('togglePayment')?.checked,
            text: document.getElementById('msgPayment')?.value
        },
        renewal: {
            enabled: document.getElementById('toggleRenewal')?.checked,
            text: document.getElementById('msgRenewal')?.value
        }
    };

    localStorage.setItem('eio_auto_messages', JSON.stringify(messages));
    alert('Configurações de mensagens salvas!');
}

function loadAutoMessages() {
    const stored = localStorage.getItem('eio_auto_messages');
    if (stored) {
        try {
            const messages = JSON.parse(stored);

            if (messages.welcome) {
                const toggle = document.getElementById('toggleWelcome');
                const text = document.getElementById('msgWelcome');
                if (toggle) toggle.checked = messages.welcome.enabled;
                if (text && messages.welcome.text) text.value = messages.welcome.text;
            }

            if (messages.payment) {
                const toggle = document.getElementById('togglePayment');
                const text = document.getElementById('msgPayment');
                if (toggle) toggle.checked = messages.payment.enabled;
                if (text && messages.payment.text) text.value = messages.payment.text;
            }

            if (messages.renewal) {
                const toggle = document.getElementById('toggleRenewal');
                const text = document.getElementById('msgRenewal');
                if (toggle) toggle.checked = messages.renewal.enabled;
                if (text && messages.renewal.text) text.value = messages.renewal.text;
            }
        } catch (e) {
            console.warn('Could not load auto messages');
        }
    }
}

function initializeCharts() {
    if (typeof Chart === 'undefined') return;

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        const existing = Chart.getChart(revenueCtx);
        if (existing) existing.destroy();

        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Receita',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#6246ea',
                    backgroundColor: 'rgba(98, 70, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } },
                    x: { grid: { display: false }, ticks: { color: '#666' } }
                }
            }
        });
    }

    // Users Chart
    const usersCtx = document.getElementById('usersChart');
    if (usersCtx) {
        const existing = Chart.getChart(usersCtx);
        if (existing) existing.destroy();

        new Chart(usersCtx, {
            type: 'bar',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Novos',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#ff0055',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } },
                    x: { grid: { display: false }, ticks: { color: '#666' } }
                }
            }
        });
    }
}
