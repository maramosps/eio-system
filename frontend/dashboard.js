// Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication (BYPASS FOR TESTING)
    const token = localStorage.getItem('accessToken');
    if (!token) {
        // Auto-login logic for testing purposes
        console.warn('⚠️ No token found. Creating mock session for testing.');
        localStorage.setItem('accessToken', 'mock_token_123');
        localStorage.setItem('user', JSON.stringify({
            name: 'Usuário Teste',
            email: 'teste@eio.com',
            instagram_handle: '@usuario_teste',
            role: 'client'
        }));
        // Reload page to apply changes
        // window.location.reload(); 
        // Or just let it proceed since we just set the values, 
        // but 'token' var above is still null in this execution scope.
        // Let's just proceed with mock data in this run:
    }


    // Load user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.name) {
        document.querySelector('.eio-user-name').textContent = user.name;
        document.querySelector('.eio-user-email').textContent = user.email;
    }

    // Navigation
    const navItems = document.querySelectorAll('.eio-nav-item');
    const sections = document.querySelectorAll('.eio-content-section');

    // Navigation logic (handles both click and hash routing)
    function activateSection(page) {
        if (!page) return;

        navItems.forEach(n => {
            if (n.getAttribute('data-page') === page) {
                n.classList.add('eio-nav-item-active');
            } else {
                n.classList.remove('eio-nav-item-active');
            }
        });

        sections.forEach(s => {
            if (s.getAttribute('data-section') === page) {
                s.classList.add('eio-content-active');
            } else {
                s.classList.remove('eio-content-active');
            }
        });

        const activeItem = document.querySelector(`.eio-nav-item[data-page="${page}"]`);
        if (activeItem) {
            document.querySelector('.eio-page-title').textContent = activeItem.querySelector('span').textContent;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Only prevent default for internal hashtag navigation
            const href = item.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                activateSection(page);
            }
        });
    });

    // Check hash on load (e.g. redirected from CRM)
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        activateSection(hash);
    }

    // Notifications Logic
    const notifications = [
        { id: 1, title: 'Alerta de Segurança', text: 'Pausa preventiva de 2h ativada para proteger sua conta.', time: 'Há 10 min', type: 'warning', icon: '🛡️' },
        { id: 2, title: 'Novo Lead Quente', text: '@mariasilva respondeu sua DM de boas-vindas!', time: 'Há 30 min', type: 'success', icon: '🔥' },
        { id: 3, title: 'Agente Concluiu', text: 'Ciclo de boas-vindas finalizado (45 envios).', time: 'Há 2h', type: 'info', icon: '🤖' },
        { id: 4, title: 'Assinatura', text: 'Seu período de teste acaba em 2 dias. Aproveite o desconto!', time: 'Há 5h', type: 'alert', icon: '💳' }
    ];

    const btnNotifications = document.getElementById('btnNotifications');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');
    const notifyBadge = document.getElementById('notifyBadge');

    // Show badge dot if notifications exist
    if (notifications.length > 0 && notifyBadge) {
        notifyBadge.style.display = 'block';
    }

    if (btnNotifications && notificationDropdown) {
        btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = notificationDropdown.style.display === 'block';
            notificationDropdown.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                renderNotifications();
                // Hide badge when opened
                if (notifyBadge) notifyBadge.style.display = 'none';
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !btnNotifications.contains(e.target)) {
                notificationDropdown.style.display = 'none';
            }
        });
    }

    function renderNotifications() {
        if (!notificationList) return;

        notificationList.innerHTML = notifications.map(n => `
            <div class="eio-notification-item" style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 12px; align-items: start; cursor: pointer; transition: background 0.2s;">
                <div style="font-size: 1.2rem; background: rgba(255,255,255,0.05); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">${n.icon}</div>
                <div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 2px;">${n.title}</div>
                    <div style="font-size: 0.8rem; color: #aaa; line-height: 1.3;">${n.text}</div>
                    <div style="font-size: 0.7rem; color: #666; margin-top: 4px;">${n.time}</div>
                </div>
            </div>
        `).join('');

        // Add hover effect via JS since inline styles are tricky for hover
        notificationList.querySelectorAll('.eio-notification-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.02)');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        });
    }

    // User Menu Logic
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const btnLogout = document.getElementById('btnLogout');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Modal Logic for Profile and Settings
    const modal = document.getElementById('genericModal');
    const btnProfile = document.getElementById('btnProfile');
    const btnSettings = document.getElementById('btnSettings');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeGenericModal = document.getElementById('closeGenericModal');
    const modalActionBtn = document.getElementById('modalActionBtn');

    function openModal(type) {
        if (!modal) return;

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (type === 'profile') {
            modalTitle.textContent = 'Meu Perfil';
            modalBody.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'user'}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #6246ea;">
                    <h4 style="margin: 10px 0 5px; color: #fff;">${user.name || 'Usuário'}</h4>
                    <span class="eio-badge eio-badge-success">Plano Pro</span>
                </div>
                <div class="eio-input-group">
                    <label class="eio-label">Email</label>
                    <input type="text" class="eio-input" value="${user.email || ''}" readonly style="opacity: 0.7;">
                </div>
                <div class="eio-input-group">
                    <label class="eio-label">Instagram</label>
                    <input type="text" class="eio-input" value="${user.instagram_handle || ''}" readonly style="opacity: 0.7;">
                </div>
            `;
            modalActionBtn.style.display = 'none';
        } else if (type === 'settings') {
            modalTitle.textContent = 'Configurações';
            modalBody.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div>
                            <div style="color: #fff; font-weight: 500;">Notificações por Email</div>
                            <div style="font-size: 0.85rem; color: #aaa;">Receber resumos semanais</div>
                        </div>
                        <div class="eio-toggle" style="width: 40px; height: 20px; background: #6246ea; border-radius: 10px; position: relative;"><div style="width: 16px; height: 16px; background: #fff; border-radius: 50%; position: absolute; top: 2px; right: 2px;"></div></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div>
                            <div style="color: #fff; font-weight: 500;">Tema Escuro</div>
                            <div style="font-size: 0.85rem; color: #aaa;">Sempre ativo no sistema</div>
                        </div>
                        <div class="eio-toggle" style="width: 40px; height: 20px; background: #6246ea; border-radius: 10px; position: relative; opacity: 0.5;"><div style="width: 16px; height: 16px; background: #fff; border-radius: 50%; position: absolute; top: 2px; right: 2px;"></div></div>
                    </div>
                    <div class="eio-input-group">
                        <label class="eio-label">Idioma</label>
                        <select class="eio-input">
                            <option value="pt-BR" selected>Português (Brasil)</option>
                            <option value="en-US">English</option>
                            <option value="es">Español</option>
                        </select>
                    </div>
                </div>
            `;
            modalActionBtn.style.display = 'block';
            modalActionBtn.textContent = 'Salvar Preferências';
        }

        modal.classList.add('active'); // Start animation class if defined, or just display flex via CSS or inline style override
        modal.style.display = 'flex';
    }

    if (btnProfile) btnProfile.addEventListener('click', (e) => { e.preventDefault(); openModal('profile'); });
    if (btnSettings) btnSettings.addEventListener('click', (e) => { e.preventDefault(); openModal('settings'); });

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeGenericModal) closeGenericModal.addEventListener('click', closeModal);
    if (modalActionBtn) modalActionBtn.addEventListener('click', () => {
        alert('Configurações salvas com sucesso!');
        closeModal();
    });

    // Close on click outside modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Account Management Buttons
    const btnConnectAccount = document.getElementById('btnConnectAccount');
    const btnReconnectAccount = document.getElementById('btnReconnectAccount');
    const btnRemoveAccount = document.getElementById('btnRemoveAccount');

    if (btnConnectAccount) {
        btnConnectAccount.addEventListener('click', () => {
            const currentAccounts = document.querySelectorAll('.eio-account-list > div').length;

            if (currentAccounts >= 2) {
                // Fetch user data for the message
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const clientData = `Nome: ${user.name || 'N/A'}, Email: ${user.email || 'N/A'}, Tel: ${user.whatsapp || 'N/A'}`;
                const message = `Quero adicionar mais um perfil a minha conta pelo valor de R$ 150,00 por perfil. Dados do Cliente: ${clientData}`;
                const whatsappLink = `https://wa.me/5521975312662?text=${encodeURIComponent(message)}`;

                // Create and show upsell modal dynamically
                const upsellModal = document.createElement('div');
                upsellModal.className = 'eio-modal active';
                upsellModal.style.display = 'flex';
                upsellModal.innerHTML = `
                    <div class="eio-modal-content" style="max-width: 500px; text-align: center;">
                        <div class="eio-modal-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
                            <div style="width: 60px; height: 60px; background: rgba(255, 193, 7, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFC107" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                        </div>
                        <div class="eio-modal-body" style="padding-top: 0;">
                            <h3 style="color: #fff; margin-bottom: 10px;">Limite de Contas Atingido</h3>
                            <p style="color: #aaa; margin-bottom: 20px;">Seu plano atual permite conectar até <strong>2 contas</strong> do Instagram.</p>
                            <p style="color: #fff; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem;">
                                Deseja conectar mais perfis? Adicione contas extras por apenas <strong style="color: #4CAF50;">R$ 150,00/cada</strong>.
                            </p>
                            <a href="${whatsappLink}" target="_blank" class="eio-btn eio-btn-primary eio-btn-block" style="justify-content: center; background: #25D366; color: #fff; text-decoration: none;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                Falar com Suporte no WhatsApp
                            </a>
                            <button class="eio-btn eio-btn-secondary eio-btn-block" style="margin-top: 10px;" onclick="this.closest('.eio-modal').remove()">Cancelar</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(upsellModal);
                return;
            }

            const username = prompt("Simulação: Digite o @usuário do Instagram:", "@nova_conta");
            if (username) {
                const list = document.querySelector('.eio-account-list');
                const newRow = document.createElement('div');
                newRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-top: 10px;";
                newRow.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${username}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #6246ea;">
                        <div>
                            <div style="font-weight: 600; color: #fff;">${username}</div>
                            <div style="font-size: 0.85rem; color: #4CAF50;">● Conectado e Ativo</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="eio-btn eio-btn-secondary eio-btn-sm">Reconectar</button>
                        <button class="eio-btn eio-btn-danger eio-btn-sm" onclick="this.closest('div').parentElement.remove()">Remover</button>
                    </div>
                `;
                list.appendChild(newRow);
            }
        });
    }

    if (btnReconnectAccount) {
        btnReconnectAccount.addEventListener('click', () => {
            alert('Iniciando processo de reconexão...');
        });
    }

    if (btnRemoveAccount) {
        btnRemoveAccount.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja remover esta conta? A automação será parada.')) {
                alert('Conta removida com sucesso!');
                const row = btnRemoveAccount.closest('.eio-account-list > div') || btnRemoveAccount.parentElement.parentElement;
                if (row) row.remove();
            }
        });
    }

    // AI Agents Toggles Interactivity
    const toggles = document.querySelectorAll('.eio-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const isActive = this.style.background === 'rgb(98, 70, 234)' || this.style.background === '#6246ea';
            const knob = this.querySelector('div');

            if (isActive) {
                this.style.background = '#333';
                knob.style.right = 'auto';
                knob.style.left = '2px';
            } else {
                this.style.background = '#6246ea';
                knob.style.left = 'auto';
                knob.style.right = '2px';
            }
        });
    });

    // Flow Builder Redirection from Dashboard
    const btnGoToFlows = document.getElementById('btnGoToFlows');
    if (btnGoToFlows) {
        btnGoToFlows.addEventListener('click', () => {
            alert('Gerencie seus fluxos diretamente pela extensão para maior segurança.');
            // Opcional: window.location.href = 'flow-builder.html';
        });
    }

    // Fetch dashboard data
    fetchDashboardData();

    // ✅ NOVO: Extension Download Functionality
    initExtensionDownload();
});

