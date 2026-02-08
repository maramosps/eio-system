// ═══════════════════════════════════════════════════════════
// v4.4.23 - GLOBAL CONNECTION INTEGRATION
// A lógica de conexão foi movida para js/global-connection.js
// Este arquivo apenas escuta eventos do sistema global
// ═══════════════════════════════════════════════════════════
(function initDashboardConnection() {
    console.log('%c[Dashboard] v4.4.23 - Usando Global Connection', 'color: #6246ea;');

    // Escuta o evento global de conexão
    window.addEventListener('eio:extension:connected', (event) => {
        console.log('%c[Dashboard] 🌉 Conexão detectada pelo Global Connection!', 'color: #39FF14;');
        console.log('[Dashboard] Extension ID:', event.detail.extensionId);
        console.log('[Dashboard] Version:', event.detail.version);

        // Atualizar UI específica do Dashboard (se necessário além do global)
        const badge = document.getElementById('extension-status-badge') ||
            document.querySelector('.eio-sync-status');
        if (badge) {
            badge.className = 'status-badge online eio-sync-status';
            badge.style.background = 'rgba(57, 255, 20, 0.1)';
            badge.style.borderColor = 'rgba(57, 255, 20, 0.3)';
            badge.style.boxShadow = '0 0 15px rgba(57, 255, 20, 0.2)';
            badge.innerHTML = `
                <span class="eio-sync-dot" style="background: #39FF14; box-shadow: 0 0 10px #39FF14, 0 0 20px #39FF14;"></span>
                <span style="color: #39FF14; font-weight: 600;">ONLINE (v${event.detail.version})</span>
            `;
        }

        const statusText = document.getElementById('extension-status-text');
        if (statusText) {
            statusText.innerText = 'Conectado (v' + event.detail.version + ')';
            statusText.style.color = '#39FF14';
        }
    });
})();

// Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE AUTENTICAÇÃO FLEXÍVEL
    // Aceita: eio_token, accessToken, ou modo demo
    // ═══════════════════════════════════════════════════════════
    const token = localStorage.getItem('eio_token') || localStorage.getItem('accessToken');
    const demoMode = localStorage.getItem('demoMode') === 'true';

    if (!token && !demoMode) {
        console.warn('⚠️ Usuário não autenticado. Redirecionando para login...');
        localStorage.clear(); // Garante limpeza se houver lixo
        window.location.href = 'login.html';
        return;
    }

    // Load user info from local storage (aceita ambos formatos)
    let user = JSON.parse(localStorage.getItem('eio_user') || localStorage.getItem('user') || '{}');

    // Se estiver em modo demo, garantir dados padrão
    if (demoMode && (!user || !user.name)) {
        user = {
            id: 'demo-user',
            name: 'Usuário Demo',
            instagram_handle: '@demo_user',
            email: 'demo@eio.system',
            subscription: {
                status: 'active',
                plan: 'trial'
            }
        };
        localStorage.setItem('user', JSON.stringify(user));
    }

    console.log('✅ Dashboard carregado para:', user.name || user.instagram_handle);

    // Update UI with user data
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) {
        userNameEl.textContent = user.name || user.instagram_handle || 'Usuário';
    }
    if (userEmailEl) {
        userEmailEl.textContent = user.email || user.instagram_handle || '';
    }
    if (userAvatarEl) {
        const seed = user.email || user.instagram_handle || 'default';
        userAvatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    }

    // Also update any legacy selectors
    const legacyName = document.querySelector('.eio-user-name:not(#userName)');
    const legacyEmail = document.querySelector('.eio-user-email:not(#userEmail)');
    if (legacyName) legacyName.textContent = user.name || user.instagram_handle || 'Usuário';
    if (legacyEmail) legacyEmail.textContent = user.email || user.instagram_handle || '';

    // Show Admin sections if user is admin
    if (user.role === 'admin') {
        console.log('🔐 Admin user detected - showing admin sections');
        const adminSectionsContainer = document.getElementById('adminSectionsContainer');
        if (adminSectionsContainer) adminSectionsContainer.style.display = 'block';

        // Hide old links if they exist
        const adminDropdownLink = document.getElementById('adminDropdownLink');
        if (adminDropdownLink) adminDropdownLink.style.display = 'none';
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
                s.style.display = 'block';  // Force display block
            } else {
                s.classList.remove('eio-content-active');
                s.style.display = 'none';  // Force hide inactive
            }
        });

        const activeItem = document.querySelector(`.eio-nav-item[data-page="${page}"]`);
        if (activeItem) {
            document.querySelector('.eio-page-title').textContent = activeItem.querySelector('span').textContent;
        }

        // ✅ SCROLL AO TOPO: Garante que o conteúdo sempre apareça no início
        const pageContent = document.querySelector('.eio-page-content');
        if (pageContent) {
            pageContent.scrollTo({
                top: 0,
                behavior: 'smooth' // Scroll suave para melhor UX
            });
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

    // Notifications Logic - Empty for new users
    const notifications = []; // Será preenchido com dados reais do servidor

    const btnNotifications = document.getElementById('btnNotifications');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');
    const notifyBadge = document.getElementById('notifyBadge');

    // Hide badge when no notifications
    if (notifications.length === 0 && notifyBadge) {
        notifyBadge.style.display = 'none';
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

        if (notifications.length === 0) {
            // Empty state for new users
            notificationList.innerHTML = `
                <div style="padding: 40px 20px; text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.3;">🔔</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-bottom: 5px;">Nenhuma notificação</div>
                    <div style="color: rgba(255,255,255,0.3); font-size: 0.8rem;">As notificações aparecerão aqui quando você usar a extensão</div>
                </div>
            `;
            return;
        }

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
            console.log('🚪 Logout Total - Limpando Sessão...');

            // Limpa absolutamente tudo para evitar redirecionamentos indesejados
            localStorage.clear();
            sessionStorage.clear();

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
            const currentAccounts = document.querySelectorAll('.eio-account-list div[style*="background: rgba(255,255,255,0.02)"]').length;

            if (currentAccounts >= 1) {
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
                            <p style="color: #aaa; margin-bottom: 20px;">Seu plano atual permite conectar <strong>1 conta</strong> do Instagram.</p>
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
        const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';
        const response = await fetch(`${API_URL}/analytics/dashboard`, {
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

    // Set default values based on the latest package
    if (extensionSize) extensionSize.textContent = '1.7 MB';
    if (extensionVersion) extensionVersion.textContent = '4.4.23 (E.I.O System)';

    // Download button - Simple direct download
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            // Direct navigation to update file
            window.location.href = 'downloads/eio-extension-v4.4.23.zip';
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

function showInstructionsModal() {
    const modal = document.createElement('div');
    modal.className = 'eio-modal active';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="eio-modal-content" style="max-width: 750px;">
            <div class="eio-modal-header">
                <h3>📖 Como Instalar a Extensão E.I.O</h3>
                <button class="eio-modal-close" id="closeInstructionsModal">×</button>
            </div>
            <div class="eio-modal-body">
                <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid rgba(76, 175, 80, 0.2);">
                    <p style="color: #4CAF50; margin: 0; font-size: 0.95rem;">
                        ✅ <strong>Compatível com:</strong> Google Chrome, Microsoft Edge, Brave, Opera e outros navegadores baseados em Chromium.
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">🎯 Passo 1: Extrair o Arquivo</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        Após o download, localize o arquivo <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">eio-extension-v4.4.23.zip</code> 
                        na pasta de Downloads. <strong>Clique com botão direito → Extrair Tudo</strong> para uma nova pasta.
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">🌐 Passo 2: Abrir Página de Extensões</h4>
                    <p style="color: #aaa; line-height: 1.6;">Abra seu navegador e digite na barra de endereços:</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
                            <strong style="color: #fff; font-size: 0.85rem;">🔵 Chrome</strong>
                            <code style="display: block; margin-top: 5px; font-size: 0.8rem; color: #6246ea;">chrome://extensions/</code>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
                            <strong style="color: #fff; font-size: 0.85rem;">🔷 Edge</strong>
                            <code style="display: block; margin-top: 5px; font-size: 0.8rem; color: #6246ea;">edge://extensions/</code>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
                            <strong style="color: #fff; font-size: 0.85rem;">🟠 Brave</strong>
                            <code style="display: block; margin-top: 5px; font-size: 0.8rem; color: #6246ea;">brave://extensions/</code>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
                            <strong style="color: #fff; font-size: 0.85rem;">🔴 Opera</strong>
                            <code style="display: block; margin-top: 5px; font-size: 0.8rem; color: #6246ea;">opera://extensions/</code>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">🔧 Passo 3: Ativar Modo Desenvolvedor</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        No canto superior direito da página, ative o botão <strong>"Modo do desenvolvedor"</strong> ou <strong>"Developer mode"</strong>.
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">📂 Passo 4: Carregar Extensão</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        Clique no botão <strong>"Carregar sem compactação"</strong> (ou "Load unpacked") e selecione a pasta que você extraiu no Passo 1.
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <h4 style="color: #6246ea; margin-bottom: 10px;">✅ Passo 5: Pronto!</h4>
                    <p style="color: #aaa; line-height: 1.6;">
                        A extensão E.I.O agora está instalada! Você verá o ícone do foguete 🚀 na barra de extensões.
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
                <button class="eio-btn eio-btn-primary" id="closeInstructionsBtn">Entendi!</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close handlers using proper event listeners (no inline onclick)
    const closeModal = () => modal.remove();
    modal.querySelector('#closeInstructionsModal').addEventListener('click', closeModal);
    modal.querySelector('#closeInstructionsBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
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

// ═══════════════════════════════════════════════════════════
// INSTAGRAM ACCOUNTS MANAGEMENT
// ═══════════════════════════════════════════════════════════

async function initInstagramAccountsManagement() {
    const token = localStorage.getItem('eio_token');
    if (!token) return;

    const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

    // Event listeners for add buttons
    const btnConnect = document.getElementById('btnConnectAccount');
    const btnAddFirst = document.getElementById('btnAddFirstAccount');

    if (btnConnect) btnConnect.addEventListener('click', showAddAccountModal);
    if (btnAddFirst) btnAddFirst.addEventListener('click', showAddAccountModal);

    // Load accounts on page load
    await loadInstagramAccounts();
}

async function loadInstagramAccounts() {
    const token = localStorage.getItem('eio_token');
    if (!token) return;

    const accountsList = document.getElementById('accountsList');
    const accountsCount = document.getElementById('accountsCount');

    if (!accountsList) return;

    try {
        const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

        const response = await fetch(`${API_URL}/instagram/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Erro ao carregar contas');
            return;
        }

        const data = await response.json();

        if (accountsCount) {
            accountsCount.textContent = data.count || 0;
        }

        if (!data.accounts || data.accounts.length === 0) {
            // Show empty state
            accountsList.innerHTML = `
                <div class="eio-empty-accounts" style="padding: 50px 20px; text-align: center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)"
                        stroke-width="1.5" style="margin-bottom: 20px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 12H8"></path>
                        <path d="M12 8v8"></path>
                    </svg>
                    <h4 style="color: rgba(255,255,255,0.6); margin: 0 0 10px;">Nenhuma conta cadastrada</h4>
                    <p style="color: rgba(255,255,255,0.4); font-size: 0.9rem; margin: 0 0 20px;">
                        Cadastre seu @ do Instagram para poder fazer login na extensão
                    </p>
                    <button class="eio-btn eio-btn-primary" onclick="showAddAccountModal()">
                        + Cadastrar meu primeiro @
                    </button>
                </div>
            `;
            return;
        }

        // Render accounts
        accountsList.innerHTML = data.accounts.map(account => `
            <div class="eio-account-item" style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="https://ui-avatars.com/api/?background=6246ea&color=fff&name=${encodeURIComponent(account.instagram_handle)}" 
                        style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #6246ea;">
                    <div>
                        <div style="font-weight: 600; color: #fff;">@${account.instagram_handle}</div>
                        <div style="font-size: 0.85rem; color: ${account.status === 'active' ? '#4CAF50' : '#aaa'};">
                            ${account.status === 'active' ? '● Ativo' : '○ Inativo'}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="eio-btn eio-btn-danger eio-btn-sm" 
                        onclick="removeInstagramAccount('${account.id}')"
                        style="background: rgba(255, 77, 77, 0.1); color: #ff4d4d; border: 1px solid rgba(255, 77, 77, 0.2);">
                        Remover
                    </button>
                </div>
            </div>
        `).join('');

        // Disable add button if limit reached
        const btnConnect = document.getElementById('btnConnectAccount');
        if (btnConnect && data.count >= 2) {
            btnConnect.disabled = true;
            btnConnect.textContent = 'Limite atingido (2/2)';
            btnConnect.style.opacity = '0.5';
        }

    } catch (error) {
        console.error('Erro ao carregar contas Instagram:', error);
    }
}

function showAddAccountModal() {
    const modal = document.createElement('div');
    modal.className = 'eio-modal active';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;';

    modal.innerHTML = `
        <div class="eio-modal-content" style="max-width: 450px; background: #1a1a23; border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
            <div class="eio-modal-header" style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin: 0;">➕ Adicionar Conta Instagram</h3>
            </div>
            <div class="eio-modal-body">
                <p style="color: rgba(255,255,255,0.6); margin-bottom: 20px; line-height: 1.6;">
                    Digite o @ do Instagram que você quer usar para fazer login na extensão.
                </p>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-bottom: 8px;">
                        @ DO INSTAGRAM
                    </label>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #6246ea; font-weight: 600; font-size: 1.1rem;">@</span>
                        <input type="text" id="newInstagramHandle" class="eio-input" 
                            placeholder="seu_instagram" 
                            style="width: 100%; padding: 12px 12px 12px 35px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 1rem;">
                    </div>
                </div>

                <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="font-size: 0.85rem; color: #FFC107; margin: 0;">
                        ⚠️ <strong>Importante:</strong> Use exatamente o mesmo @ que você usa no Instagram. Este será seu login na extensão.
                    </p>
                </div>
            </div>
            <div class="eio-modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="eio-btn eio-btn-ghost" id="cancelAddAccount">Cancelar</button>
                <button class="eio-btn eio-btn-primary" id="confirmAddAccount">Adicionar Conta</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('#cancelAddAccount').addEventListener('click', () => modal.remove());
    modal.querySelector('#confirmAddAccount').addEventListener('click', () => addInstagramAccount(modal));
    modal.querySelector('#newInstagramHandle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addInstagramAccount(modal);
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Focus input
    setTimeout(() => modal.querySelector('#newInstagramHandle').focus(), 100);
}

async function addInstagramAccount(modal) {
    const token = localStorage.getItem('eio_token');
    if (!token) return;

    const input = modal.querySelector('#newInstagramHandle');
    const instagram_handle = input.value.replace('@', '').trim().toLowerCase();

    if (!instagram_handle) {
        alert('Por favor, digite o @ do Instagram');
        return;
    }

    const btn = modal.querySelector('#confirmAddAccount');
    btn.disabled = true;
    btn.textContent = 'Adicionando...';

    try {
        const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

        const response = await fetch(`${API_URL}/instagram/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ instagram_handle })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || 'Erro ao adicionar conta');
            btn.disabled = false;
            btn.textContent = 'Adicionar Conta';
            return;
        }

        modal.remove();
        await loadInstagramAccounts();

        // Show success message
        alert(`✅ Conta @${instagram_handle} cadastrada com sucesso!\n\nAgora você pode usar este @ para fazer login na extensão.`);

    } catch (error) {
        console.error('Erro ao adicionar conta:', error);
        alert('Erro de conexão. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'Adicionar Conta';
    }
}

async function removeInstagramAccount(accountId) {
    if (!confirm('Tem certeza que deseja remover esta conta?\n\nVocê não poderá mais usar este @ para fazer login na extensão.')) {
        return;
    }

    const token = localStorage.getItem('eio_token');
    if (!token) return;

    try {
        const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

        const response = await fetch(`${API_URL}/instagram/accounts/${accountId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.message || 'Erro ao remover conta');
            return;
        }

        await loadInstagramAccounts();
        alert('✅ Conta removida com sucesso!');

    } catch (error) {
        console.error('Erro ao remover conta:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Initialize Instagram accounts management when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay to ensure other scripts have loaded
    setTimeout(initInstagramAccountsManagement, 500);
});

// ═══════════════════════════════════════════════════════════
// AI AGENTS MANAGEMENT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initAgentTabs();
    initAgentSaveButtons();
    initFaqManagement();
    initToggleSwitches();
    loadAgentConfigs();
});

// Tab navigation for agents
function initAgentTabs() {
    const tabs = document.querySelectorAll('.eio-agent-tab');
    const contents = document.querySelectorAll('.eio-agent-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            // Update tab styles
            tabs.forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.style.border = '1px solid rgba(255,255,255,0.1)';
                t.style.color = '#aaa';
                t.style.fontWeight = 'normal';
            });
            tab.style.background = '#6246ea';
            tab.style.border = 'none';
            tab.style.color = '#fff';
            tab.style.fontWeight = '600';

            // Show/hide content
            contents.forEach(content => {
                if (content.getAttribute('data-content') === targetTab) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
}

// Toggle switches
// Toggle switches with persistence
function initToggleSwitches() {
    const toggles = document.querySelectorAll('.eio-toggle');

    toggles.forEach(toggle => {
        const id = toggle.id;
        const ball = toggle.querySelector('div');

        // Load saved state
        const savedState = localStorage.getItem(`eio_${id}_enabled`);
        // Default to true if not saved, except for maybe specific ones. Assuming true for demo.
        let isActive = savedState !== 'false';

        // Apply initial state
        updateAgentToggleVisual(toggle, ball, isActive);

        toggle.addEventListener('click', () => {
            isActive = !isActive;
            localStorage.setItem(`eio_${id}_enabled`, isActive.toString());
            updateAgentToggleVisual(toggle, ball, isActive);

            // Feedback
            const name = id.replace('toggle', '');
            console.log(`Agent ${name} is now ${isActive ? 'active' : 'inactive'}`);
        });
    });
}

function updateAgentToggleVisual(toggle, ball, isActive) {
    if (isActive) {
        ball.style.left = 'auto';
        ball.style.right = '2px';
        const colors = {
            'toggleAssistant': '#6246ea',
            'toggleQualifier': '#FF9800',
            'toggleFaq': '#4CAF50'
        };
        toggle.style.background = colors[toggle.id] || '#6246ea';
    } else {
        ball.style.right = 'auto';
        ball.style.left = '2px';
        toggle.style.background = '#333';
    }
}

// Save buttons
function initAgentSaveButtons() {
    // Save Assistant config
    document.getElementById('btnSaveAssistant')?.addEventListener('click', () => {
        const config = {
            keywordsInterest: document.getElementById('keywordsInterest')?.value || '',
            keywordsQuestion: document.getElementById('keywordsQuestion')?.value || '',
            keywordsComplaint: document.getElementById('keywordsComplaint')?.value || '',
            keywordsSpam: document.getElementById('keywordsSpam')?.value || '',
            replyInterest: document.getElementById('replyInterest')?.value || '',
            replyQuestion: document.getElementById('replyQuestion')?.value || '',
            replyComplaint: document.getElementById('replyComplaint')?.value || ''
        };
        localStorage.setItem('eio_agent_assistant', JSON.stringify(config));
        alert('✅ Configurações do Assistente salvas!');
    });

    // Save Qualifier config
    document.getElementById('btnSaveQualifier')?.addEventListener('click', () => {
        const inputs = document.querySelectorAll('[data-content="qualifier"] input[type="number"]');
        const scores = Array.from(inputs).map(i => parseInt(i.value) || 0);
        localStorage.setItem('eio_agent_qualifier', JSON.stringify({ scores }));
        alert('✅ Configurações do Qualificador salvas!');
    });

    // Save FAQ config
    document.getElementById('btnSaveFaq')?.addEventListener('click', () => {
        const faqs = [];
        document.querySelectorAll('.faq-item').forEach(item => {
            const triggers = item.querySelector('.faq-triggers')?.value || '';
            const response = item.querySelector('.faq-response')?.value || '';
            if (triggers && response) {
                faqs.push({ triggers, response });
            }
        });
        localStorage.setItem('eio_agent_faq', JSON.stringify(faqs));
        alert('✅ Configurações do Chatbot FAQ salvas!');
    });

    // Save Templates
    document.getElementById('btnSaveTemplates')?.addEventListener('click', () => {
        const templates = [];
        document.querySelectorAll('[data-content="templates"] textarea').forEach(textarea => {
            const label = textarea.closest('div')?.querySelector('span')?.textContent || 'Template';
            templates.push({ label, content: textarea.value });
        });
        localStorage.setItem('eio_agent_templates', JSON.stringify(templates));
        alert('✅ Templates salvos!');
    });
}

// FAQ Management
function initFaqManagement() {
    // Add new FAQ
    document.getElementById('btnAddFaq')?.addEventListener('click', () => {
        const faqList = document.getElementById('faqList');
        const newFaq = document.createElement('div');
        newFaq.className = 'faq-item';
        newFaq.style.cssText = 'padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;';
        newFaq.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <label style="color: #4CAF50; font-weight: 600; font-size: 0.9rem;">Gatilhos (palavras-chave):</label>
                <button class="btn-remove-faq" style="background: none; border: none; color: #ff4d4d; cursor: pointer; font-size: 1.2rem;">×</button>
            </div>
            <input type="text" class="eio-input faq-triggers" placeholder="palavra1, palavra2, palavra3..." 
                style="width: 100%; margin-bottom: 15px; padding: 10px;">
            <label style="display: block; color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-bottom: 8px;">Resposta automática:</label>
            <textarea class="eio-input faq-response" rows="3" 
                style="width: 100%; padding: 10px;" placeholder="Digite a resposta que será enviada quando detectar as palavras-chave..."></textarea>
        `;
        faqList.appendChild(newFaq);

        // Add remove listener
        newFaq.querySelector('.btn-remove-faq').addEventListener('click', () => {
            newFaq.remove();
        });
    });

    // Remove FAQ listeners
    document.querySelectorAll('.btn-remove-faq').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.faq-item').remove();
        });
    });
}

// Load saved configs
function loadAgentConfigs() {
    // Load Assistant
    try {
        const assistantConfig = JSON.parse(localStorage.getItem('eio_agent_assistant') || '{}');
        if (assistantConfig.keywordsInterest) document.getElementById('keywordsInterest').value = assistantConfig.keywordsInterest;
        if (assistantConfig.keywordsQuestion) document.getElementById('keywordsQuestion').value = assistantConfig.keywordsQuestion;
        if (assistantConfig.keywordsComplaint) document.getElementById('keywordsComplaint').value = assistantConfig.keywordsComplaint;
        if (assistantConfig.keywordsSpam) document.getElementById('keywordsSpam').value = assistantConfig.keywordsSpam;
        if (assistantConfig.replyInterest) document.getElementById('replyInterest').value = assistantConfig.replyInterest;
        if (assistantConfig.replyQuestion) document.getElementById('replyQuestion').value = assistantConfig.replyQuestion;
        if (assistantConfig.replyComplaint) document.getElementById('replyComplaint').value = assistantConfig.replyComplaint;
    } catch (e) { console.log('No assistant config saved'); }

    // Load FAQ
    try {
        const faqConfig = JSON.parse(localStorage.getItem('eio_agent_faq') || '[]');
        // For now, just log - could rebuild FAQ list from saved data
        console.log('Loaded FAQ config:', faqConfig.length, 'items');
    } catch (e) { console.log('No FAQ config saved'); }
}

// ═══════════════════════════════════════════════════════════
// AI HELPER FUNCTIONS (For extension integration)
// ═══════════════════════════════════════════════════════════

// Detect intention from message text
window.detectIntention = function (messageText) {
    const text = messageText.toLowerCase();

    const config = JSON.parse(localStorage.getItem('eio_agent_assistant') || '{}');

    const interests = (config.keywordsInterest || 'preço,valor,comprar').split(',').map(k => k.trim());
    const questions = (config.keywordsQuestion || 'como,quando,onde').split(',').map(k => k.trim());
    const complaints = (config.keywordsComplaint || 'problema,não funciona').split(',').map(k => k.trim());
    const spams = (config.keywordsSpam || 'ganhe dinheiro,clique aqui').split(',').map(k => k.trim());

    if (spams.some(k => text.includes(k))) return { type: 'spam', icon: '🚫', color: '#9E9E9E' };
    if (complaints.some(k => text.includes(k))) return { type: 'complaint', icon: '😕', color: '#FF9800' };
    if (interests.some(k => text.includes(k))) return { type: 'interest', icon: '🔥', color: '#4CAF50' };
    if (questions.some(k => text.includes(k))) return { type: 'question', icon: '❓', color: '#2196F3' };

    return { type: 'neutral', icon: '💬', color: '#aaa' };
};

// Get auto-reply based on intention
window.getAutoReply = function (intention, userName) {
    const config = JSON.parse(localStorage.getItem('eio_agent_assistant') || '{}');

    const replies = {
        interest: config.replyInterest || 'Obrigado pelo interesse!',
        question: config.replyQuestion || 'Vou te ajudar com isso!',
        complaint: config.replyComplaint || 'Sentimos muito, vamos resolver!',
        spam: null, // Don't reply to spam
        neutral: null
    };

    let reply = replies[intention.type];
    if (reply && userName) {
        reply = reply.replace(/{nome}/g, userName).replace(/{username}/g, userName);
    }

    return reply;
};

// Calculate lead score
window.calculateLeadScore = function (leadData) {
    const config = JSON.parse(localStorage.getItem('eio_agent_qualifier') || '{}');
    const scores = config.scores || [2, 3, 2, 5, 3, 4]; // Default scores

    let totalScore = 0;

    // Followers 500-5000
    if (leadData.followers >= 500 && leadData.followers <= 5000) totalScore += scores[0];
    // Email in bio
    if (leadData.bio && leadData.bio.includes('@') && leadData.bio.includes('.')) totalScore += scores[1];
    // Recent posts
    if (leadData.recentPosts > 0) totalScore += scores[2];
    // Replied to DM
    if (leadData.repliedDM) totalScore += scores[3];
    // Business profile
    if (leadData.isBusinessProfile) totalScore += scores[4];
    // Fast response
    if (leadData.responseTimeMinutes && leadData.responseTimeMinutes < 60) totalScore += scores[5];

    return {
        score: totalScore,
        category: totalScore <= 5 ? 'cold' : totalScore <= 10 ? 'warm' : 'hot',
        emoji: totalScore <= 5 ? '❄️' : totalScore <= 10 ? '🌡️' : '🔥'
    };
};

// Match FAQ
window.matchFaq = function (messageText) {
    const faqs = JSON.parse(localStorage.getItem('eio_agent_faq') || '[]');
    const text = messageText.toLowerCase();

    for (const faq of faqs) {
        const triggers = faq.triggers.split(',').map(t => t.trim().toLowerCase());
        if (triggers.some(t => text.includes(t))) {
            return faq.response;
        }
    }

    return null;
};

// Process template with variables
window.processTemplate = function (template, userData) {
    const hour = new Date().getHours();
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaSemana = dias[new Date().getDay()];

    return template
        .replace(/{nome}/g, userData.name || userData.username || 'você')
        .replace(/{username}/g, userData.username || '')
        .replace(/{saudacao}/g, saudacao)
        .replace(/{dia_semana}/g, diaSemana)
        .replace(/{seguidores}/g, userData.followers || '0');
};

// ═══════════════════════════════════════════════════════════
// ANALYTICS & SMART PROTECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initAnalyticsTabs();
    initAnalyticsToggles();
    initAnalyticsSaveButtons();
    initCSVUpload();
    loadAnalyticsConfigs();
});

// Tab navigation for analytics
function initAnalyticsTabs() {
    const tabs = document.querySelectorAll('.eio-analytics-tab');
    const contents = document.querySelectorAll('.eio-analytics-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-atab');

            // Update tab styles
            tabs.forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.style.border = '1px solid rgba(255,255,255,0.1)';
                t.style.color = '#aaa';
                t.style.fontWeight = 'normal';
            });
            tab.style.background = '#6246ea';
            tab.style.border = 'none';
            tab.style.color = '#fff';
            tab.style.fontWeight = '600';

            // Show/hide content
            contents.forEach(content => {
                if (content.getAttribute('data-acontent') === targetTab) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
}

// Toggle switches for analytics sections
function initAnalyticsToggles() {
    const toggleIds = ['toggleTiming', 'toggleProtection', 'toggleHotleads'];

    toggleIds.forEach(id => {
        const toggle = document.getElementById(id);
        if (!toggle) return;

        // Load saved state
        const savedState = localStorage.getItem(`eio_${id}_enabled`);
        let isActive = savedState !== 'false'; // Default to true

        // Set initial visual state
        updateToggleVisual(toggle, isActive);

        toggle.addEventListener('click', () => {
            isActive = !isActive;
            updateToggleVisual(toggle, isActive);
            localStorage.setItem(`eio_${id}_enabled`, isActive.toString());

            // Show feedback
            const statusText = isActive ? 'ativado' : 'desativado';
            const featureName = {
                'toggleTiming': 'Engajamento por Horário',
                'toggleProtection': 'Descanso Inteligente',
                'toggleHotleads': 'Detector de Leads Quentes'
            }[id];

            // Visual feedback - brief color flash
            toggle.style.transition = 'all 0.3s ease';
            console.log(`${featureName} ${statusText}`);
        });
    });
}

function updateToggleVisual(toggle, isActive) {
    const dot = toggle.querySelector('div');
    if (isActive) {
        toggle.style.background = toggle.id === 'toggleProtection' ? '#F44336' :
            toggle.id === 'toggleHotleads' ? '#FF5722' : '#6246ea';
        if (dot) {
            dot.style.right = '2px';
            dot.style.left = 'auto';
        }
    } else {
        toggle.style.background = 'rgba(255,255,255,0.2)';
        if (dot) {
            dot.style.left = '2px';
            dot.style.right = 'auto';
        }
    }
}

// Analytics save buttons
function initAnalyticsSaveButtons() {
    // Save Timing config
    document.getElementById('btnSaveTiming')?.addEventListener('click', () => {
        const config = {
            intensityNight: document.getElementById('intensityNight')?.value || '0',
            intensityDay: document.getElementById('intensityDay')?.value || '100',
            intensityPeak: document.getElementById('intensityPeak')?.value || '120',
            enabled: true
        };
        localStorage.setItem('eio_analytics_timing', JSON.stringify(config));
        alert('✅ Configurações de Horários salvas!');
    });

    // Save Protection config
    document.getElementById('btnSaveProtection')?.addEventListener('click', () => {
        const config = {
            pauseBlocked: document.getElementById('pauseBlocked')?.value || '24',
            pauseCaptcha: document.getElementById('pauseCaptcha')?.value || '4',
            pauseLimit: document.getElementById('pauseLimit')?.value || '1',
            notifyPause: document.getElementById('notifyPause')?.checked,
            notifyBlock: document.getElementById('notifyBlock')?.checked,
            notifyEmail: document.getElementById('notifyEmail')?.checked,
            enabled: true
        };
        localStorage.setItem('eio_analytics_protection', JSON.stringify(config));
        alert('✅ Configurações de Proteção salvas!');
    });

    // Save Hotleads config
    document.getElementById('btnSaveHotleads')?.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('[data-acontent="hotleads"] input[type="checkbox"]');
        const config = {
            triggers: Array.from(checkboxes).slice(0, 5).map(cb => cb.checked),
            actions: Array.from(checkboxes).slice(5).map(cb => cb.checked),
            enabled: true
        };
        localStorage.setItem('eio_analytics_hotleads', JSON.stringify(config));
        alert('✅ Configurações de Leads Quentes salvas!');
    });
}

// CSV Upload handling
function initCSVUpload() {
    document.getElementById('csvUpload')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            const lines = content.split('\n').filter(l => l.trim());
            const usernames = lines.map(l => l.trim().replace('@', ''));

            if (usernames.length > 0) {
                alert(`📥 ${usernames.length} usernames importados!\n\nPrimeiros 5:\n${usernames.slice(0, 5).map(u => '@' + u).join('\n')}\n\nOs leads serão enriquecidos quando a extensão estiver ativa.`);

                // Store imported leads
                const existingLeads = JSON.parse(localStorage.getItem('eio_imported_leads') || '[]');
                const newLeads = usernames.map(u => ({
                    username: u,
                    importedAt: new Date().toISOString(),
                    source: 'csv_import',
                    enriched: false
                }));
                localStorage.setItem('eio_imported_leads', JSON.stringify([...existingLeads, ...newLeads]));
            }
        };

        reader.readAsText(file);
    });
}

// Load saved analytics configs
function loadAnalyticsConfigs() {
    // Load Timing
    try {
        const timingConfig = JSON.parse(localStorage.getItem('eio_analytics_timing') || '{}');
        if (timingConfig.intensityNight) document.getElementById('intensityNight').value = timingConfig.intensityNight;
        if (timingConfig.intensityDay) document.getElementById('intensityDay').value = timingConfig.intensityDay;
        if (timingConfig.intensityPeak) document.getElementById('intensityPeak').value = timingConfig.intensityPeak;
    } catch (e) { console.log('No timing config saved'); }

    // Load Protection
    try {
        const protectionConfig = JSON.parse(localStorage.getItem('eio_analytics_protection') || '{}');
        if (protectionConfig.pauseBlocked) document.getElementById('pauseBlocked').value = protectionConfig.pauseBlocked;
        if (protectionConfig.pauseCaptcha) document.getElementById('pauseCaptcha').value = protectionConfig.pauseCaptcha;
        if (protectionConfig.pauseLimit) document.getElementById('pauseLimit').value = protectionConfig.pauseLimit;
        if (protectionConfig.notifyPause !== undefined) document.getElementById('notifyPause').checked = protectionConfig.notifyPause;
        if (protectionConfig.notifyBlock !== undefined) document.getElementById('notifyBlock').checked = protectionConfig.notifyBlock;
        if (protectionConfig.notifyEmail !== undefined) document.getElementById('notifyEmail').checked = protectionConfig.notifyEmail;
    } catch (e) { console.log('No protection config saved'); }
}

// ═══════════════════════════════════════════════════════════
// SMART PROTECTION HELPER FUNCTIONS (For extension integration)
// ═══════════════════════════════════════════════════════════

// Get current intensity based on time
window.getIntensityMultiplier = function () {
    const config = JSON.parse(localStorage.getItem('eio_analytics_timing') || '{}');
    const hour = new Date().getHours();

    // Night: 23h - 7h
    if (hour >= 23 || hour < 7) {
        return parseInt(config.intensityNight || '0') / 100;
    }
    // Peak: 18h - 23h
    if (hour >= 18 && hour < 23) {
        return parseInt(config.intensityPeak || '120') / 100;
    }
    // Day: 7h - 18h
    return parseInt(config.intensityDay || '100') / 100;
};

// Check if should pause based on protection rules
window.checkProtection = function (eventType) {
    const config = JSON.parse(localStorage.getItem('eio_analytics_protection') || '{}');
    const now = Date.now();
    const pauseUntil = parseInt(localStorage.getItem('eio_pause_until') || '0');

    // Check if currently paused
    if (now < pauseUntil) {
        const minutesLeft = Math.ceil((pauseUntil - now) / 60000);
        return {
            paused: true,
            reason: 'Pausa preventiva ativa',
            minutesLeft
        };
    }

    // Handle new events
    const pauseDurations = {
        'blocked': parseInt(config.pauseBlocked || '24') * 60,
        'captcha': parseInt(config.pauseCaptcha || '4') * 60,
        'limit': parseInt(config.pauseLimit || '1') * 60
    };

    if (eventType && pauseDurations[eventType]) {
        const pauseMinutes = pauseDurations[eventType];
        const newPauseUntil = now + (pauseMinutes * 60000);
        localStorage.setItem('eio_pause_until', newPauseUntil.toString());

        // Notify if enabled
        if (config.notifyPause) {
            showNotification(`🛡️ Pausa preventiva ativada por ${Math.floor(pauseMinutes / 60)}h para proteger sua conta`);
        }

        return {
            paused: true,
            reason: `Detectado: ${eventType}`,
            minutesLeft: pauseMinutes
        };
    }

    return { paused: false };
};

// Check if lead is hot
window.isHotLead = function (leadData) {
    const config = JSON.parse(localStorage.getItem('eio_analytics_hotleads') || '{}');
    const triggers = config.triggers || [true, true, true, true, true];

    let score = 0;
    const points = [5, 4, 4, 5, 6]; // Points for each trigger

    if (triggers[0] && leadData.repliedUnder1h) score += points[0];
    if (triggers[1] && leadData.profileVisits >= 3) score += points[1];
    if (triggers[2] && leadData.savedContent) score += points[2];
    if (triggers[3] && leadData.sharedContent) score += points[3];
    if (triggers[4] && leadData.mentionedInStory) score += points[4];

    const isHot = score >= 10;

    if (isHot && config.actions?.[0]) {
        showNotification(`🔥 Lead quente detectado! @${leadData.username}`);
    }

    return {
        isHot,
        score,
        shouldMoveToCRM: isHot && config.actions?.[1],
        shouldSendDM: isHot && config.actions?.[2]
    };
};

// Show desktop notification
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('E.I.O - Engajamento Inteligente', { body: message, icon: '/public/assets/official_brand_rocket.png' });
    } else {
        console.log('Notification:', message);
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ═══════════════════════════════════════════════════════════
// MESSAGES & AUTOMATION TABS
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initMessagesTabs();
    initMessagesToggles();
    initMessagesSaveButtons();
    loadMessagesConfigs();
});

// Tab navigation for messages
function initMessagesTabs() {
    const tabs = document.querySelectorAll('.eio-messages-tab');
    const contents = document.querySelectorAll('.eio-messages-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-mtab');

            // Update tab styles
            tabs.forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.style.border = '1px solid rgba(255,255,255,0.1)';
                t.style.color = '#aaa';
                t.style.fontWeight = 'normal';
            });
            tab.style.background = '#6246ea';
            tab.style.border = 'none';
            tab.style.color = '#fff';
            tab.style.fontWeight = '600';

            // Show/hide content
            contents.forEach(content => {
                if (content.getAttribute('data-mcontent') === targetTab) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
}

// Toggle switches for messages sections
function initMessagesToggles() {
    const toggleIds = ['toggleSequences', 'toggleStoryReply'];

    toggleIds.forEach(id => {
        const toggle = document.getElementById(id);
        if (!toggle) return;

        const savedState = localStorage.getItem(`eio_${id}_enabled`);
        let isActive = savedState !== 'false';

        updateToggleVisual(toggle, isActive);

        toggle.addEventListener('click', () => {
            isActive = !isActive;
            updateToggleVisual(toggle, isActive);
            localStorage.setItem(`eio_${id}_enabled`, isActive.toString());

            const featureName = {
                'toggleSequences': 'Sequências de Follow-up',
                'toggleStoryReply': 'Auto-Responder Stories'
            }[id];

            console.log(`${featureName} ${isActive ? 'ativado' : 'desativado'}`);
        });
    });
}

// Messages save buttons
function initMessagesSaveButtons() {
    // Save Sequences
    document.getElementById('btnSaveSequences')?.addEventListener('click', () => {
        const messages = document.querySelectorAll('.sequence-message');
        const sequences = Array.from(messages).map(m => ({
            day: m.getAttribute('data-day'),
            message: m.value
        }));

        const stopConditions = document.querySelectorAll('[data-mcontent="sequences"] input[type="checkbox"]:not(.sequence-message)');
        const conditions = Array.from(stopConditions).map(c => c.checked);

        localStorage.setItem('eio_dm_sequences', JSON.stringify({ sequences, stopConditions: conditions }));
        alert('✅ Sequências de Follow-up salvas!');
    });

    // Save Quick Replies
    document.getElementById('btnSaveQuickReplies')?.addEventListener('click', () => {
        const templates = document.querySelectorAll('.quick-template');
        const quickReplies = Array.from(templates).map(t => ({
            name: t.closest('div').querySelector('input')?.value || 'Template',
            content: t.value
        }));

        localStorage.setItem('eio_quick_replies', JSON.stringify(quickReplies));
        alert('✅ Templates de Respostas Rápidas salvos!');
    });

    // Save Story Reply
    document.getElementById('btnSaveStoryReply')?.addEventListener('click', () => {
        const responses = document.querySelectorAll('.story-response');
        const checkboxes = document.querySelectorAll('[data-mcontent="storyreply"] input[type="checkbox"]');

        const storyReply = {
            mention: {
                enabled: checkboxes[0]?.checked || false,
                response: responses[0]?.value || ''
            },
            hashtag: {
                enabled: checkboxes[1]?.checked || false,
                tags: document.getElementById('storyHashtags')?.value || '',
                response: responses[1]?.value || ''
            },
            location: {
                enabled: checkboxes[2]?.checked || false,
                locations: document.getElementById('storyLocations')?.value || '',
                response: responses[2]?.value || ''
            }
        };

        localStorage.setItem('eio_story_reply', JSON.stringify(storyReply));
        alert('✅ Configurações de Auto-Responder Stories salvas!');
    });

    // Add sequence step button
    document.getElementById('btnAddSequenceStep')?.addEventListener('click', () => {
        const container = document.getElementById('sequenceSteps');
        if (!container) return;

        const lastDay = container.querySelectorAll('[data-day]').length;
        const newDay = [0, 2, 5, 7, 10, 14, 21, 30][lastDay] || (lastDay * 3);

        const newStep = document.createElement('div');
        newStep.style.cssText = 'padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;';
        newStep.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="background: #9C27B0; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">DIA ${newDay}</span>
                <button class="eio-btn eio-btn-ghost eio-btn-sm remove-step" style="color: #F44336;">🗑️</button>
            </div>
            <textarea class="eio-input sequence-message" rows="3" style="width: 100%; padding: 12px;" data-day="${newDay}">{hora_do_dia}, {primeiro_nome}! 

Sua mensagem aqui...</textarea>
        `;
        container.appendChild(newStep);

        // Add remove handler
        newStep.querySelector('.remove-step')?.addEventListener('click', () => newStep.remove());
    });

    // Add quick reply template button
    document.getElementById('btnAddQuickReply')?.addEventListener('click', () => {
        const container = document.getElementById('quickReplyTemplates');
        if (!container) return;

        const newTemplate = document.createElement('div');
        newTemplate.style.cssText = 'padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;';
        newTemplate.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <input type="text" class="eio-input" value="Novo Template" style="background: transparent; border: none; color: #fff; font-weight: 600; padding: 0;">
                <button class="eio-btn eio-btn-ghost eio-btn-sm remove-template" style="color: #F44336;">🗑️</button>
            </div>
            <textarea class="eio-input quick-template" rows="4" style="width: 100%; padding: 12px;">{hora_do_dia}, {primeiro_nome}!

Digite sua mensagem aqui usando as variáveis disponíveis.</textarea>
        `;
        container.appendChild(newTemplate);

        // Add remove handler
        newTemplate.querySelector('.remove-template')?.addEventListener('click', () => newTemplate.remove());
    });
}

// Load saved messages configs
function loadMessagesConfigs() {
    // Load Sequences
    try {
        const seqConfig = JSON.parse(localStorage.getItem('eio_dm_sequences') || '{}');
        if (seqConfig.sequences) {
            seqConfig.sequences.forEach(seq => {
                const textarea = document.querySelector(`.sequence-message[data-day="${seq.day}"]`);
                if (textarea) textarea.value = seq.message;
            });
        }
    } catch (e) { console.log('No sequence config saved'); }

    // Load Story Reply
    try {
        const storyConfig = JSON.parse(localStorage.getItem('eio_story_reply') || '{}');
        if (storyConfig.mention) {
            const checkboxes = document.querySelectorAll('[data-mcontent="storyreply"] input[type="checkbox"]');
            const responses = document.querySelectorAll('.story-response');

            if (checkboxes[0]) checkboxes[0].checked = storyConfig.mention.enabled;
            if (responses[0]) responses[0].value = storyConfig.mention.response;

            if (checkboxes[1]) checkboxes[1].checked = storyConfig.hashtag?.enabled;
            if (document.getElementById('storyHashtags')) document.getElementById('storyHashtags').value = storyConfig.hashtag?.tags || '';
            if (responses[1]) responses[1].value = storyConfig.hashtag?.response || '';

            if (checkboxes[2]) checkboxes[2].checked = storyConfig.location?.enabled;
            if (document.getElementById('storyLocations')) document.getElementById('storyLocations').value = storyConfig.location?.locations || '';
            if (responses[2]) responses[2].value = storyConfig.location?.response || '';
        }
    } catch (e) { console.log('No story reply config saved'); }
}

// ═══════════════════════════════════════════════════════════
// DM AUTOMATION HELPER FUNCTIONS (For extension integration)
// ═══════════════════════════════════════════════════════════

// Get follow-up sequence for a user
window.getFollowUpSequence = function () {
    const config = JSON.parse(localStorage.getItem('eio_dm_sequences') || '{}');
    return config.sequences || [];
};

// Process DM template with user data
window.processDMTemplate = function (template, userData) {
    const hour = new Date().getHours();
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    const followDays = userData.followedDaysAgo || 0;
    const tempoSeguindo = followDays === 0 ? 'desde hoje' :
        followDays === 1 ? 'há 1 dia' :
            `há ${followDays} dias`;

    return template
        .replace(/{primeiro_nome}/g, userData.firstName || userData.name?.split(' ')[0] || userData.username || 'você')
        .replace(/{hora_do_dia}/g, saudacao)
        .replace(/{ultimo_post}/g, userData.lastPost || 'nosso conteúdo')
        .replace(/{tempo_seguindo}/g, tempoSeguindo)
        .replace(/{username}/g, userData.username || '')
        .replace(/{seguidores}/g, userData.followers || '0')
        .replace(/{produto}/g, userData.product || 'nosso serviço');
};

// Check if should send story reply
window.checkStoryReplyTrigger = function (storyData) {
    const config = JSON.parse(localStorage.getItem('eio_story_reply') || '{}');

    // Check mention
    if (config.mention?.enabled && storyData.hasMention) {
        return { shouldReply: true, response: config.mention.response, trigger: 'mention' };
    }

    // Check hashtag
    if (config.hashtag?.enabled && storyData.hashtags) {
        const monitoredTags = (config.hashtag.tags || '').toLowerCase().split(',').map(t => t.trim());
        const storyTags = storyData.hashtags.map(t => t.toLowerCase());
        const matched = monitoredTags.some(tag => storyTags.includes(tag));
        if (matched) {
            return { shouldReply: true, response: config.hashtag.response, trigger: 'hashtag' };
        }
    }

    // Check location
    if (config.location?.enabled && storyData.location) {
        const monitoredLocs = (config.location.locations || '').toLowerCase().split(',').map(l => l.trim());
        const storyLoc = storyData.location.toLowerCase();
        const matched = monitoredLocs.some(loc => storyLoc.includes(loc));
        if (matched) {
            return { shouldReply: true, response: config.location.response, trigger: 'location' };
        }
    }

    return { shouldReply: false };
};

// Check if should stop sequence
window.shouldStopSequence = function (messageText) {
    const stopWords = ['parar', 'stop', 'não quero', 'para', 'cancelar', 'unsubscribe'];
    const lowerMessage = messageText.toLowerCase();
    return stopWords.some(word => lowerMessage.includes(word));
};

// ═══════════════════════════════════════════════════════════
// PRO TOOLS - FERRAMENTAS AVANÇADAS
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initProToolsTabs();
    initProToolsToggles();
    initProToolsSaveButtons();
    initBioOptimizer();
    loadProToolsConfigs();
});

// Tab navigation for Pro Tools
function initProToolsTabs() {
    const tabs = document.querySelectorAll('.eio-protools-tab');
    const contents = document.querySelectorAll('.eio-protools-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-ptab');

            // Update tab styles
            tabs.forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.style.border = '1px solid rgba(255,255,255,0.1)';
                t.style.color = '#aaa';
                t.style.fontWeight = 'normal';
            });
            tab.style.background = '#6246ea';
            tab.style.border = 'none';
            tab.style.color = '#fff';
            tab.style.fontWeight = '600';

            // Show/hide content
            contents.forEach(content => {
                if (content.getAttribute('data-pcontent') === targetTab) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
}

// Toggle switches for Pro Tools sections
function initProToolsToggles() {
    const toggleIds = ['toggleFingerprint', 'toggleActionBlock', 'toggleContentSpy', 'toggleMentions', 'toggleWeeklyReport'];

    toggleIds.forEach(id => {
        const toggle = document.getElementById(id);
        if (!toggle) return;

        const savedState = localStorage.getItem(`eio_${id}_enabled`);
        let isActive = savedState !== 'false';

        updateToggleVisual(toggle, isActive);

        toggle.addEventListener('click', () => {
            isActive = !isActive;
            updateToggleVisual(toggle, isActive);
            localStorage.setItem(`eio_${id}_enabled`, isActive.toString());
            console.log(`${id} ${isActive ? 'ativado' : 'desativado'}`);
        });
    });
}

// Pro Tools save buttons
function initProToolsSaveButtons() {
    // Save Security Settings
    document.getElementById('btnSaveSecurity')?.addEventListener('click', () => {
        const securityConfig = {
            fingerprint: {
                scrollRandomly: document.getElementById('scrollRandomly')?.checked,
                readBeforeLike: document.getElementById('readBeforeLike')?.checked,
                typoCorrection: document.getElementById('typoCorrection')?.checked,
                mouseNatural: document.getElementById('mouseNatural')?.checked
            },
            breaks: {
                lunchStart: document.getElementById('breakStart')?.value,
                lunchEnd: document.getElementById('breakEnd')?.value,
                sleepStart: document.getElementById('sleepStart')?.value,
                sleepEnd: document.getElementById('sleepEnd')?.value
            }
        };
        localStorage.setItem('eio_security_config', JSON.stringify(securityConfig));
        alert('✅ Configurações de Segurança salvas!');
    });

    // Save Content Spy
    document.getElementById('btnSaveContentSpy')?.addEventListener('click', () => {
        const profiles = [];
        document.querySelectorAll('#spyProfilesList span').forEach(span => {
            const text = span.textContent.replace(' ✕', '').trim();
            if (text && text.startsWith('@')) profiles.push(text);
        });
        localStorage.setItem('eio_content_spy_profiles', JSON.stringify(profiles));
        alert('✅ Perfis para monitorar salvos!');
    });

    // Save Mentions
    document.getElementById('btnSaveMentions')?.addEventListener('click', () => {
        const mentionResponses = {};
        document.querySelectorAll('.mention-response').forEach(textarea => {
            const type = textarea.getAttribute('data-type');
            mentionResponses[type] = textarea.value;
        });
        localStorage.setItem('eio_mention_responses', JSON.stringify(mentionResponses));
        alert('✅ Configurações de Menções salvas!');
    });

    // Add Competitor
    document.getElementById('btnAddCompetitor')?.addEventListener('click', () => {
        const input = document.getElementById('competitorInput');
        const list = document.getElementById('competitorsList');
        if (!input || !list) return;

        let username = input.value.trim();
        if (!username) return;
        if (!username.startsWith('@')) username = '@' + username;

        // Clear empty state if present
        if (list.children[0]?.textContent?.includes('Adicione até')) {
            list.innerHTML = '';
        }

        const tag = document.createElement('div');
        tag.style.cssText = 'display: flex; justify-content: space-between; padding: 15px; background: rgba(33, 150, 243, 0.1); border-radius: 8px;';
        tag.innerHTML = `
            <span style="color: #2196F3; font-weight: 500;">${username}</span>
            <button class="eio-btn eio-btn-ghost eio-btn-sm remove-competitor" style="color: #F44336;">✕</button>
        `;
        list.appendChild(tag);
        input.value = '';

        tag.querySelector('.remove-competitor')?.addEventListener('click', () => tag.remove());
    });

    // Add Spy Profile
    document.getElementById('btnAddSpyProfile')?.addEventListener('click', () => {
        const input = document.getElementById('spyProfileInput');
        const list = document.getElementById('spyProfilesList');
        if (!input || !list) return;

        let username = input.value.trim();
        if (!username) return;
        if (!username.startsWith('@')) username = '@' + username;

        const tag = document.createElement('span');
        tag.style.cssText = 'background: rgba(156, 39, 176, 0.2); color: #9C27B0; padding: 8px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer;';
        tag.textContent = `${username} ✕`;
        tag.addEventListener('click', () => tag.remove());
        list.appendChild(tag);
        input.value = '';
    });
}

// Bio Optimizer functionality
function initBioOptimizer() {
    document.getElementById('btnAnalyzeBio')?.addEventListener('click', () => {
        const bio = document.getElementById('currentBio')?.value || '';
        const problemsContainer = document.getElementById('bioProblems');
        const suggestionContainer = document.getElementById('bioSuggestion');

        if (!problemsContainer || !suggestionContainer) return;

        const problems = [];

        // Check for common issues
        if (!bio.includes('DM') && !bio.includes('dm') && !bio.includes('mensagem')) {
            problems.push({ icon: '❌', text: 'Sem call-to-action para DM' });
        }
        if (!/[\u{1F300}-\u{1F9FF}]/u.test(bio)) {
            problems.push({ icon: '❌', text: 'Sem emojis para destaque visual' });
        }
        if (!bio.includes('link') && !bio.includes('⬇') && !bio.includes('👇')) {
            problems.push({ icon: '❌', text: 'Sem indicação do link na bio' });
        }
        if (bio.length < 30) {
            problems.push({ icon: '❌', text: 'Bio muito curta - não comunica valor' });
        }
        if (bio.length > 0 && !bio.includes(' a ') && !bio.includes(' te ') && !bio.includes(' você ')) {
            problems.push({ icon: '⚠️', text: 'Não fala diretamente com o público' });
        }

        // Display problems
        if (problems.length === 0) {
            problemsContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                    <span style="color: #4CAF50;">✅</span>
                    <span style="color: rgba(255,255,255,0.7);">Sua bio parece estar bem otimizada!</span>
                </div>
            `;
        } else {
            problemsContainer.innerHTML = problems.map(p => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(244, 67, 54, 0.1); border-radius: 8px;">
                    <span style="color: #F44336;">${p.icon}</span>
                    <span style="color: rgba(255,255,255,0.7);">${p.text}</span>
                </div>
            `).join('');
        }

        // Generate suggestion based on analysis
        if (bio.length > 0) {
            suggestionContainer.innerHTML = `
                🚀 ${bio.split(' ').slice(0, 3).join(' ')} | Resultados reais<br>
                📩 DM "QUERO" para consultoria GRÁTIS<br>
                🔗 Link exclusivo na bio ⬇️
            `;
        }
    });

    // Copy bio button
    document.getElementById('btnCopyBio')?.addEventListener('click', () => {
        const suggestion = document.getElementById('bioSuggestion')?.innerText || '';
        navigator.clipboard.writeText(suggestion).then(() => {
            alert('✅ Bio copiada para a área de transferência!');
        });
    });
}

// Load saved Pro Tools configs
function loadProToolsConfigs() {
    // Load security config
    try {
        const securityConfig = JSON.parse(localStorage.getItem('eio_security_config') || '{}');
        if (securityConfig.fingerprint) {
            if (document.getElementById('scrollRandomly')) document.getElementById('scrollRandomly').checked = securityConfig.fingerprint.scrollRandomly !== false;
            if (document.getElementById('readBeforeLike')) document.getElementById('readBeforeLike').checked = securityConfig.fingerprint.readBeforeLike !== false;
            if (document.getElementById('typoCorrection')) document.getElementById('typoCorrection').checked = securityConfig.fingerprint.typoCorrection !== false;
            if (document.getElementById('mouseNatural')) document.getElementById('mouseNatural').checked = securityConfig.fingerprint.mouseNatural !== false;
        }
        if (securityConfig.breaks) {
            if (document.getElementById('breakStart')) document.getElementById('breakStart').value = securityConfig.breaks.lunchStart || '12:00';
            if (document.getElementById('breakEnd')) document.getElementById('breakEnd').value = securityConfig.breaks.lunchEnd || '14:00';
            if (document.getElementById('sleepStart')) document.getElementById('sleepStart').value = securityConfig.breaks.sleepStart || '23:00';
            if (document.getElementById('sleepEnd')) document.getElementById('sleepEnd').value = securityConfig.breaks.sleepEnd || '07:00';
        }
    } catch (e) { console.log('No security config saved'); }

    // Load mention responses
    try {
        const mentionResponses = JSON.parse(localStorage.getItem('eio_mention_responses') || '{}');
        document.querySelectorAll('.mention-response').forEach(textarea => {
            const type = textarea.getAttribute('data-type');
            if (mentionResponses[type]) textarea.value = mentionResponses[type];
        });
    } catch (e) { console.log('No mention config saved'); }
}

// ═══════════════════════════════════════════════════════════
// SECURITY HELPER FUNCTIONS (For extension integration)
// ═══════════════════════════════════════════════════════════

// Get human behavior configuration
window.getHumanBehaviorConfig = function () {
    const config = JSON.parse(localStorage.getItem('eio_security_config') || '{}');
    return {
        scrollRandomly: config.fingerprint?.scrollRandomly !== false,
        readBeforeLike: config.fingerprint?.readBeforeLike !== false,
        typoCorrection: config.fingerprint?.typoCorrection !== false,
        mouseMovements: config.fingerprint?.mouseNatural !== false ? 'natural' : 'linear',
        breakTimes: [`${config.breaks?.lunchStart || '12:00'}-${config.breaks?.lunchEnd || '14:00'}`],
        sleepHours: [`${config.breaks?.sleepStart || '23:00'}-${config.breaks?.sleepEnd || '07:00'}`]
    };
};

// Check if currently in break/sleep time
window.isInBreakTime = function () {
    const config = JSON.parse(localStorage.getItem('eio_security_config') || '{}');
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check lunch break
    const lunchStart = (config.breaks?.lunchStart || '12:00').split(':').map(Number);
    const lunchEnd = (config.breaks?.lunchEnd || '14:00').split(':').map(Number);
    const lunchStartMinutes = lunchStart[0] * 60 + lunchStart[1];
    const lunchEndMinutes = lunchEnd[0] * 60 + lunchEnd[1];

    if (currentMinutes >= lunchStartMinutes && currentMinutes <= lunchEndMinutes) {
        return { inBreak: true, reason: 'lunch', resumeAt: config.breaks?.lunchEnd };
    }

    // Check sleep time
    const sleepStart = (config.breaks?.sleepStart || '23:00').split(':').map(Number);
    const sleepEnd = (config.breaks?.sleepEnd || '07:00').split(':').map(Number);
    const sleepStartMinutes = sleepStart[0] * 60 + sleepStart[1];
    const sleepEndMinutes = sleepEnd[0] * 60 + sleepEnd[1];

    // Handle overnight sleep (e.g., 23:00-07:00)
    if (sleepStartMinutes > sleepEndMinutes) {
        if (currentMinutes >= sleepStartMinutes || currentMinutes <= sleepEndMinutes) {
            return { inBreak: true, reason: 'sleep', resumeAt: config.breaks?.sleepEnd };
        }
    } else {
        if (currentMinutes >= sleepStartMinutes && currentMinutes <= sleepEndMinutes) {
            return { inBreak: true, reason: 'sleep', resumeAt: config.breaks?.sleepEnd };
        }
    }

    return { inBreak: false };
};

// Detect action block from Instagram response
window.detectActionBlock = function (responseText) {
    const response = responseText.toLowerCase();

    if (response.includes('try again later')) {
        return { blocked: true, severity: 'low', pauseHours: 2, message: 'Limite temporário atingido' };
    }
    if (response.includes('we limit how often')) {
        return { blocked: true, severity: 'medium', pauseHours: 24, message: 'Limite de ações do Instagram' };
    }
    if (response.includes('suspicious activity') || response.includes('atividade suspeita')) {
        return { blocked: true, severity: 'high', pauseHours: 48, message: 'Atividade suspeita detectada - ALERTA!' };
    }

    return { blocked: false };
};

// Log action block
window.logActionBlock = function (blockInfo) {
    const history = JSON.parse(localStorage.getItem('eio_block_history') || '[]');
    history.unshift({
        date: new Date().toISOString(),
        severity: blockInfo.severity,
        message: blockInfo.message,
        pauseHours: blockInfo.pauseHours
    });
    // Keep only last 30 entries
    localStorage.setItem('eio_block_history', JSON.stringify(history.slice(0, 30)));

    // Show notification
    if (typeof showNotification === 'function') {
        showNotification(`⚠️ ${blockInfo.message} - Pausando por ${blockInfo.pauseHours}h`);
    }
};

// Get random delay for human-like behavior
window.getHumanDelay = function (minMs = 2000, maxMs = 5000) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

// Simulate typing with typos
window.simulateTyping = function (text) {
    const config = JSON.parse(localStorage.getItem('eio_security_config') || '{}');
    if (!config.fingerprint?.typoCorrection) return [{ text, delay: 0 }];

    const steps = [];
    const typoChance = 0.1; // 10% chance of typo

    for (let i = 0; i < text.length; i++) {
        // Occasionally make a typo
        if (Math.random() < typoChance && i > 0 && i < text.length - 1) {
            // Type wrong character
            steps.push({ text: text.substring(0, i) + 'x', delay: 100 + Math.random() * 100 });
            // Delete it
            steps.push({ text: text.substring(0, i), delay: 300 + Math.random() * 200 });
        }
        steps.push({ text: text.substring(0, i + 1), delay: 50 + Math.random() * 150 });
    }

    return steps;
};

// ═══════════════════════════════════════════════════════════
// EXPLORADOR DE LEADS & CENTRAL DE SUCESSO
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Lógica da Central de Sucesso (Mostrar apenas na Home) ---
    const successCenter = document.getElementById('successCenter');

    // Sobrescrever a função de navegação original para controlar a visibilidade da Central
    // Hook se possível, mas aqui vamos monitorar cliques

    const navLinks = document.querySelectorAll('.eio-nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('data-page');
            if (successCenter) {
                if (page === 'dashboard' || !page) {
                    successCenter.style.display = 'block';
                } else {
                    successCenter.style.display = 'none';
                }
            }
        });
    });

    // Inicializar visibilidade correta
    if (successCenter) {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        if (hash === 'dashboard' || hash === '') {
            successCenter.style.display = 'block';
        } else {
            successCenter.style.display = 'none';
        }
    }


    // --- 2. Gerador de PDF Guide ---
    const downloadBtn = document.getElementById('downloadGuideBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Conteúdo do PDF
            const content = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Helvetica', sans-serif; color: #000000; padding: 20px; background: #ffffff; }
                    .header { text-align: center; border-bottom: 2px solid #7F5AF0; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: bold; color: #7F5AF0; }
                    h1 { font-size: 24px; margin: 10px 0; color: #000000; }
                    p { color: #333333; }
                    .section { margin-bottom: 25px; background: #f0f0f5; padding: 15px; border-radius: 8px; border-left: 5px solid #7F5AF0; color: #000000; }
                    h2 { font-size: 16px; color: #7F5AF0; margin-top: 0; }
                    .checkbox-item { margin-bottom: 10px; font-size: 14px; color: #000000 !important; }
                    .checkbox-item strong { color: #000000; }
                    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
                </style>
            </head>
            <body style="background-color: #ffffff; color: #000000;">
                <div class="header">
                    <div class="logo">E.I.O System</div>
                    <h1>Checklist: Decolagem em 5 Passos 🚀</h1>
                    <p>Guia de configuração rápida para capturar leads nas próximas 24 horas.</p>
                </div>
                <div class="section">
                    <h2>1. Instalação e Conexão 🛠️</h2>
                    <div class="checkbox-item">⬜ <strong>Baixe a Extensão:</strong> Instale a extensão oficial E.I.O.</div>
                    <div class="checkbox-item">⬜ <strong>Login Seguro:</strong> Conecte sua conta do Instagram.</div>
                    <div class="checkbox-item">⬜ <strong>Ative o Escudo:</strong> Verifique os limites de segurança.</div>
                </div>
                <div class="section">
                    <h2>2. Configure seu Agente 🤖</h2>
                    <div class="checkbox-item">⬜ <strong>Saudação:</strong> Escreva uma mensagem humana.</div>
                    <div class="checkbox-item">⬜ <strong>Variáveis:</strong> Use {primeiro_nome} para personalizar.</div>
                </div>
                <div class="section">
                    <h2>3. Primeira Mineração 🔍</h2>
                    <div class="checkbox-item">⬜ <strong>Escolha o Nicho:</strong> Digite o cargo do cliente ideal.</div>
                    <div class="checkbox-item">⬜ <strong>Filtro Brasil:</strong> Ative "Brasil Only".</div>
                    <div class="checkbox-item">⬜ <strong>Extração:</strong> Clique em "Explorar".</div>
                </div>
                <div class="section">
                    <h2>4. Organização no CRM 📈</h2>
                    <div class="checkbox-item">⬜ <strong>Mover Leads:</strong> Envie para "Prospecção".</div>
                    <div class="checkbox-item">⬜ <strong>Tags:</strong> Identifique "Cliente Quente".</div>
                </div>
                <div class="section">
                    <h2>5. Controle Financeiro 💰</h2>
                    <div class="checkbox-item">⬜ <strong>Anexe Comprovante:</strong> Para liberação rápida.</div>
                </div>
                <div class="footer">&copy; 2026 E.I.O System. Sucesso garantido.</div>
            </body>
            </html>`;

            // Configuração html2pdf
            const opt = {
                margin: 10,
                filename: 'CHECKLIST_EIO_DECOLAGEM.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Gerar - Verificando se a lib carregou
            if (window.html2pdf) {
                html2pdf().from(content).set(opt).save().then(() => {
                    alert('✅ Guia baixado com sucesso! Siga o passo a passo para resultados imediatos.');
                });
            } else {
                alert('⚠️ Biblioteca de PDF carregando... Tente novamente em alguns segundos.');
            }
        });
    }


    // --- 3. Lógica do Explorador de Leads (REAL - Conecta com a Extensão) ---
    const btnStartExploration = document.getElementById('btnStartExploration');
    const explorerResults = document.getElementById('explorerResults');
    const explorerSearch = document.getElementById('explorerSearch');

    // Estado global dos leads encontrados
    window.exploredLeads = [];

    if (btnStartExploration) {
        btnStartExploration.addEventListener('click', async () => {
            const query = explorerSearch?.value?.trim();
            const brazilOnly = document.getElementById('filterBrazil')?.checked;
            const contactOnly = document.getElementById('filterContact')?.checked;

            if (!query) {
                alert('⚠️ Digite um termo para buscar (ex: @perfil_referencia, hashtag, ou nicho)');
                return;
            }

            // UI Feedback
            btnStartExploration.disabled = true;
            btnStartExploration.innerHTML = `<span class="spinner" style="width:20px;height:20px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;margin-right:8px"></span> Minerando...`;

            explorerResults.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #aaa;">
                        <div style="margin-bottom: 20px; font-size: 2rem;">🛰️</div>
                        <div>Conectando à extensão E.I.O...</div>
                        <div style="margin-top: 10px; font-size: 0.8rem; color: #666;">
                            Abrindo Instagram e buscando perfis para "<b>${query}</b>"
                        </div>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(255,200,0,0.1); border-radius: 8px; color: #ffd54f; font-size: 0.85rem;">
                            💡 Certifique-se de que o Instagram está aberto em outra aba e a extensão E.I.O está ativa
                        </div>
                    </td>
                </tr>
            `;

            try {
                // Tenta comunicar com a extensão
                const extensionId = await getExtensionId();

                if (!extensionId) {
                    throw new Error('Extensão E.I.O não detectada. Instale a extensão e recarregue a página.');
                }

                // Envia comando para a extensão explorar leads
                const response = await sendMessageToExtension({
                    action: 'exploreLeads',
                    payload: {
                        query: query,
                        filters: {
                            brazilOnly: brazilOnly,
                            contactOnly: contactOnly,
                            limit: 50
                        }
                    }
                });

                if (response?.success && response?.leads?.length > 0) {
                    window.exploredLeads = response.leads;
                    renderExplorerResults(response.leads, contactOnly);
                    alert(`✅ Varredura Concluída! ${response.leads.length} leads encontrados.`);
                } else {
                    // Fallback: Instruções para uso manual via extensão
                    explorerResults.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: #aaa;">
                                <div style="margin-bottom: 15px; font-size: 2rem;">📋</div>
                                <div style="font-size: 1.1rem; color: #fff; margin-bottom: 15px;">Use a Extensão para Explorar Leads</div>
                                <div style="text-align: left; max-width: 500px; margin: 0 auto; color: #ccc; line-height: 1.8;">
                                    <p><b>Passo a Passo:</b></p>
                                    <p>1️⃣ Vá para o perfil de um <b>concorrente</b> ou <b>influenciador</b> do nicho</p>
                                    <p>2️⃣ Clique na lista de <b>"Seguidores"</b></p>
                                    <p>3️⃣ Abra a <b>extensão E.I.O</b> e clique em <b>"Carregar Contas"</b></p>
                                    <p>4️⃣ A extensão vai extrair os dados dos seguidores</p>
                                    <p>5️⃣ Os leads aparecerão aqui automaticamente! 🚀</p>
                                </div>
                                <div style="margin-top: 20px;">
                                    <a href="https://instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}" 
                                       target="_blank"
                                       style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #7F5AF0, #2CB67D); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                        🔍 Buscar "${query}" no Instagram
                                    </a>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                console.log('Explorer error:', error.message);
                // Mostra instruções para uso manual
                explorerResults.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: #aaa;">
                            <div style="margin-bottom: 15px; font-size: 2rem;">🔌</div>
                            <div style="font-size: 1.1rem; color: #fff; margin-bottom: 15px;">Conecte a Extensão E.I.O</div>
                            <div style="background: rgba(255,100,100,0.1); padding: 15px; border-radius: 8px; color: #ff6b6b; margin-bottom: 20px;">
                                ${error.message}
                            </div>
                            <div style="text-align: left; max-width: 500px; margin: 0 auto; color: #ccc; line-height: 1.8;">
                                <p><b>Para explorar leads reais:</b></p>
                                <p>1️⃣ Instale a extensão E.I.O no Chrome</p>
                                <p>2️⃣ Vá para o Instagram e abra a lista de seguidores de um perfil</p>
                                <p>3️⃣ Use a extensão para carregar e filtrar as contas</p>
                                <p>4️⃣ Selecione os leads e processe as ações desejadas</p>
                            </div>
                        </td>
                    </tr>
                `;
            }

            // Reset botão
            btnStartExploration.disabled = false;
            btnStartExploration.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Explorar Agora`;
        });
    }

    // Função para renderizar resultados do explorador
    function renderExplorerResults(leads, contactOnly) {
        let filtered = leads;
        if (contactOnly) {
            filtered = leads.filter(l => l.contact && l.contact !== 'Sem contato visível');
        }

        if (filtered.length === 0) {
            explorerResults.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #aaa;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📭</div>
                        <div>Nenhum lead encontrado com os filtros selecionados</div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach(lead => {
            const hasContact = lead.contact && lead.contact !== 'Sem contato visível';
            const intentionBadge = hasContact
                ? '<span style="background: rgba(46, 204, 113, 0.2); color: #2ecc71; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">Alta Intenção</span>'
                : '<span style="background: rgba(255, 255, 255, 0.1); color: #aaa; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">Baixa</span>';

            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);" data-username="${lead.username || lead.user}">
                    <td style="padding: 15px;"><input type="checkbox" class="lead-checkbox"></td>
                    <td style="padding: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${lead.profilePic || ''}" 
                                 onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
                                 style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                            <div style="width: 32px; height: 32px; background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%); border-radius: 50%; display: none;"></div>
                            <div>
                                <div style="font-weight: bold; color: #fff;">${lead.fullName || lead.name || 'Sem nome'}</div>
                                <div style="font-size: 0.85rem; color: #aaa;">@${lead.username || lead.user}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 15px; max-width: 200px; color: #ccc; font-size: 0.9rem;">${lead.bio || '-'}</td>
                    <td style="padding: 15px; font-size: 0.9rem; color: #fff;">${lead.contact || 'Sem contato visível'}</td>
                    <td style="padding: 15px;">${intentionBadge}</td>
                </tr>
            `;
        });

        explorerResults.innerHTML = html;
    }

    // Função auxiliar para detectar ID da extensão
    async function getExtensionId() {
        return new Promise((resolve) => {
            // Tenta detectar a extensão via postMessage
            window.postMessage({ type: 'EIO_PING' }, '*');

            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve(null);
            }, 2000);

            function handler(event) {
                if (event.data?.type === 'EIO_PONG') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(event.data.extensionId || 'detected');
                }
            }
            window.addEventListener('message', handler);
        });
    }

    // Função para enviar mensagem para a extensão
    async function sendMessageToExtension(message) {
        return new Promise((resolve) => {
            window.postMessage({ type: 'EIO_COMMAND', ...message }, '*');

            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ success: false, error: 'Timeout' });
            }, 30000);

            function handler(event) {
                if (event.data?.type === 'EIO_RESPONSE') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(event.data);
                }
            }
            window.addEventListener('message', handler);
        });
    }

    // Botão Exportar Excel (REAL)
    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            const leads = window.exploredLeads || [];
            if (leads.length === 0) {
                alert('⚠️ Nenhum lead para exportar. Faça uma busca primeiro.');
                return;
            }

            // Criar CSV real
            const headers = ['Username', 'Nome', 'Bio', 'Contato', 'Seguidores', 'Seguindo'];
            const csvContent = [
                headers.join(','),
                ...leads.map(lead => [
                    lead.username || lead.user || '',
                    `"${(lead.fullName || lead.name || '').replace(/"/g, '""')}"`,
                    `"${(lead.bio || '').replace(/"/g, '""')}"`,
                    `"${(lead.contact || '').replace(/"/g, '""')}"`,
                    lead.followers || '',
                    lead.following || ''
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `eio_leads_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            alert(`📊 Exportado: ${leads.length} leads para CSV!`);
        });
    }

    // Botão Enviar CRM (REAL)
    const btnSendToCRM = document.getElementById('btnSendToCRM');
    if (btnSendToCRM) {
        btnSendToCRM.addEventListener('click', async () => {
            const selectedCheckboxes = document.querySelectorAll('.lead-checkbox:checked');

            if (selectedCheckboxes.length === 0) {
                alert('⚠️ Selecione pelo menos um lead para enviar ao CRM');
                return;
            }

            const selectedUsernames = [];
            selectedCheckboxes.forEach(cb => {
                const row = cb.closest('tr');
                const username = row?.dataset?.username;
                if (username) selectedUsernames.push(username);
            });

            const leadsToSend = (window.exploredLeads || []).filter(l =>
                selectedUsernames.includes(l.username || l.user)
            );

            if (leadsToSend.length === 0) {
                alert('⚠️ Nenhum lead selecionado encontrado');
                return;
            }

            // Aqui você pode integrar com seu backend real
            // Por agora, salva no localStorage para o CRM usar
            const existingLeads = JSON.parse(localStorage.getItem('eio_crm_leads') || '[]');
            const newLeads = leadsToSend.map(lead => ({
                ...lead,
                stage: 'prospeccao',
                addedAt: new Date().toISOString(),
                source: 'explorer'
            }));

            localStorage.setItem('eio_crm_leads', JSON.stringify([...existingLeads, ...newLeads]));

            alert(`📥 ${leadsToSend.length} Leads enviados para a coluna "Prospecção" do CRM!`);
        });
    }

});

// ═══════════════════════════════════════════════════════════
// AGENTES IA - CONFIGURAÇÃO E INTEGRAÇÃO
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // --- Navegação entre tabs dos Agentes IA ---
    const agentTabs = document.querySelectorAll('.eio-agent-tab');
    const agentContents = document.querySelectorAll('.eio-agent-content');

    agentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Atualizar tabs
            agentTabs.forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.style.color = '#aaa';
            });
            tab.style.background = '#6246ea';
            tab.style.color = '#fff';

            // Atualizar conteúdo
            agentContents.forEach(content => {
                content.style.display = content.dataset.content === targetTab ? 'block' : 'none';
            });
        });
    });

    // --- Toggle de Agentes ---
    const toggles = ['toggleAssistant', 'toggleQualifier'];
    toggles.forEach(id => {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.addEventListener('click', () => {
                const ball = toggle.querySelector('div');
                const isActive = ball.style.right === '2px';

                if (isActive) {
                    ball.style.right = 'auto';
                    ball.style.left = '2px';
                    toggle.style.background = '#444';
                } else {
                    ball.style.left = 'auto';
                    ball.style.right = '2px';
                    toggle.style.background = '#6246ea';
                }

                // Salvar estado
                const agentStates = JSON.parse(localStorage.getItem('eio_agent_states') || '{}');
                agentStates[id] = !isActive;
                localStorage.setItem('eio_agent_states', JSON.stringify(agentStates));
            });
        }
    });

    // --- Salvar Configurações do Assistente ---
    const btnSaveAssistant = document.getElementById('btnSaveAssistant');
    if (btnSaveAssistant) {
        btnSaveAssistant.addEventListener('click', () => {
            const config = {
                keywords: {
                    interest: document.getElementById('keywordsInterest')?.value || '',
                    question: document.getElementById('keywordsQuestion')?.value || '',
                    complaint: document.getElementById('keywordsComplaint')?.value || '',
                    spam: document.getElementById('keywordsSpam')?.value || ''
                },
                replies: {
                    interest: document.getElementById('replyInterest')?.value || '',
                    question: document.getElementById('replyQuestion')?.value || '',
                    complaint: document.getElementById('replyComplaint')?.value || ''
                },
                enabled: true,
                updatedAt: new Date().toISOString()
            };

            localStorage.setItem('eio_assistant_config', JSON.stringify(config));
            alert('✅ Configurações do Assistente salvas com sucesso!');
        });
    }

    // --- Carregar configurações salvas ---
    const loadAssistantConfig = () => {
        const saved = localStorage.getItem('eio_assistant_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);

                if (config.keywords) {
                    if (document.getElementById('keywordsInterest'))
                        document.getElementById('keywordsInterest').value = config.keywords.interest;
                    if (document.getElementById('keywordsQuestion'))
                        document.getElementById('keywordsQuestion').value = config.keywords.question;
                    if (document.getElementById('keywordsComplaint'))
                        document.getElementById('keywordsComplaint').value = config.keywords.complaint;
                    if (document.getElementById('keywordsSpam'))
                        document.getElementById('keywordsSpam').value = config.keywords.spam;
                }

                if (config.replies) {
                    if (document.getElementById('replyInterest'))
                        document.getElementById('replyInterest').value = config.replies.interest;
                    if (document.getElementById('replyQuestion'))
                        document.getElementById('replyQuestion').value = config.replies.question;
                    if (document.getElementById('replyComplaint'))
                        document.getElementById('replyComplaint').value = config.replies.complaint;
                }
            } catch (e) {
                console.log('Erro ao carregar config:', e);
            }
        }
    };

    loadAssistantConfig();

    // --- Envio de DMs em Massa via Agentes IA ---
    window.sendBulkDM = async function (targets, template) {
        if (!targets || targets.length === 0) {
            alert('⚠️ Nenhum destinatário selecionado');
            return;
        }

        if (!template) {
            alert('⚠️ Nenhum template de mensagem definido');
            return;
        }

        const confirmSend = confirm(
            `📨 Enviar DM para ${targets.length} usuários?\n\n` +
            `Mensagem:\n"${template.substring(0, 100)}${template.length > 100 ? '...' : ''}"\n\n` +
            `⚠️ Delay de 60-120 segundos entre cada mensagem para segurança.`
        );

        if (!confirmSend) return;

        // Tentar comunicar com a extensão
        window.postMessage({
            type: 'EIO_COMMAND',
            action: 'sendBulkDM',
            targets: targets,
            template: template,
            delayMin: 60000,
            delayMax: 120000
        }, '*');

        alert(`📩 Processo de envio iniciado!\n\nAcompanhe o progresso no console da extensão.`);
    };

    // --- Botão de enviar DM para leads selecionados ---
    const btnSendDMToLeads = document.getElementById('btnSendDMToLeads');
    if (btnSendDMToLeads) {
        btnSendDMToLeads.addEventListener('click', () => {
            const selectedCheckboxes = document.querySelectorAll('.lead-checkbox:checked');

            if (selectedCheckboxes.length === 0) {
                alert('⚠️ Selecione pelo menos um lead para enviar DM');
                return;
            }

            const template = prompt(
                '📝 Digite a mensagem que será enviada:\n\n' +
                'Variáveis disponíveis:\n' +
                '{{nome}} - Nome do usuário\n' +
                '{{@}} - Menção (@usuario)\n' +
                '{{data}} - Data atual\n' +
                '{{hora}} - Hora atual',
                'Olá {{nome}}! 👋\n\nVi que você se interessa pelo nosso conteúdo. Gostaria de saber mais sobre nossos produtos?\n\nAbraço!'
            );

            if (!template) return;

            const targets = [];
            selectedCheckboxes.forEach(cb => {
                const row = cb.closest('tr');
                const username = row?.dataset?.username;
                if (username) targets.push(username);
            });

            window.sendBulkDM(targets, template);
        });
    }

    // --- Templates Dinâmicos ---
    const templatesList = document.getElementById('templatesList');
    const btnAddTemplate = document.getElementById('btnAddTemplate');

    const loadTemplates = () => {
        const templates = JSON.parse(localStorage.getItem('eio_dm_templates') || '[]');
        if (templatesList) {
            if (templates.length === 0) {
                templatesList.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 30px;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📝</div>
                        <div>Nenhum template salvo</div>
                        <div style="font-size: 0.85rem; margin-top: 5px;">Clique em "Novo Template" para criar</div>
                    </div>
                `;
            } else {
                templatesList.innerHTML = templates.map((t, i) => `
                    <div style="padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="color: #fff;">${t.name}</strong>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="useTemplate(${i})" style="background: #6246ea; border: none; color: #fff; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Usar</button>
                                <button onclick="deleteTemplate(${i})" style="background: #e74c3c; border: none; color: #fff; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
                            </div>
                        </div>
                        <div style="color: #aaa; font-size: 0.9rem; white-space: pre-wrap;">${t.content.substring(0, 150)}${t.content.length > 150 ? '...' : ''}</div>
                    </div>
                `).join('');
            }
        }
    };

    window.useTemplate = function (index) {
        const templates = JSON.parse(localStorage.getItem('eio_dm_templates') || '[]');
        const template = templates[index];
        if (template) {
            const targets = [];
            document.querySelectorAll('.lead-checkbox:checked').forEach(cb => {
                const row = cb.closest('tr');
                const username = row?.dataset?.username;
                if (username) targets.push(username);
            });

            if (targets.length === 0) {
                alert('⚠️ Selecione leads na tabela antes de usar o template');
                return;
            }

            window.sendBulkDM(targets, template.content);
        }
    };

    window.deleteTemplate = function (index) {
        if (!confirm('Excluir este template?')) return;
        const templates = JSON.parse(localStorage.getItem('eio_dm_templates') || '[]');
        templates.splice(index, 1);
        localStorage.setItem('eio_dm_templates', JSON.stringify(templates));
        loadTemplates();
    };

    if (btnAddTemplate) {
        btnAddTemplate.addEventListener('click', () => {
            const name = prompt('Nome do template:');
            if (!name) return;

            const content = prompt(
                'Conteúdo da mensagem:\n\n' +
                'Variáveis: {{nome}}, {{@}}, {{data}}, {{hora}}'
            );
            if (!content) return;

            const templates = JSON.parse(localStorage.getItem('eio_dm_templates') || '[]');
            templates.push({ name, content, createdAt: new Date().toISOString() });
            localStorage.setItem('eio_dm_templates', JSON.stringify(templates));
            loadTemplates();
            alert('✅ Template salvo!');
        });
    }

    loadTemplates();

});

// ═══════════════════════════════════════════════════════════
// QUALIFICADOR DE LEADS
// ═══════════════════════════════════════════════════════════

window.qualifyLead = function (lead) {
    let score = 0;
    const reasons = [];

    // Seguidores (500-5000 = perfil real)
    if (lead.followers >= 500 && lead.followers <= 5000) {
        score += 2;
        reasons.push('Seguidores ideais');
    }

    // Email na bio
    if (lead.bio && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(lead.bio)) {
        score += 3;
        reasons.push('Email na bio');
        lead.contact = lead.bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)[0];
    }

    // Telefone na bio
    if (lead.bio && /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/.test(lead.bio)) {
        score += 2;
        reasons.push('Telefone na bio');
        if (!lead.contact) {
            lead.contact = lead.bio.match(/\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/)[0];
        }
    }

    // Não é privado
    if (!lead.isPrivate) {
        score += 1;
        reasons.push('Perfil público');
    }

    // Verificado
    if (lead.isVerified) {
        score += 2;
        reasons.push('Verificado');
    }

    // Ratio bom (seguidores > seguindo)
    if (lead.followers > lead.following * 1.5) {
        score += 1;
        reasons.push('Bom ratio');
    }

    // Calcular nível
    let level = 'Frio';
    if (score >= 7) level = 'Quente';
    else if (score >= 4) level = 'Morno';

    return {
        ...lead,
        qualificationScore: score,
        qualificationLevel: level,
        qualificationReasons: reasons
    };
};

