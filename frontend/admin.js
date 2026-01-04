// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navItems = document.querySelectorAll('.eio-nav-item');
    const sections = document.querySelectorAll('.eio-content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');

            navItems.forEach(n => n.classList.remove('eio-nav-item-active'));
            sections.forEach(s => s.classList.remove('eio-content-active'));

            item.classList.add('eio-nav-item-active');

            const targetSection = document.querySelector(`[data-section="${page}"]`);
            if (targetSection) {
                targetSection.classList.add('eio-content-active');
                document.querySelector('.eio-page-title').textContent = item.querySelector('span').textContent;
            }
        });
    });

    // Initialize Components
    initializeCharts();
    loadUsersTable();
    loadSubscriptionsTable();
    loadTransactionsTable();
    setupButtonListeners();
});

/**
 * Setup event listeners for auxiliary buttons
 */
function setupButtonListeners() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();

        if (text.includes('adicionar usuário')) {
            btn.addEventListener('click', () => alert('Funcionalidade de Adicionar Usuário será integrada ao backend em breve.'));
        }

        if (text.includes('exportar relatório')) {
            btn.addEventListener('click', () => alert('Gerando relatório CSV... O download começará em instantes.'));
        }

        if (text.includes('limpar logs')) {
            btn.addEventListener('click', () => {
                if (confirm('Deseja realmente limpar todos os logs do sistema?')) {
                    const logContainer = document.querySelector('[data-section="logs"] div[style*="monospace"]');
                    if (logContainer) logContainer.innerHTML = '<div>[' + new Date().toISOString() + '] INFO: Logs limpos pelo administrador.</div>';
                }
            });
        }

        if (text === 'pausar') {
            btn.addEventListener('click', function () {
                const badge = this.closest('tr').querySelector('.eio-badge');
                if (badge) {
                    badge.className = 'eio-badge eio-badge-warning';
                    badge.textContent = 'Pausado';
                    this.textContent = 'Retomar';
                    this.className = 'eio-btn eio-btn-primary eio-btn-sm';
                }
            });
        } else if (text === 'retomar') {
            btn.addEventListener('click', function () {
                const badge = this.closest('tr').querySelector('.eio-badge');
                if (badge) {
                    badge.className = 'eio-badge eio-badge-success';
                    badge.textContent = 'Rodando';
                    this.textContent = 'Pausar';
                    this.className = 'eio-btn eio-btn-ghost eio-btn-sm';
                }
            });
        }
    });
}