async function fetchDashboardData() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('http://localhost:3000/api/v1/analytics/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Update UI with real data
            console.log('Dashboard data:', data);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

// ═══════════════════════════════════════════════════════════
// EXTENSION DOWNLOAD FUNCTIONALITY
// ═══════════════════════════════════════════════════════════

async function initExtensionDownload() {
    const btnDownload = document.getElementById('btnDownloadExtension');
    const btnInstructions = document.getElementById('btnShowInstructions');
    const extensionSize = document.getElementById('extensionSize');
    const extensionVersion = document.getElementById('extensionVersion');

    // Fetch extension info
    await fetchExtensionInfo();

    // Download button
    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            try {
                btnDownload.disabled = true;
                btnDownload.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px; animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    Baixando...
                `;

                const token = localStorage.getItem('accessToken');
                const API_URL = window.location.hostname === 'localhost'
                    ? 'http://localhost:3000'
                    : 'https://eio-system.vercel.app';

                const response = await fetch(`${API_URL}/api/v1/extension/download`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao baixar extensão');
                }

                // Download file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'eio-extension.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Success feedback
                btnDownload.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Download Concluído!
                `;

                setTimeout(() => {
                    btnDownload.disabled = false;
                    btnDownload.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Baixar Extensão (.zip)
                    `;
                }, 3000);

            } catch (error) {
                console.error('Download error:', error);
                btnDownload.disabled = false;
                btnDownload.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    Erro no Download
                `;
                alert(`Erro ao baixar extensão: ${error.message}`);

                setTimeout(() => {
                    btnDownload.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Baixar Extensão (.zip)
                    `;
                }, 3000);
            }
        });
    }

    // Instructions modal
    if (btnInstructions) {
        btnInstructions.addEventListener('click', (e) => {
            e.preventDefault();
            showInstructionsModal();
        });
    }
}

async function fetchExtensionInfo() {
    try {
        const token = localStorage.getItem('accessToken');
        const API_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://eio-system.vercel.app';

        const response = await fetch(`${API_URL}/api/v1/extension/info`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                document.getElementById('extensionSize').textContent = data.data.size;
                document.getElementById('extensionVersion').textContent = data.data.version;
            }
        }
    } catch (error) {
        console.error('Error fetching extension info:', error);
        document.getElementById('extensionSize').textContent = '~2 MB';
    }
}

function showInstructionsModal() {
    const modal = document.createElement('div');
    modal.className = 'eio-modal active';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="eio-modal-content" style="max-width: 700px;">
            <div class="eio-modal-header">
                <h3>📖 Como Instalar a Extensão E.I.O</h3>
                <button class="eio-modal-close" onclick="this.closest('.eio-modal').remove()">×</button>
            </div>
            <div class="eio-modal-body">
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">🎯 Passo 1: Extrair o Arquivo</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        Após o download, localize o arquivo <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">eio-extension.zip</code> 
                        na pasta de Downloads e extraia todo o conteúdo para uma pasta no seu computador.
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">🌐 Passo 2: Abrir Configurações do Chrome</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        Abra o Google Chrome e digite na barra de endereços:<br>
                        <code style="background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px;">chrome://extensions/</code>
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">🔧 Passo 3: Ativar Modo Desenvolvedor</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        No canto superior direito da página, ative o botão <strong>"Modo do desenvolvedor"</strong>.
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">📂 Passo 4: Carregar Extensão</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        Clique no botão <strong>"Carregar sem compactação"</strong> e selecione a pasta que você extraiu no Passo 1.
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">✅ Passo 5: Pronto!</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        A extensão E.I.O agora está instalada! Você verá o ícone do foguete 🚀 na barra de extensões do Chrome.
                        Clique nele para fazer login e começar a automatizar.
                    </p>
                </div>

                <div style="background: rgba(98, 70, 234, 0.1); padding: 15px; border-left: 3px solid #6246ea; border-radius: 8px;">
                    <strong style="color: #fff;">💡 Dica:</strong>
                    <p style="color: #aaa; margin: 8px 0 0; font-size: 0.9rem;">
                        Fixe a extensão na barra de ferramentas clicando no ícone de quebra-cabeça 🧩 e depois no alfinete 📌 ao lado do E.I.O.
                    </p>
                </div>
            </div>
            <div class="eio-modal-footer">
                <button class="eio-btn eio-btn-primary" onclick="this.closest('.eio-modal').remove()">Entendi!</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Add spin animation for loading
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
