// Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication - redirect to login if not authenticated
    const token = localStorage.getItem('eio_token');
    if (!token) {
        console.warn('⚠️ Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }

    // Load user info from local storage
    const user = JSON.parse(localStorage.getItem('eio_user') || '{}');

    // Update UI with user data
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');

    if (user.name && userNameEl) {
        userNameEl.textContent = user.name;
    }
    if (user.email && userEmailEl) {
        userEmailEl.textContent = user.email;
    }
    if (user.email && userAvatarEl) {
        userAvatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`;
    }

    // Also update any legacy selectors
    const legacyName = document.querySelector('.eio-user-name:not(#userName)');
    const legacyEmail = document.querySelector('.eio-user-email:not(#userEmail)');
    if (legacyName && user.name) legacyName.textContent = user.name;
    if (legacyEmail && user.email) legacyEmail.textContent = user.email;

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
            localStorage.removeItem('eio_token');
            localStorage.removeItem('eio_user');
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

    // Set default values
    if (extensionSize) extensionSize.textContent = '~5 MB';
    if (extensionVersion) extensionVersion.textContent = '1.0.0';

    // Download button - Direct download approach (works on all browsers)
    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            try {
                btnDownload.disabled = true;
                btnDownload.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px; animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    Preparando download...
                `;

                // Direct download using anchor tag - works on all browsers
                const downloadUrl = 'downloads/eio-extension.zip';
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = 'eio-extension.zip';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Success feedback
                btnDownload.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Download Iniciado!
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
                alert('Erro ao baixar extensão. Tente novamente.');

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
                        Após o download, localize o arquivo <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">eio-extension.zip</code> 
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
function initToggleSwitches() {
    document.querySelectorAll('.eio-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const ball = toggle.querySelector('div');
            const isActive = ball.style.right === '2px';

            if (isActive) {
                // Turn off
                ball.style.right = 'auto';
                ball.style.left = '2px';
                toggle.style.background = '#333';
            } else {
                // Turn on
                ball.style.left = 'auto';
                ball.style.right = '2px';
                // Keep original color based on toggle type
                const colors = {
                    'toggleAssistant': '#6246ea',
                    'toggleQualifier': '#FF9800',
                    'toggleFaq': '#4CAF50'
                };
                toggle.style.background = colors[toggle.id] || '#6246ea';
            }
        });
    });
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
        new Notification('E.I.O - Engajamento Inteligente', { body: message, icon: '/downloads/eio-extension.zip' });
    } else {
        console.log('Notification:', message);
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