/**
 * Initialize Charts with Chart.js
 */
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['1 Jan', '5 Jan', '10 Jan', '15 Jan', '20 Jan', '25 Jan', '30 Jan'],
                datasets: [{
                    label: 'Receita (R$)',
                    data: [5200, 6800, 8200, 7500, 9100, 10200, 11500],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: (value) => 'R$ ' + (value / 1000) + 'k'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }

    // Users Chart
    const usersCtx = document.getElementById('usersChart');
    if (usersCtx) {
        new Chart(usersCtx, {
            type: 'bar',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Novos Usuários',
                    data: [12, 19, 15, 22, 18, 8, 6],
                    backgroundColor: 'rgba(123, 31, 162, 0.8)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }
}

/**
 * Load Users Table
 */
function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    // Mock data with realistic subscription info
    const users = [
        {
            name: 'João Silva',
            email: 'joao@email.com',
            instagram: '@joaosilva_fit',
            whatsapp: '(21) 98765-4321',
            plan: 'Professional',
            status: 'active',
            paymentStatus: 'paid',
            paymentMethod: 'Cartão 12x',
            value: 'R$ 399,90',
            date: '15/12/2024',
            renewal: '15/12/2025'
        },
        {
            name: 'Maria Santos',
            email: 'maria@email.com',
            instagram: '@mariasantos',
            whatsapp: '(11) 99876-5432',
            plan: 'Professional',
            status: 'active',
            paymentStatus: 'paid',
            paymentMethod: 'Pix',
            value: 'R$ 349,90',
            date: '14/12/2024',
            renewal: '14/12/2025'
        },
        {
            name: 'Pedro Costa',
            email: 'pedro@email.com',
            instagram: '@pedrocosta',
            whatsapp: '(21) 97654-3210',
            plan: 'Trial 5 dias',
            status: 'trial',
            paymentStatus: 'pending',
            paymentMethod: 'Pendente',
            value: 'R$ 0,00 (Trial)',
            date: '28/12/2024',
            renewal: '02/01/2025'
        },
        {
            name: 'Ana Lima',
            email: 'ana@email.com',
            instagram: '@analima_coach',
            whatsapp: '(11) 96543-2109',
            plan: 'Professional + 1 perfil',
            status: 'active',
            paymentStatus: 'paid',
            paymentMethod: 'Pix',
            value: 'R$ 549,90',
            date: '08/12/2024',
            renewal: '08/12/2025'
        },
        {
            name: 'Carlos Souza',
            email: 'carlos@email.com',
            instagram: '@carlossouza',
            whatsapp: '(21) 95432-1098',
            plan: 'Professional',
            status: 'expired',
            paymentStatus: 'overdue',
            paymentMethod: 'Cartão',
            value: 'R$ 399,90',
            date: '05/11/2024',
            renewal: '05/11/2025 (Expirado)'
        }
    ];

    tbody.innerHTML = users.map((user, index) => `
    <tr>
      <td>
        <div class="eio-user-cell">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}" class="eio-table-avatar">
          <div>
            <div class="eio-table-name">${user.name}</div>
            <div class="eio-table-email">${user.instagram}</div>
          </div>
        </div>
      </td>
      <td>
        <div>${user.email}</div>
        <div style="font-size: 0.85rem; color: #aaa;">${user.whatsapp}</div>
      </td>
      <td>
        <div style="font-weight: 600;">${user.plan}</div>
        <div style="font-size: 0.85rem; color: ${user.paymentStatus === 'paid' ? '#4CAF50' :
            user.paymentStatus === 'pending' ? '#FFC107' : '#ff4d4d'
        };">${user.value}</div>
      </td>
      <td>
        <span class="eio-badge eio-badge-${user.status === 'active' ? 'success' :
            user.status === 'trial' ? 'info' :
                user.status === 'expired' ? 'warning' : 'error'
        }">
          ${user.status === 'active' ? '✓ Ativo' :
            user.status === 'trial' ? '⏱ Trial' :
                user.status === 'expired' ? '⚠ Expirado' : '✕ Cancelado'}
        </span>
      </td>
      <td>
        <div style="font-weight: 600; color: ${user.paymentMethod.includes('Pix') ? '#25D366' :
            user.paymentMethod.includes('Cartão') ? '#2196F3' : '#aaa'
        };">
          ${user.paymentMethod.includes('Pix') ? '💳 ' : user.paymentMethod.includes('Cartão') ? '💳 ' : '⏳ '}${user.paymentMethod}
        </div>
      </td>
      <td>
        <div>${user.date}</div>
        <div style="font-size: 0.85rem; color: #aaa;">Renova: ${user.renewal}</div>
      </td>
      <td>
        <div class="eio-action-btns">
          <button class="eio-action-btn" title="Editar" onclick="editUser(${index})">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11.333 2L14 4.667L5.333 13.333H2.667V10.667L11.333 2Z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="eio-action-btn" title="Ver Detalhes" onclick="viewUser(${index})">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M0.666748 8C0.666748 8 3.33341 2.667 8.00008 2.667C12.6667 2.667 15.3334 8 15.3334 8C15.3334 8 12.6667 13.333 8.00008 13.333C3.33341 13.333 0.666748 8 0.666748 8Z" stroke="currentColor" stroke-width="2"/>
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="eio-action-btn eio-action-btn-danger" title="Deletar" onclick="deleteUser(${index})">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M12.667 4V13.333C12.667 14 12 14.667 11.333 14.667H4.667C4 14.667 3.333 14 3.333 13.333V4M5.333 4V2.667C5.333 2 6 1.333 6.667 1.333H9.333C10 1.333 10.667 2 10.667 2.667V4" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// User Management Functions
window.editUser = function (index) {
    alert('Funcionalidade de edição será implementada. Usuário #' + (index + 1));
};

window.viewUser = function (index) {
    alert('Detalhes do usuário #' + (index + 1) + '\n\nAqui você verá:\n- Histórico de pagamentos\n- Atividade no sistema\n- Leads capturados\n- Automações ativas');
};

window.deleteUser = function (index) {
    if (confirm('ATENÇÃO: Esta ação é irreversível!\n\nDeseja realmente deletar este usuário e todos os seus dados?')) {
        alert('Usuário deletado com sucesso!');
        loadUsersTable();
    }
};

// Load Subscriptions Table
function loadSubscriptionsTable() {
    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;

    const subscriptions = [
        { name: 'João Silva', plan: 'Anual Premium', status: 'active', value: 'R$ 399,90', nextPayment: '15/12/2025' },
        { name: 'Maria Santos', plan: 'Anual Premium (Pix)', status: 'active', value: 'R$ 349,90', nextPayment: '14/12/2025' },
        { name: 'Pedro Costa', plan: 'Trial 5 dias', status: 'trial', value: 'R$ 0,00', nextPayment: '02/01/2025' },
        { name: 'Ana Lima', plan: 'Anual Premium + 1 perfil', status: 'active', value: 'R$ 549,90', nextPayment: '08/12/2025' },
        { name: 'Carlos Souza', plan: 'Anual Premium', status: 'expired', value: 'R$ 399,90', nextPayment: 'Vencido' },
    ];

    tbody.innerHTML = subscriptions.map((sub, index) => `
        <tr>
            <td>${sub.name}</td>
            <td>${sub.plan}</td>
            <td>
                <span class="eio-badge eio-badge-${sub.status === 'active' ? 'success' :
            sub.status === 'trial' ? 'info' : 'warning'
        }">
                    ${sub.status === 'active' ? '✓ Ativo' :
            sub.status === 'trial' ? '⏱ Trial' : '⚠ Expirado'}
                </span>
            </td>
            <td style="font-weight: 600;">${sub.value}</td>
            <td>${sub.nextPayment}</td>
            <td>
                <div class="eio-action-btns">
                    <button class="eio-action-btn" title="Ver Detalhes">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M0.666748 8C0.666748 8 3.33341 2.667 8.00008 2.667C12.6667 2.667 15.3334 8 15.3334 8C15.3334 8 12.6667 13.333 8.00008 13.333C3.33341 13.333 0.666748 8 0.666748 8Z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load Transactions Table
function loadTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    const transactions = [
        { date: '31/12/2024', client: 'João Silva', description: 'Plano Anual Premium', value: 'R$ 399,90', status: 'approved', method: 'Cartão 12x' },
        { date: '31/12/2024', client: 'Maria Santos', description: 'Plano Anual Premium', value: 'R$ 349,90', status: 'approved', method: 'Pix' },
        { date: '30/12/2024', client: 'Ana Lima', description: 'Anual + 1 Perfil Extra', value: 'R$ 549,90', status: 'approved', method: 'Pix' },
        { date: '29/12/2024', client: 'Pedro Costa', description: 'Trial Iniciado', value: 'R$ 0,00', status: 'pending', method: '-' },
        { date: '28/12/2024', client: 'Carlos Souza', description: 'Renovação Anual', value: 'R$ 399,90', status: 'failed', method: 'Cartão' },
        { date: '27/12/2024', client: 'Juliana Ferreira', description: 'Reembolso', value: '-R$ 349,90', status: 'refunded', method: 'Pix' },
    ];

    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td>${tx.date}</td>
            <td>${tx.client}</td>
            <td>${tx.description}</td>
            <td style="font-weight: 600; color: ${tx.value.includes('-') ? '#ff4d4d' : '#4CAF50'};">${tx.value}</td>
            <td>
                <span class="eio-badge eio-badge-${tx.status === 'approved' ? 'success' :
            tx.status === 'pending' ? 'info' :
                tx.status === 'refunded' ? 'warning' : 'error'
        }">
                    ${tx.status === 'approved' ? '✓ Aprovado' :
            tx.status === 'pending' ? '⏱ Pendente' :
                tx.status === 'refunded' ? '↩ Reembolsado' : '✕ Falhou'}
                </span>
            </td>
            <td>${tx.method}</td>
        </tr>
    `).join('');
}