// Aplicar qualificação a todos os leads
window.qualifyAllLeads = function () {
    const leads = window.exploredLeads || [];
    window.exploredLeads = leads.map(lead => window.qualifyLead(lead));

    // Reordenar por score
    window.exploredLeads.sort((a, b) => (b.qualificationScore || 0) - (a.qualificationScore || 0));

    alert(`✅ ${leads.length} leads qualificados!\n\n` +
        `🔥 Quentes: ${leads.filter(l => l.qualificationLevel === 'Quente').length}\n` +
        `🟡 Mornos: ${leads.filter(l => l.qualificationLevel === 'Morno').length}\n` +
        `❄️ Frios: ${leads.filter(l => l.qualificationLevel === 'Frio').length}`
    );
};

// ═══════════════════════════════════════════════════════════
// v4.4.23 HEARTBEAT SYSTEM + BRIDGE CONNECTION
// Usa postMessage para detectar extensão (resolve ID dinâmico)
// A extensão injeta bridge.js que envia o ID via postMessage
// ═══════════════════════════════════════════════════════════

(function initHeartbeat() {
    let EXTENSION_ID = null; // Será preenchido pelo handshake da bridge
    const HEARTBEAT_INTERVAL = 10000; // 10 segundos
    let extensionOnline = false;
    let extensionVersion = null;
    let heartbeatTimer = null;
    let bridgeConnected = false;

    // ═══════════════════════════════════════════════════════════
    // BRIDGE LISTENER - Captura ID da extensão via postMessage
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('message', (event) => {
        // Apenas mensagens da própria janela (injetadas pela bridge)
        if (event.source !== window) return;

        const data = event.data;

        // HANDSHAKE - Extensão enviando seu ID
        if (data.type === 'EIO_EXTENSION_HANDSHAKE') {
            EXTENSION_ID = data.extensionId;
            extensionVersion = data.version || '4.4.23';
            bridgeConnected = true;

            console.log('[Dashboard Bridge] 🌉 Handshake recebido! ID:', EXTENSION_ID);
            console.log('[Dashboard Bridge] Versão:', extensionVersion);

            // Marcar como online imediatamente
            updateExtensionStatusUI(true, extensionVersion);

            // Iniciar heartbeat se ainda não iniciou
            if (!heartbeatTimer) {
                startHeartbeat();
            }
        }

        // PONG - Resposta ao ping do dashboard
        if (data.type === 'EIO_EXTENSION_PONG') {
            extensionOnline = true;
            extensionVersion = data.version || extensionVersion;
            updateExtensionStatusUI(true, extensionVersion);
        }

        // COMMAND RESPONSE - Resposta a comandos enviados
        if (data.type === 'EIO_COMMAND_RESPONSE') {
            console.log('[Dashboard Bridge] Resposta do comando:', data.command, data.response);
        }
    });

    // Função para enviar ping via postMessage (bridge method)
    function sendBridgePing() {
        window.postMessage({ type: 'EIO_DASHBOARD_PING', timestamp: Date.now() }, '*');
    }

    // Elemento de status (pode estar no dashboard ou analytics)
    function getStatusElement() {
        return document.querySelector('.eio-sync-status') ||
            document.querySelector('#extensionStatus') ||
            document.querySelector('[data-extension-status]');
    }

    // Atualizar UI com status da extensão
    function updateExtensionStatusUI(online, version = null, stats = null) {
        const statusEl = getStatusElement();
        if (!statusEl) return;

        if (online) {
            // ONLINE - Verde neon com accent purple
            statusEl.innerHTML = `
                <span class="eio-sync-dot" style="background: #39FF14; box-shadow: 0 0 10px #39FF14, 0 0 20px #39FF14;"></span>
                <span style="color: #39FF14; font-weight: 600;">ONLINE (v${version || '4.4.23'})</span>
            `;
            statusEl.style.background = 'rgba(57, 255, 20, 0.1)';
            statusEl.style.borderColor = 'rgba(57, 255, 20, 0.3)';
            statusEl.style.boxShadow = '0 0 15px rgba(57, 255, 20, 0.2)';

            // Disparar evento customizado para outros scripts
            window.dispatchEvent(new CustomEvent('eio:extension:connected', {
                detail: { version, stats, timestamp: Date.now() }
            }));

            console.log('[Dashboard Heartbeat] 💚 Extensão ONLINE:', version);
        } else {
            // OFFLINE - Amarelo de aviso
            statusEl.innerHTML = `
                <span class="eio-sync-dot" style="background: #FFC107; animation: pulse 2s infinite;"></span>
                <span style="color: #FFC107;">Extensão não detectada</span>
            `;
            statusEl.style.background = 'rgba(255, 193, 7, 0.1)';
            statusEl.style.borderColor = 'rgba(255, 193, 7, 0.2)';
            statusEl.style.boxShadow = 'none';

            // Disparar evento customizado
            window.dispatchEvent(new CustomEvent('eio:extension:disconnected', {
                detail: { timestamp: Date.now() }
            }));

            console.log('[Dashboard Heartbeat] ⚠️ Extensão OFFLINE');
        }
    }

    // Enviar ping para a extensão
    async function sendHeartbeatPing() {
        try {
            // Método 1: Tentar via Bridge (postMessage) - funciona com IDs dinâmicos
            if (bridgeConnected) {
                sendBridgePing();
                return; // Bridge vai responder via postMessage listener
            }

            // Método 2: Tentar via chrome.runtime.sendMessage (se extensão estiver conectada e ID conhecido)
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && EXTENSION_ID) {
                try {
                    chrome.runtime.sendMessage(
                        EXTENSION_ID,
                        { type: 'EIO_HEARTBEAT_PING', timestamp: Date.now() },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                // Extensão não encontrada ou não respondeu
                                handleHeartbeatResponse(null);
                                return;
                            }
                            handleHeartbeatResponse(response);
                        }
                    );
                } catch (extErr) {
                    // Extensão não acessível
                    handleHeartbeatResponse(null);
                }
            } else {
                // Aguardando handshake da bridge
                console.log('[Dashboard Heartbeat] ⏳ Aguardando conexão da Bridge...');
                updateExtensionStatusUI(false);
            }
        } catch (err) {
            console.log('[Dashboard Heartbeat] Erro ao enviar ping:', err.message);
            handleHeartbeatResponse(null);
        }
    }

    // Processar resposta do heartbeat
    function handleHeartbeatResponse(response) {
        if (response && response.pong === true) {
            extensionOnline = true;
            extensionVersion = response.version || '4.4.23';
            updateExtensionStatusUI(true, extensionVersion, response.stats);

            // Salvar estado para uso em outras partes do dashboard
            window.EIO_EXTENSION_STATUS = {
                online: true,
                version: extensionVersion,
                stats: response.stats,
                queueLength: response.queueLength,
                lastPing: Date.now()
            };
        } else {
            // Só marcar como offline se já estava online antes
            // Isso evita flicker no estado inicial
            if (extensionOnline || Date.now() - (window.EIO_HEARTBEAT_START || 0) > 15000) {
                extensionOnline = false;
                extensionVersion = null;
                updateExtensionStatusUI(false);

                window.EIO_EXTENSION_STATUS = {
                    online: false,
                    lastPing: Date.now()
                };
            }
        }
    }

    // Iniciar sistema de heartbeat
    function startHeartbeat() {
        window.EIO_HEARTBEAT_START = Date.now();

        // Primeiro ping imediato
        sendHeartbeatPing();

        // Heartbeat a cada 10 segundos
        heartbeatTimer = setInterval(sendHeartbeatPing, HEARTBEAT_INTERVAL);

        console.log('[Dashboard Heartbeat] 🫀 Sistema de heartbeat iniciado (intervalo: 10s)');
    }

    // Parar heartbeat (útil para cleanup)
    function stopHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        console.log('[Dashboard Heartbeat] ⏹️ Sistema de heartbeat parado');
    }

    // Expor funções para uso externo
    window.EIO_Heartbeat = {
        start: startHeartbeat,
        stop: stopHeartbeat,
        ping: sendHeartbeatPing,
        getStatus: () => ({ online: extensionOnline, version: extensionVersion })
    };

    // Auto-iniciar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startHeartbeat);
    } else {
        // DOM já carregado
        setTimeout(startHeartbeat, 500);
    }

    // Cleanup ao fechar página
    window.addEventListener('beforeunload', stopHeartbeat);
})();

console.log('E.I.O Dashboard v4.4.23 - Sync Analytics + Hardcoded Safety');


