/*
═══════════════════════════════════════════════════════════
  E.I.O - POPUP SCRIPT (ADVANCED VERSION)
  Complete functionality for account management
═══════════════════════════════════════════════════════════
*/

// ═══════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════
const AppState = {
    accounts: [],
    filteredAccounts: [],
    selectedAccounts: new Set(),
    currentPage: 1,
    pageSize: 50,
    sortColumn: 'username',
    sortDirection: 'asc',
    currentProfile: '@user',
    targetProfile: '',
    mediaQueue: [],
    isAuthenticated: false,
    automationRunning: false,
    filters: {
        followersMin: 0,
        followersMax: 100000,
        followingMin: 0,
        followingMax: 10000,
        ratioMin: 0,
        ratioMax: 100,
        postsMin: 0,
        postsMax: 1000,
        lastPostDays: null,
        hasPhoto: null,
        isPrivate: null,
        isVerified: null,
        followsMe: null,
        bioContains: '',
        businessCategory: ''
    },
    config: {
        delayAfterAction: 60,
        delayAfterSkip: 1,
        randomDelayPercent: 50,
        showProfilePics: true,
        showBadges: true,
        showBadges: true,
        autoSaveQueue: true,
        // DM Config Defaults
        dmMessageTemplate: '',
        dmSkipPrivate: true,
        dmSkipBusiness: false,
        dmSkipIfChatExists: true
    },
    logs: [],
    mediaQueue: []
};

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    console.log('E.I.O Popup initialized');

    // Update time display
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Load saved state
    await loadState();

    // Check authentication
    checkAuthentication();

    // Initialize UI
    initializeTabs();
    initializeDropdowns();
    initializeFilters();
    initializeDMHandlers();
    initializeConfigSections();
    initializeTableHandlers();
    initializeActionButtons();

    // Render initial data
    renderAccountsTable();
    renderLogs();

    // Detect current Instagram profile
    detectCurrentProfile();

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
        // Extraction progress
        if (message.action === 'extraction_progress') {
            const limit = parseInt(document.getElementById('queueLimit')?.value) || 100;
            LoadingManager.updateProgress(message.count, limit, `Capturando ${message.type}...`);
        }

        // Progress update (X/Y em execução)
        if (message.type === 'progressUpdate') {
            const current = message.current || 0;
            const total = message.total || 0;
            const progressEl = document.getElementById('queueProgress');
            if (progressEl) {
                progressEl.textContent = `${current}/${total}`;
            }
            console.log(`[E.I.O] Progresso: ${current}/${total}`);
        }

        // Stats update
        if (message.type === 'statsUpdate') {
            if (message.stats) {
                document.getElementById('actionsToday').textContent = message.stats.totalActionsToday || 0;
            }
        }

        // Console message / log
        if (message.type === 'consoleMessage') {
            addLog(message.level, message.message);
        }

        // Action completed - update stamp on account card
        if (message.type === 'actionCompleted') {
            // Normalizar username (remover @ se existir)
            const rawUsername = message.username || '';
            const cleanUsername = rawUsername.replace(/^@+/, '').toLowerCase();
            const action = message.action; // 'followed', 'unfollowed', 'liked', 'requested', 'error'

            console.log(`[STAMP] Atualizando stamp para @${cleanUsername}: ${action}`);

            // ═══════════════════════════════════════════════════════════
            // REGISTRAR AÇÃO NO ANALYTICS/DASHBOARD
            // ═══════════════════════════════════════════════════════════
            if (window.EIO_BACKEND && action !== 'error') {
                EIO_BACKEND.logAction(action, cleanUsername, 'success', {
                    source: 'extension',
                    timestamp: new Date().toISOString()
                }).then(result => {
                    if (result.success) {
                        console.log(`[Analytics] ✅ Ação registrada: ${action} -> @${cleanUsername}`);
                    }
                }).catch(err => console.log('Analytics error:', err));

                // Também atualizar status do lead no CRM
                EIO_BACKEND.updateLeadStatus(cleanUsername, action, action);
            }

            // Update account status
            const account = AppState.accounts.find(a => {
                const accUsername = (a.username || '').replace(/^@+/, '').toLowerCase();
                return accUsername === cleanUsername;
            });

            if (account) {
                account.status = action;
                console.log(`[STAMP] Status atualizado para @${cleanUsername}: ${action}`);

                // Atualizar o card diretamente no DOM (mais rápido que re-render total)
                const card = document.querySelector(`.eio-account-card[data-username="${account.username}"]`);
                if (card) {
                    // Remover stamp antigo
                    const oldStamp = card.querySelector('.card-stamp');
                    if (oldStamp) oldStamp.remove();

                    // Adicionar novo stamp
                    const stampDiv = card.querySelector('div[style*="position: relative"]') || card.querySelector('.card-info')?.previousElementSibling;
                    if (stampDiv) {
                        let stampClass = 'stamp-green';
                        let stampText = 'FOLLOWED';

                        if (action === 'requested') { stampClass = 'stamp-blue'; stampText = 'REQUESTED'; }
                        else if (action === 'unfollowed') { stampClass = 'stamp-red'; stampText = 'UNFOLLOWED'; }
                        else if (action === 'liked') { stampClass = 'stamp-pink'; stampText = 'LIKED'; }
                        else if (action === 'error') { stampClass = 'stamp-orange'; stampText = 'ERROR'; }

                        const newStamp = document.createElement('div');
                        newStamp.className = `card-stamp ${stampClass}`;
                        newStamp.textContent = stampText;
                        stampDiv.appendChild(newStamp);
                    }
                }
            }
        }

        // Automation status updates
        if (message.type === 'automationStarted') {
            document.getElementById('automationStatusText').textContent = 'Rodando';
            document.getElementById('automationStatusDot').classList.add('running');
        }
        if (message.type === 'automationPaused') {
            document.getElementById('automationStatusText').textContent = 'Pausado';
            document.getElementById('automationStatusDot').classList.remove('running');
            document.getElementById('automationStatusDot').classList.add('paused');
        }
        if (message.type === 'automationStopped') {
            document.getElementById('automationStatusText').textContent = 'Parado';
            document.getElementById('automationStatusDot').classList.remove('running', 'paused');
        }
    });
});

// ═══════════════════════════════════════════════════════════
// DATE/TIME
// ═══════════════════════════════════════════════════════════
function updateDateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', ' -');

    const el = document.getElementById('currentDateTime');
    if (el) el.textContent = formatted;
}

// ═══════════════════════════════════════════════════════════
// STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════
async function loadState() {
    try {
        const result = await chrome.storage.local.get(['eioAppState', 'eioAccounts', 'eioSelectedAccounts']);

        // Load accounts separately (they're larger data)
        if (result.eioAccounts) {
            AppState.accounts = result.eioAccounts;
            AppState.filteredAccounts = [...result.eioAccounts];
        }

        // Load selected accounts (convert array back to Set)
        if (result.eioSelectedAccounts) {
            AppState.selectedAccounts = new Set(result.eioSelectedAccounts);
        }

        // Load other state
        if (result.eioAppState) {
            const saved = result.eioAppState;
            AppState.currentPage = saved.currentPage || 1;
            AppState.pageSize = saved.pageSize || 50;
            AppState.sortColumn = saved.sortColumn || 'username';
            AppState.sortDirection = saved.sortDirection || 'asc';
            AppState.targetProfile = saved.targetProfile || '';
            AppState.filters = saved.filters || AppState.filters;
            AppState.config = saved.config || AppState.config;
            AppState.logs = saved.logs || [];
            AppState.mediaQueue = saved.mediaQueue || [];
        }

        console.log(`✅ Estado carregado: ${AppState.accounts.length} contas`);
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

async function saveState() {
    try {
        // Save accounts separately
        await chrome.storage.local.set({
            eioAccounts: AppState.accounts,
            eioSelectedAccounts: Array.from(AppState.selectedAccounts),
            eioAppState: {
                currentPage: AppState.currentPage,
                pageSize: AppState.pageSize,
                sortColumn: AppState.sortColumn,
                sortDirection: AppState.sortDirection,
                targetProfile: AppState.targetProfile,
                filters: AppState.filters,
                config: AppState.config,
                logs: AppState.logs.slice(0, 100), // Limitar logs
                mediaQueue: AppState.mediaQueue || []
            }
        });
        console.log(`💾 Estado salvo: ${AppState.accounts.length} contas`);
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════
function checkAuthentication() {
    chrome.storage.local.get(['extensionLicense'], (result) => {
        if (result.extensionLicense && result.extensionLicense.validated) {
            AppState.isAuthenticated = true;
            AppState.currentProfile = result.extensionLicense.igHandle || '@user';
            document.getElementById('currentProfile').textContent = AppState.currentProfile;
            hideTermsModal();
        } else {
            showTermsModal();
        }
    });
}

function showTermsModal() {
    document.getElementById('termsModal').classList.add('active');
}

function hideTermsModal() {
    document.getElementById('termsModal').classList.remove('active');
}

// Login handlers
document.getElementById('btnGoToLogin')?.addEventListener('click', () => {
    document.getElementById('termsStep1').style.display = 'none';
    document.getElementById('termsStep2').style.display = 'block';
});

document.getElementById('btnSubmitExtensionLogin')?.addEventListener('click', async () => {
    const handle = document.getElementById('loginInstagramHandle').value.trim();
    if (!handle) {
        alert('Por favor, digite seu @');
        return;
    }

    // Simulate validation (in production, would call backend)
    AppState.isAuthenticated = true;
    AppState.currentProfile = `@${handle.replace('@', '')}`;

    chrome.storage.local.set({
        extensionLicense: {
            validated: true,
            igHandle: AppState.currentProfile,
            validatedAt: new Date().toISOString()
        }
    });

    document.getElementById('currentProfile').textContent = AppState.currentProfile;
    hideTermsModal();
    addLog('success', `Login realizado: ${AppState.currentProfile}`);
});

// ═══════════════════════════════════════════════════════════
// TABS NAVIGATION
// ═══════════════════════════════════════════════════════════
function initializeTabs() {
    const tabs = document.querySelectorAll('.eio-tab');
    const contents = document.querySelectorAll('.eio-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('eio-tab-active'));
            tab.classList.add('eio-tab-active');

            // Update active content
            contents.forEach(c => c.classList.remove('eio-tab-content-active'));
            document.getElementById(`${targetTab}Tab`)?.classList.add('eio-tab-content-active');
        });
    });
}

// ═══════════════════════════════════════════════════════════
// DROPDOWNS
// ═══════════════════════════════════════════════════════════
function initializeDropdowns() {
    const dropdownTriggers = document.querySelectorAll('.eio-dropdown-trigger');

    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = trigger.closest('.eio-dropdown');

            // Close other dropdowns
            document.querySelectorAll('.eio-dropdown.open').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });

            dropdown.classList.toggle('open');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.eio-dropdown.open').forEach(d => {
            d.classList.remove('open');
        });
    });

    // Prevent dropdown menu from closing when clicking inside
    document.querySelectorAll('.eio-dropdown-menu').forEach(menu => {
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Load Accounts Menu Actions
    initializeLoadAccountsMenu();
    initializeSelectMenu();
    initializeProcessQueueMenu();
}

function initializeLoadAccountsMenu() {
    const menu = document.getElementById('loadAccountsMenu');
    if (!menu) return;

    menu.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleLoadAccountsAction(action);
        });
    });
}

function handleLoadAccountsAction(action) {
    const limit = document.getElementById('limitQueue')?.checked
        ? parseInt(document.getElementById('queueLimit')?.value) || 50
        : 1000;

    addLog('info', `Carregando contas: ${action} (limite: ${limit})`);

    switch (action) {
        case 'load-whitelist':
            loadWhitelist();
            break;
        case 'load-pending':
            loadPendingRequests();
            break;
        case 'load-followers':
            loadFromInstagram('followers', limit);
            break;
        case 'load-following':
            loadFromInstagram('following', limit);
            break;
        case 'load-likers':
            loadFromInstagram('likers', limit);
            break;
        case 'load-commenters':
            loadFromInstagram('commenters', limit);
            break;
        case 'load-saved-queue':
            loadSavedQueue();
            break;
    }

    // Close dropdown
    document.querySelector('.eio-dropdown.open')?.classList.remove('open');
}

function initializeSelectMenu() {
    const menu = document.getElementById('selectMenu');
    if (!menu) return;

    menu.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleSelectAction(action);
            document.querySelector('.eio-dropdown.open')?.classList.remove('open');
        });
    });
}

function handleSelectAction(action) {
    switch (action) {
        case 'select-all':
            AppState.filteredAccounts.forEach(acc => AppState.selectedAccounts.add(acc.username));
            break;
        case 'select-none':
            AppState.selectedAccounts.clear();
            break;
        case 'invert-selection':
            AppState.filteredAccounts.forEach(acc => {
                if (AppState.selectedAccounts.has(acc.username)) {
                    AppState.selectedAccounts.delete(acc.username);
                } else {
                    AppState.selectedAccounts.add(acc.username);
                }
            });
            break;
        case 'remove-selected':
            AppState.accounts = AppState.accounts.filter(acc => !AppState.selectedAccounts.has(acc.username));
            AppState.selectedAccounts.clear();
            applyFilters();
            break;
        case 'add-to-whitelist':
            addSelectedToWhitelist();
            break;
    }

    renderAccountsTable();
    updateSelectedCount();
}

function initializeProcessQueueMenu() {
    // The menu uses radio buttons, handled on process start
}

// ═══════════════════════════════════════════════════════════
// ACCOUNTS TABLE
// ═══════════════════════════════════════════════════════════
function initializeTableHandlers() {
    // Select all checkbox
    document.getElementById('selectAllAccounts')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const visibleAccounts = getPageAccounts();

        visibleAccounts.forEach(acc => {
            if (checked) {
                AppState.selectedAccounts.add(acc.username);
            } else {
                AppState.selectedAccounts.delete(acc.username);
            }
        });

        renderAccountsTable();
        updateSelectedCount();
    });

    // Sortable columns
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (AppState.sortColumn === column) {
                AppState.sortDirection = AppState.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.sortColumn = column;
                AppState.sortDirection = 'asc';
            }
            sortAccounts();
            renderAccountsTable();
        });
    });

    // Page size change
    document.getElementById('pageSize')?.addEventListener('change', (e) => {
        AppState.pageSize = parseInt(e.target.value);
        AppState.currentPage = 1;
        renderAccountsTable();
    });

    // Page number change
    document.getElementById('pageNumber')?.addEventListener('change', (e) => {
        const maxPage = Math.ceil(AppState.filteredAccounts.length / AppState.pageSize);
        AppState.currentPage = Math.max(1, Math.min(parseInt(e.target.value) || 1, maxPage));
        renderAccountsTable();
    });
}

function renderAccountsTable() {
    const gridContainer = document.getElementById('accountsGrid');
    const emptyState = document.getElementById('tableEmptyState');

    if (!gridContainer) return;

    // Função interna de renderização
    const performRender = () => {
        const accounts = getPageAccounts();

        if (accounts.length === 0) {
            gridContainer.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Criar header
        const headerHtml = `
            <div class="eio-grid-header">
                <label>
                    <input type="checkbox" id="selectAllGrid" ${AppState.selectedAccounts.size === accounts.length ? 'checked' : ''}>
                    <span>Selecionar Todos</span>
                </label>
            </div>
        `;

        // Criar cards
        const cardsHtml = accounts.map(acc => {
            const initial = (acc.username || '?').replace('@', '')[0]?.toUpperCase() || '?';
            const isSelected = AppState.selectedAccounts.has(acc.username);
            const cleanUsername = (acc.username || '').replace('@', '');

            let avatarHtml = '';
            if (acc.avatar && (acc.avatar.startsWith('http') || acc.avatar.startsWith('data:'))) {
                avatarHtml = `<img src="${acc.avatar}" class="card-avatar" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                              <div class="card-placeholder" style="display:none;">${initial}</div>`;
            } else {
                avatarHtml = `<div class="card-placeholder">${initial}</div>`;
            }

            // Carimbo de Ação (Stamp) - Verificar se opção está ativa
            let stampHtml = '';
            const showBadges = document.getElementById('configShowBadges')?.checked ?? true;

            if (showBadges) {
                // Determinar o status baseado em múltiplas propriedades
                if (acc.status === 'followed' || acc.followedByViewer || acc.followedByMe || acc.status === 'following') {
                    stampHtml = `<div class="card-stamp stamp-green">FOLLOWED</div>`;
                } else if (acc.status === 'requested' || acc.requestedByViewer) {
                    stampHtml = `<div class="card-stamp stamp-blue">REQUESTED</div>`;
                } else if (acc.status === 'unfollowed') {
                    stampHtml = `<div class="card-stamp stamp-red">UNFOLLOWED</div>`;
                } else if (acc.status === 'liked') {
                    stampHtml = `<div class="card-stamp stamp-pink">LIKED</div>`;
                } else if (acc.status === 'error') {
                    stampHtml = `<div class="card-stamp stamp-orange">ERROR</div>`;
                } else if (acc.followsViewer) {
                    stampHtml = `<div class="card-stamp stamp-cyan">FOLLOWS YOU</div>`;
                }
            }

            return `
                <div class="eio-account-card ${isSelected ? 'selected' : ''}" data-username="${acc.username}">
                    <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''}>
                    <div style="position: relative;">
                        ${avatarHtml}
                        ${stampHtml}
                    </div>
                    <div class="card-info">
                        <div class="card-username">
                            <a href="https://instagram.com/${cleanUsername}" target="_blank">@${cleanUsername}</a>
                        </div>
                        ${acc.fullName ? `<div class="card-name">${acc.fullName}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        gridContainer.innerHTML = headerHtml + cardsHtml;

        // Re-attach handlers
        const selectAllGrid = document.getElementById('selectAllGrid');
        if (selectAllGrid) {
            selectAllGrid.addEventListener('change', (e) => {
                const allCards = gridContainer.querySelectorAll('.eio-account-card');
                const allCheckboxes = gridContainer.querySelectorAll('.card-checkbox');

                allCards.forEach((card, idx) => {
                    const username = card.dataset.username;
                    if (e.target.checked) {
                        AppState.selectedAccounts.add(username);
                        card.classList.add('selected');
                        allCheckboxes[idx].checked = true;
                    } else {
                        AppState.selectedAccounts.delete(username);
                        card.classList.remove('selected');
                        allCheckboxes[idx].checked = false;
                    }
                });

                updateSelectedCount();
            });
        }

        gridContainer.querySelectorAll('.eio-account-card').forEach(card => {
            const checkbox = card.querySelector('.card-checkbox');
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
                checkbox.checked = !checkbox.checked;
                toggleCardSelection(card, checkbox.checked);
            });
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleCardSelection(card, e.target.checked);
            });
        });

        updatePaginationInfo();
    };

    // Otimização: Spinner
    if (AppState.filteredAccounts.length > 200) {
        gridContainer.innerHTML = '<div style="padding: 40px; text-align: center; width: 100%; color: var(--eio-text-secondary);">⏳ Carregando...</div>';

        // setTimeout para processar
        setTimeout(() => {
            requestAnimationFrame(performRender);
        }, 50);
    } else {
        performRender();
    }
}

/**
 * Alterna seleção de um card
 */
function toggleCardSelection(card, isSelected) {
    const username = card.dataset.username;

    if (isSelected) {
        AppState.selectedAccounts.add(username);
        card.classList.add('selected');
    } else {
        AppState.selectedAccounts.delete(username);
        card.classList.remove('selected');
    }

    updateSelectedCount();
}

function getPageAccounts() {
    const start = (AppState.currentPage - 1) * AppState.pageSize;
    const end = start + AppState.pageSize;
    return AppState.filteredAccounts.slice(start, end);
}

function updatePaginationInfo() {
    const total = AppState.filteredAccounts.length;
    const start = (AppState.currentPage - 1) * AppState.pageSize + 1;
    const end = Math.min(AppState.currentPage * AppState.pageSize, total);

    const el = document.getElementById('queuePagination');
    if (el) {
        el.textContent = `📊 ${start} - ${end} / ${total} (${AppState.accounts.length})`;
    }

    const pageInput = document.getElementById('pageNumber');
    if (pageInput) {
        pageInput.value = AppState.currentPage;
        pageInput.max = Math.ceil(total / AppState.pageSize) || 1;
    }
}

function updateSelectedCount() {
    const el = document.getElementById('selectedCount');
    if (el) {
        el.textContent = `${AppState.selectedAccounts.size} selected`;
    }
}

function sortAccounts() {
    AppState.filteredAccounts.sort((a, b) => {
        let aVal = a[AppState.sortColumn];
        let bVal = b[AppState.sortColumn];

        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal?.toLowerCase() || '';
        }

        if (aVal < bVal) return AppState.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return AppState.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function formatNumber(num) {
    if (num === undefined || num === null) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

// ═══════════════════════════════════════════════════════════
// LOAD FROM INSTAGRAM - HÍBRIDO (MODAL + API)
// Prioriza extração via modal aberto (mais perfis)
// Se não houver modal, usa API direta
// ═══════════════════════════════════════════════════════════

async function loadFromInstagram(type, limit = 200) {
    // LIMPEZA: Remover lista anterior para não misturar resultados
    AppState.accounts = [];
    AppState.selectedAccounts.clear();
    renderAccountsTable();

    addLog('info', `📥 Carregando ${type} (limite: ${limit})...`);

    // Mostrar loading
    LoadingManager.show(type);

    try {
        // Obter aba ativa do Instagram
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const instagramTab = tabs.find(t => t.url?.includes('instagram.com'));

        if (!instagramTab) {
            throw new Error('Abra o Instagram primeiro');
        }

        // Verificar se há um modal de seguidores/seguindo aberto
        const checkModalResult = await chrome.tabs.sendMessage(instagramTab.id, {
            action: 'check_modal_open'
        }).catch(() => ({ hasModal: false }));

        // ═══════════════════════════════════════════════════════════
        // MÉTODO 1: EXTRAÇÃO VIA MODAL (SCROLL AUTOMÁTICO)
        // Se o modal estiver aberto, usar extração por scroll
        // ═══════════════════════════════════════════════════════════
        if (checkModalResult?.hasModal) {
            addLog('info', '📋 Modal detectado! Usando extração por scroll...');
            LoadingManager.updateProgress(0, limit, 'Extraindo do modal aberto...');

            const extractionResult = await chrome.tabs.sendMessage(instagramTab.id, {
                action: 'execute_extraction',
                payload: {
                    type: type,
                    limit: limit,
                    filters: AppState.filters
                }
            });

            if (extractionResult?.success && extractionResult.data && extractionResult.data.length > 0) {
                const accounts = extractionResult.data;
                addLog('success', `✅ ${accounts.length} perfis NOVOS extraídos do modal!`);
                processLoadedAccounts(accounts);
                LoadingManager.hide();
                return; // Sucesso, sair.
            } else {
                addLog('warning', '⚠️ Extração do modal retornou 0 contas. Tentando método API...');
                // Fallthrough para o catch ou método 2
            }
        } else {
            addLog('info', 'ℹ️ Nenhum modal detectado. Usando método API...');
        }

        // ═══════════════════════════════════════════════════════════
        // MÉTODO 2: API (FALLBACK ROBUSTO)
        // ═══════════════════════════════════════════════════════════

        // Mapear tipos para ações da API
        let apiAction = '';
        if (type === 'followers') apiAction = 'load_followers';
        else if (type === 'following') apiAction = 'load_following';
        else {
            throw new Error(`O tipo '${type}' exige modal aberto para funcionar.`);
        }

        const apiResult = await chrome.tabs.sendMessage(instagramTab.id, {
            action: apiAction,
            limit: limit,
            username: AppState.targetProfile.replace('@', '') || undefined
        });

        if (apiResult?.success && apiResult?.accounts) {
            const accounts = apiResult.accounts;
            addLog('success', `✅ ${accounts.length} perfis carregados via API!`);
            processLoadedAccounts(accounts);
        } else {
            throw new Error(apiResult?.error || 'Falha ao carregar via API');
        }

    } catch (e) {
        console.error(e);
        addLog('error', `❌ Erro: ${e.message}`);
        if (AppState.accounts.length === 0) {
            document.getElementById('tableEmptyState').style.display = 'flex';
        }
    } finally {
        LoadingManager.hide();
    }
}

function processLoadedAccounts(accounts) {
    // Processar resultados
    AppState.accounts = accounts.map(acc => ({
        username: (acc.username || '').replace('@', ''),
        fullName: acc.fullName || acc.name || '',
        profilePic: acc.avatar || acc.profile_pic_url || '',
        id: acc.id,
        isPrivate: !!acc.isPrivate,
        isVerified: !!acc.isVerified,
        followers: acc.followers || 0,
        following: acc.following || 0,
        status: 'pending'
    }));

    // Aplicar filtros iniciais
    AppState.filteredAccounts = [...AppState.accounts];
    applyFilters();
    renderAccountsTable();
    updateSelectedCount();
    saveState();

    // Sincronizar com dashboard se backend disponível
    if (window.EIO_BACKEND && AppState.accounts.length > 0) {
        addLog('info', '📤 Sincronizando leads com o dashboard...');
        // Sync logic placeholder
    }

    addLog('success', `✅ ${AppState.accounts.length} contas processadas.`);
    LoadingManager.showSuccess(AppState.accounts.length);
}



// Funções auxiliares para carregamento (placeholders)
function loadWhitelist() {
    addLog('info', '📋 Carregando whitelist...');
    // TODO: Implementar
}

function loadPendingRequests() {
    addLog('info', '📋 Carregando pedidos pendentes...');
    // TODO: Implementar
}

function loadSavedQueue() {
    addLog('info', '📋 Carregando fila salva...');
    chrome.storage.local.get(['savedQueue'], (result) => {
        if (result.savedQueue && result.savedQueue.length > 0) {
            AppState.accounts = result.savedQueue;
            applyFilters();
            renderAccountsTable();
            addLog('success', `✅ ${result.savedQueue.length} contas carregadas da fila salva`);
        } else {
            addLog('warning', '⚠️ Nenhuma fila salva encontrada');
        }
    });
}

// ═══════════════════════════════════════════════════════════
// SISTEMA DE LOADING PROFISSIONAL - UX PREMIUM
// ═══════════════════════════════════════════════════════════

const LoadingManager = {
    modal: null,
    timeoutId: null,
    startTime: null,
    isUnfollow: false,

    init() {
        this.modal = document.getElementById('loadingModal');
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('btnRefreshList')?.addEventListener('click', () => {
            this.hide();
            renderAccountsTable();
        });

        document.getElementById('closeSuccessToast')?.addEventListener('click', () => {
            document.getElementById('successToast').style.display = 'none';
        });
    },

    show(type) {
        if (!this.modal) this.modal = document.getElementById('loadingModal');

        this.isUnfollow = type === 'unfollow' || type === 'following';
        this.startTime = Date.now();

        // Definir conteúdo baseado no tipo
        const timeLimit = parseInt(document.getElementById('extractionTimeout')?.value) || 30;
        const title = '🚀 Carregando Perfis…';
        const message = `Estamos sincronizando os perfis do Instagram para você.<br>Esse processo leva cerca de <strong>${timeLimit}</strong> segundos.<br>Aguarde a finalização automática.`;

        document.getElementById('loadingTitle').innerHTML = title;
        document.getElementById('loadingMessage').innerHTML = message;
        document.getElementById('loadingTimeEstimate').textContent = timeLimit;
        document.getElementById('loadingCount').textContent = '0';
        document.getElementById('loadingTotal').textContent = '--';
        document.getElementById('loadingPercentage').textContent = '0%';
        document.getElementById('loadingProgressFill').style.width = '0%';
        document.getElementById('loadingStatusText').textContent = 'Iniciando extração...';
        document.getElementById('loadingTimeout').style.display = 'none';

        // Mostrar modal IMEDIATAMENTE
        this.modal.style.display = 'flex';

        // Desabilitar botões
        this.disableButtons(true);

        // Configurar timeout
        this.timeoutId = setTimeout(() => {
            document.getElementById('loadingTimeout').style.display = 'block';
            document.getElementById('loadingStatusText').textContent = 'O processo está demorando mais que o esperado...';
        }, timeLimit * 1000);
    },

    updateProgress(loaded, total, statusText) {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        document.getElementById('loadingCount').textContent = loaded;
        document.getElementById('loadingTotal').textContent = total || '--';
        document.getElementById('loadingPercentage').textContent = `${percent}%`;
        document.getElementById('loadingProgressFill').style.width = `${percent}%`;
        if (statusText) {
            document.getElementById('loadingStatusText').textContent = statusText;
        }
    },

    hide() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.disableButtons(false);
    },

    showSuccess(count) {
        this.hide();
        const toast = document.getElementById('successToast');
        document.getElementById('successToastCount').textContent = `${count} perfis prontos para processamento.`;
        toast.style.display = 'flex';

        // Auto-hide após 5 segundos
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    },

    showError(message) {
        this.hide();
        addLog('error', `❌ ${message}`);
    },

    disableButtons(disabled) {
        const buttons = ['btnLoadAccounts', 'btnProcessQueue', 'btnSelect'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = disabled;
        });
    }
};

// Inicializar LoadingManager quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => LoadingManager.init());

// NOTA: A função loadFromInstagram principal está definida acima (híbrida: modal + API)


// Helper functions para modal de loading
function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Reabilitar botões
    ['btnLoadAccounts', 'btnProcessQueue', 'btnSelect'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    });
}

function showSuccessToast(count) {
    const toast = document.getElementById('successToast');
    const countEl = document.getElementById('successToastCount');
    if (toast && countEl) {
        countEl.textContent = `${count} perfis prontos para processamento.`;
        toast.style.display = 'flex';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
}

function resetLoadButton(btn, originalText) {
    if (btn) {
        btn.innerHTML = originalText || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Preparar lista`;
        btn.disabled = false;
    }
}

function loadWhitelist() {
    chrome.storage.local.get(['eioWhitelist'], (result) => {
        if (result.eioWhitelist && result.eioWhitelist.length > 0) {
            const newAccounts = result.eioWhitelist.map(username => ({
                username: username,
                fullName: '',
                avatar: null,
                bio: '',
                posts: null,
                followers: null,
                following: null,
                ratio: null,
                whitelisted: true
            }));

            AppState.accounts = [...newAccounts, ...AppState.accounts];
            applyFilters();
            renderAccountsTable();
            addLog('success', `✅ ${newAccounts.length} contas da whitelist carregadas`);
        } else {
            addLog('warning', '⚠️ Whitelist vazia');
        }
    });
}


function loadPendingRequests() {
    addLog('info', '⏳ Carregando pedidos pendentes... (requer estar na página de solicitações)');
    loadFromInstagram('pending', 100);
}

function loadSavedQueue() {
    chrome.storage.local.get(['eioSavedQueue'], (result) => {
        if (result.eioSavedQueue && result.eioSavedQueue.length > 0) {
            AppState.accounts = result.eioSavedQueue;
            applyFilters();
            renderAccountsTable();
            addLog('success', `✅ ${result.eioSavedQueue.length} contas restauradas`);
        } else {
            addLog('warning', '⚠️ Nenhuma fila salva encontrada');
        }
    });
}

function addSelectedToWhitelist() {
    chrome.storage.local.get(['eioWhitelist'], (result) => {
        const whitelist = new Set(result.eioWhitelist || []);
        AppState.selectedAccounts.forEach(username => whitelist.add(username));

        chrome.storage.local.set({ eioWhitelist: Array.from(whitelist) });
        addLog('success', `✅ ${AppState.selectedAccounts.size} contas adicionadas à whitelist`);
    });
}

// ═══════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════
function initializeFilters() {
    // Range sliders
    const rangeSliders = [
        { min: 'followersMin', max: 'followersMax', minVal: 'followersMinVal', maxVal: 'followersMaxVal' },
        { min: 'followingMin', max: 'followingMax', minVal: 'followingMinVal', maxVal: 'followingMaxVal' },
        { min: 'ratioMin', max: 'ratioMax', minVal: 'ratioMinVal', maxVal: 'ratioMaxVal' },
        { min: 'postsMin', max: 'postsMax', minVal: 'postsMinVal', maxVal: 'postsMaxVal' }
    ];

    rangeSliders.forEach(slider => {
        const minEl = document.getElementById(slider.min);
        const maxEl = document.getElementById(slider.max);
        const minValEl = document.getElementById(slider.minVal);
        const maxValEl = document.getElementById(slider.maxVal);

        if (minEl && maxEl) {
            minEl.addEventListener('input', () => {
                if (minValEl) minValEl.textContent = formatNumber(parseInt(minEl.value));
            });
            maxEl.addEventListener('input', () => {
                if (maxValEl) maxValEl.textContent = formatNumber(parseInt(maxEl.value));
            });
        }
    });

    // Apply filters button
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        collectFilters();
        applyFilters();
        renderAccountsTable();
        addLog('info', `🎯 Filtros aplicados: ${AppState.filteredAccounts.length} contas`);

        // Feedback UX: Ir para aba contas
        setTimeout(() => {
            const tab = document.querySelector('.eio-tab[data-tab="contas"]');
            if (tab) tab.click();
        }, 100);
    });

    // Reset filters button
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetFilters();
        renderAccountsTable();
        addLog('info', '🔄 Filtros redefinidos');
    });
}

function collectFilters() {
    AppState.filters = {
        followersMin: parseInt(document.getElementById('followersMin')?.value) || 0,
        followersMax: parseInt(document.getElementById('followersMax')?.value) || 100000,
        followingMin: parseInt(document.getElementById('followingMin')?.value) || 0,
        followingMax: parseInt(document.getElementById('followingMax')?.value) || 10000,
        ratioMin: parseFloat(document.getElementById('ratioMin')?.value) || 0,
        ratioMax: parseFloat(document.getElementById('ratioMax')?.value) || 100,
        postsMin: parseInt(document.getElementById('postsMin')?.value) || 0,
        postsMax: parseInt(document.getElementById('postsMax')?.value) || 1000,
        lastPostDays: parseInt(document.getElementById('lastPostDays')?.value) || null,
        hasPhoto: document.getElementById('filterHasPhoto')?.checked || null,
        noPhoto: document.getElementById('filterNoPhoto')?.checked || null,
        isPrivate: document.getElementById('filterPrivate')?.checked || null,
        isPublic: document.getElementById('filterPublic')?.checked || null,
        followsMe: document.getElementById('filterFollowsMe')?.checked || null,
        notFollowsMe: document.getElementById('filterNotFollowsMe')?.checked || null,
        isVerified: document.getElementById('filterVerified')?.checked || null,
        bioContains: document.getElementById('bioContains')?.value || '',
        businessCategory: document.getElementById('businessCategory')?.value || ''
    };
}

function applyFilters() {
    AppState.filteredAccounts = AppState.accounts.filter(acc => {
        const f = AppState.filters;

        // Followers range
        if (acc.followers !== null) {
            if (acc.followers < f.followersMin || acc.followers > f.followersMax) return false;
        }

        // Following range
        if (acc.following !== null) {
            if (acc.following < f.followingMin || acc.following > f.followingMax) return false;
        }

        // Ratio range
        if (acc.ratio !== null) {
            if (acc.ratio < f.ratioMin || acc.ratio > f.ratioMax) return false;
        }

        // Posts range
        if (acc.posts !== null) {
            if (acc.posts < f.postsMin || acc.posts > f.postsMax) return false;
        }

        // Photo filter
        if (f.hasPhoto && !acc.avatar) return false;
        if (f.noPhoto && acc.avatar) return false;

        // Private/Public
        if (f.isPrivate && !acc.isPrivate) return false;
        if (f.isPublic && acc.isPrivate) return false;

        // Follows me
        if (f.followsMe && !acc.followsMe) return false;
        if (f.notFollowsMe && acc.followsMe) return false;

        // Verified
        if (f.isVerified && !acc.isVerified) return false;

        // Bio contains
        if (f.bioContains && acc.bio && !acc.bio.toLowerCase().includes(f.bioContains.toLowerCase())) {
            return false;
        }

        // Business category
        if (f.businessCategory && acc.businessCategory && !acc.businessCategory.toLowerCase().includes(f.businessCategory.toLowerCase())) {
            return false;
        }

        return true;
    });

    // Sort after filtering
    sortAccounts();

    // Reset to page 1
    AppState.currentPage = 1;

    renderAccountsTable();
    addLog('success', `Filtros aplicados. ${AppState.filteredAccounts.length} contas encontradas.`);
    // UX: Switch to accounts tab explicitly
    setTimeout(() => { const btn = document.querySelector('.eio-tab[data-tab="contas"]'); if (btn) btn.click(); }, 200);
}

function resetFilters() {
    // Reset form values
    document.getElementById('followersMin').value = 0;
    document.getElementById('followersMax').value = 100000;
    document.getElementById('followingMin').value = 0;
    document.getElementById('followingMax').value = 10000;
    document.getElementById('ratioMin').value = 0;
    document.getElementById('ratioMax').value = 100;
    document.getElementById('postsMin').value = 0;
    document.getElementById('postsMax').value = 1000;
    document.getElementById('lastPostDays').value = '';

    // Reset checkboxes
    document.querySelectorAll('.eio-filter-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);

    // Reset text filters
    document.getElementById('bioContains').value = '';
    document.getElementById('businessCategory').value = '';

    // Update display values
    document.getElementById('followersMinVal').textContent = '0';
    document.getElementById('followersMaxVal').textContent = '100k';
    document.getElementById('followingMinVal').textContent = '0';
    document.getElementById('followingMaxVal').textContent = '10k';
    document.getElementById('ratioMinVal').textContent = '0';
    document.getElementById('ratioMaxVal').textContent = '100';
    document.getElementById('postsMinVal').textContent = '0';
    document.getElementById('postsMaxVal').textContent = '1000';

    // Reset state and reapply
    AppState.filters = {};
    AppState.filteredAccounts = [...AppState.accounts];
    AppState.currentPage = 1;
}

// ═══════════════════════════════════════════════════════════
// CONFIG SECTIONS
// ═══════════════════════════════════════════════════════════
function initializeConfigSections() {
    document.querySelectorAll('.eio-config-header').forEach(header => {
        header.addEventListener('click', () => {
            const collapseId = header.dataset.collapse;
            const content = document.getElementById(collapseId);

            if (content) {
                content.classList.toggle('collapsed');
                const arrow = header.querySelector('span');
                if (arrow) {
                    arrow.textContent = content.classList.contains('collapsed')
                        ? arrow.textContent.replace('▼', '▶')
                        : arrow.textContent.replace('▶', '▼');
                }
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
// ACTION BUTTONS
// ═══════════════════════════════════════════════════════════
function initializeActionButtons() {
    // Buttons in 'Ações' tab
    const btnStartAcc = document.getElementById('btnStartAutomation');
    const btnPauseAcc = document.getElementById('btnPauseAutomation');
    const btnStopAcc = document.getElementById('btnStopAutomation');

    // Buttons in 'Contas' tab (Mini bar)
    const btnStartMini = document.getElementById('btnStartAuto');
    const btnPauseMini = document.getElementById('btnPauseAuto');
    const btnStopMini = document.getElementById('btnStopAuto');

    if (btnStartAcc) btnStartAcc.onclick = () => startAutomation();
    if (btnStartMini) btnStartMini.onclick = () => {
        const selectedActions = getSelectedActions();
        if (selectedActions.length === 0) {
            alert('Escolha pelo menos uma ação (Seguir, Curtir, etc.) nos botões acima.');
            return;
        }
        prepareAndStartAutomation(selectedActions);
    };

    // Quick actions - action cards (old tab)
    document.querySelectorAll('.eio-action-card').forEach(card => {
        card.onclick = () => handleContextualAction(card.id);
    });

    const handlePause = () => {
        chrome.runtime.sendMessage({ action: 'pauseAutomation' });
        updateAutomationUI('paused');
    };
    const handleStop = () => {
        chrome.runtime.sendMessage({ action: 'stopAutomation' });
        updateAutomationUI('idle');
    };

    if (btnPauseAcc) btnPauseAcc.onclick = handlePause;
    if (btnPauseMini) btnPauseMini.onclick = handlePause;
    if (btnStopAcc) btnStopAcc.onclick = handleStop;
    if (btnStopMini) btnStopMini.onclick = handleStop;

    // Toggle buttons in 'Contas' tab
    document.querySelectorAll('.eio-action-toggle').forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('active');
            if (btn.dataset.action === 'unfollow' && btn.classList.contains('active')) {
                document.querySelectorAll('.eio-action-toggle:not([data-action="unfollow"])').forEach(b => b.classList.remove('active'));
            } else if (btn.dataset.action !== 'unfollow') {
                document.querySelector('.eio-action-toggle[data-action="unfollow"]')?.classList.remove('active');
            }
            updateSelectedActions();
        };
    });

    // Other global buttons
    document.getElementById('btnSaveQueue')?.addEventListener('click', () => {
        chrome.storage.local.set({ eioSavedQueue: AppState.accounts });
        addLog('success', `💾 Fila salva: ${AppState.accounts.length} contas`);
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => exportToCSV());

    document.getElementById('clearLogBtn')?.addEventListener('click', () => {
        AppState.logs = [];
        renderLogs();
    });

    document.getElementById('popoutBtn')?.addEventListener('click', () => {
        chrome.windows.create({ url: 'popup.html', type: 'popup', width: 800, height: 900 });
    });
}

function getSelectedActions() {
    const actions = [];
    document.querySelectorAll('.eio-action-toggle.active').forEach(btn => {
        actions.push(btn.dataset.action);
    });
    return actions;
}

function getQueueOptions() {
    // Tentar pegar das configurações globais ou usar valores seguros (Modo Ultra-Rápido por padrão)
    return {
        likePosts: document.getElementById('configShowLikes')?.checked ?? false,
        likeCount: 1, // Padrão simples
        viewStory: false, // DESATIVADO por padrão para não forçar navegação
        useDashboardMsg: false
    };
}

function updateSelectedActions() {
    const actions = getSelectedActions();
    const actionEl = document.getElementById('queueActionType');
    const countEl = document.getElementById('queueCount');

    if (actions.length === 0) {
        if (actionEl) actionEl.textContent = 'Nenhuma ação';
    } else {
        const labels = actions.map(a => ACTION_LABELS[a] || a).join(' + ');
        if (actionEl) actionEl.textContent = labels;
    }

    if (countEl) countEl.textContent = `${AppState.selectedAccounts.size} contas`;
}

async function prepareAndStartAutomation(selectedActions) {
    const queueOptions = getQueueOptions();
    const globalConfig = collectConfig();
    const options = { ...queueOptions, ...globalConfig };

    const selectedUsernames = Array.from(AppState.selectedAccounts);
    const accounts = AppState.accounts.filter(a => selectedUsernames.includes(a.username));

    if (accounts.length === 0) {
        addLog('warning', '⚠️ Nenhuma conta selecionada');
        return;
    }

    // Build queue with combined actions
    const queue = accounts.map(acc => ({
        ...acc,
        actions: selectedActions,
        options: options
    }));

    addLog('info', `🎯 Preparando ${selectedActions.join('+')} para ${queue.length} contas...`);

    // Send to background
    chrome.runtime.sendMessage({
        action: 'setQueue',
        queue: queue,
        actionType: selectedActions.join('+'),
        options: options
    }, (response) => {
        if (response?.success) {
            addLog('success', `✅ Fila criada: ${queue.length} contas`);
            // Auto start
            startAutomation();
        }
    });
}

function exportToCSV() {
    const accounts = AppState.selectedAccounts.size > 0
        ? AppState.filteredAccounts.filter(a => AppState.selectedAccounts.has(a.username))
        : AppState.filteredAccounts;

    if (accounts.length === 0) {
        addLog('warning', '⚠️ Nenhuma conta para exportar');
        return;
    }

    const headers = ['username', 'fullName', 'bio', 'posts', 'followers', 'following', 'ratio', 'isPrivate', 'isVerified'];
    const csvContent = [
        headers.join(','),
        ...accounts.map(acc => headers.map(h => {
            const val = acc[h];
            if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
            return val ?? '';
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eio_accounts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    addLog('success', `📄 Exportado: ${accounts.length} contas`);
}

// ═══════════════════════════════════════════════════════════
// AUTOMATION CONTROL (Unified)
// ═══════════════════════════════════════════════════════════

async function startAutomation(actionOverride = null) {
    const selectedAction = actionOverride || 'follow';
    const globalConfig = collectConfig();

    const accountsToProcess = AppState.selectedAccounts.size > 0
        ? AppState.accounts.filter(a => AppState.selectedAccounts.has(a.username))
        : AppState.filteredAccounts;

    if (accountsToProcess.length === 0) {
        alert('Selecione pelo menos uma conta na lista (aba Contas).');
        return;
    }

    addLog('info', `🚀 Preparando ${selectedAction} para ${accountsToProcess.length} contas...`);

    const queue = accountsToProcess.map(acc => ({
        username: acc.username,
        actions: [selectedAction],
        options: globalConfig
    }));

    chrome.runtime.sendMessage({
        action: 'setQueue',
        queue: queue,
        actionType: selectedAction,
        options: globalConfig
    }, (response) => {
        if (response?.success) {
            chrome.runtime.sendMessage({ action: 'startAutomation' }, (resp) => {
                if (resp?.success) {
                    addLog('success', `▶️ Automação (${selectedAction}) iniciada!`);
                    updateAutomationUI('running');
                    alert('⚡ Automação Iniciada!\n\nImportante: Mantenha a aba do Instagram aberta.');
                } else {
                    alert('Erro: ' + (resp?.message || 'Falha ao iniciar motor'));
                }
            });
        }
    });
}

function pauseAutomation() {
    chrome.runtime.sendMessage({ action: 'pauseAutomation' }, () => {
        updateAutomationUI('paused');
        addLog('warning', '⏸️ Automação pausada');
    });
}

function stopAutomation() {
    chrome.runtime.sendMessage({ action: 'stopAutomation' }, () => {
        updateAutomationUI('idle');
        addLog('info', '⏹️ Automação parada');
    });
}

function updateAutomationUI(status) {
    // Update main status indicator (Ações Tab)
    const statusEl = document.querySelector('.eio-status-indicator');
    if (statusEl) {
        statusEl.className = `eio-status-indicator eio-status-${status === 'running' ? 'active' : 'idle'}`;
        const span = statusEl.querySelector('span');
        if (span) span.textContent = status === 'running' ? 'Executando' : (status === 'paused' ? 'Pausado' : 'Parado');
    }

    // Update mini status (Contas Tab)
    const miniDot = document.getElementById('automationStatusDot');
    const miniText = document.getElementById('automationStatusText');
    if (miniDot) {
        miniDot.className = `eio-status-dot-mini eio-status-${status}`;
    }
    if (miniText) {
        miniText.textContent = status === 'running' ? 'Executando' : (status === 'paused' ? 'Pausado' : 'Parado');
    }
}

function collectConfig() {
    return {
        delayAfterAction: parseInt(document.getElementById('delayAfterAction')?.value) || 60,
        delayAfterSkip: parseInt(document.getElementById('delayAfterSkip')?.value) || 1,
        randomDelay: document.getElementById('configRandomDelay')?.checked ?? true,
        randomDelayPercent: parseInt(document.getElementById('randomDelayPercent')?.value) || 50,
        showBadges: document.getElementById('configShowBadges')?.checked ?? true,
        showLikes: document.getElementById('configShowLikes')?.checked ?? true,
        showProfilePics: document.getElementById('configShowProfilePics')?.checked ?? true,
        dismissNotifications: document.getElementById('configDismissNotifications')?.checked ?? true,
        loadLastQueue: document.getElementById('configLoadLastQueue')?.checked ?? true,
        // DM Config
        dmMessageTemplate: document.getElementById('dmMessageTemplate')?.value || '',
        dmSkipPrivate: document.getElementById('dmSkipPrivate')?.checked ?? true,
        dmSkipBusiness: document.getElementById('dmSkipBusiness')?.checked ?? false,
        dmSkipIfChatExists: document.getElementById('dmSkipIfChatExists')?.checked ?? true
    };
}

function handleContextualAction(actionId) {
    const actions = {
        'actionFollow': 'follow',
        'actionLike': 'like',
        'actionComment': 'comment',
        'actionDM': 'dm',
        'actionUnfollow': 'unfollow',
        'actionStory': 'viewStory'
    };

    const action = actions[actionId];
    if (action) {
        const target = AppState.targetProfile;
        if (!target || target === '@feed' || target === '(erro)') {
            alert('Por favor, navegue até um perfil válido do Instagram primeiro.');
            return;
        }

        addLog('info', `⚡ Ação rápida: ${action} em ${target}`);
        const config = collectConfig();

        // Send to background to queue via Engine
        chrome.runtime.sendMessage({
            action: 'queueAction',
            actionType: action,
            target: target,
            options: {
                ...config,
                likeCount: 1
            }
        }, (response) => {
            if (response && response.message) {
                addLog('success', `✅ ${response.message}`);
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════════════
function addLog(level, message) {
    const now = new Date();
    const timestamp = now.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    AppState.logs.unshift({ level, message, timestamp });

    if (AppState.logs.length > 500) {
        AppState.logs = AppState.logs.slice(0, 500);
    }

    renderLogs();
    saveState();
}

function renderLogs() {
    const container = document.getElementById('consoleLog');
    if (!container) return;

    container.innerHTML = AppState.logs.map(log => `
        <div class="eio-log-entry log-${log.level}">
            <span class="eio-log-time">${log.timestamp}</span>
            <span class="eio-log-message">${log.message}</span>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════════
// PROFILE DETECTION
// ═══════════════════════════════════════════════════════════
async function detectCurrentProfile() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];

        if (!activeTab?.url?.includes('instagram.com')) {
            updateProfileDisplay('(abra o Instagram)');
            addLog('warning', '⚠️ Por favor, navegue para o Instagram');
            return;
        }

        // Extract profile from URL
        const url = new URL(activeTab.url);
        const pathParts = url.pathname.split('/').filter(p => p && !['p', 'reel', 'stories', 'explore', 'direct', 'reels'].includes(p));

        if (pathParts.length > 0) {
            const profileName = `@${pathParts[0]}`;
            AppState.targetProfile = profileName;
            updateProfileDisplay(profileName);
            addLog('info', `📍 Perfil detectado: ${profileName}`);
        } else {
            updateProfileDisplay('@feed');
            addLog('info', '📍 Você está no feed principal');
        }

        // Also try to get detailed info from content script
        try {
            const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'get_profile_info' });
            if (response?.username) {
                const profileName = response.username.startsWith('@') ? response.username : `@${response.username}`;
                AppState.targetProfile = profileName;
                updateProfileDisplay(profileName);
            }
        } catch (e) {
            // Content script might not be ready
            console.log('Could not get profile info from content script');
        }

    } catch (error) {
        console.error('Error detecting profile:', error);
        updateProfileDisplay('(erro)');
    }
}

function updateProfileDisplay(profileName) {
    // Update target profile name in dropdown
    const targetEl = document.getElementById('targetProfileName');
    if (targetEl) targetEl.textContent = profileName;

    // Update all profile-ref elements
    document.querySelectorAll('.profile-ref').forEach(el => {
        el.textContent = profileName;
    });
}

// ═══════════════════════════════════════════════════════════
// QUICK ACTIONS
// ═══════════════════════════════════════════════════════════
const ACTION_LABELS = {
    'follow': 'Seguir',
    'like': 'Curtir',
    'comment': 'Comentar',
    'dm': 'Enviar DM',
    'unfollow': 'Deixar de Seguir',
    'story': 'Ver Stories'
};

async function handleQuickAction(actionType) {
    const selectedCount = AppState.selectedAccounts.size;

    if (selectedCount === 0) {
        addLog('warning', '⚠️ Selecione pelo menos uma conta primeiro');
        alert('Por favor, selecione as contas na lista antes de executar uma ação.');
        return;
    }

    const actionLabel = ACTION_LABELS[actionType] || actionType;
    addLog('info', `🎯 Preparando "${actionLabel}" para ${selectedCount} contas...`);

    // Build queue from selected accounts
    const selectedUsernames = Array.from(AppState.selectedAccounts);
    const queue = AppState.accounts.filter(a => selectedUsernames.includes(a.username));

    // Update queue status display
    updateQueueStatus(actionLabel, queue.length);

    // Save queue to storage and set action type
    chrome.runtime.sendMessage({
        action: 'setQueue',
        queue: queue,
        actionType: actionType
    }, (response) => {
        if (response?.success) {
            addLog('success', `✅ Fila "${actionLabel}" criada com ${queue.length} contas`);
            updateAutomationUI('ready');
        }
    });
}

function updateQueueStatus(actionLabel, count) {
    const actionEl = document.getElementById('queueActionType');
    const countEl = document.getElementById('queueCount');

    if (actionEl) actionEl.textContent = actionLabel;
    if (countEl) countEl.textContent = `${count} contas`;
}

// ═══════════════════════════════════════════════════════════
// AUTOMATION CONTROL
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// UI HELPERS (Consolidated)
// ═══════════════════════════════════════════════════════════
function updateAutomationUI(status) {
    // Update main indicator if exists
    const statusEl = document.querySelector('.eio-status-indicator');
    if (statusEl) {
        statusEl.className = `eio-status-indicator eio-status-${status === 'running' ? 'active' : (status === 'paused' ? 'paused' : 'idle')}`;
        const label = statusEl.querySelector('span');
        if (label) {
            label.textContent = {
                'running': 'Executando',
                'paused': 'Pausado',
                'idle': 'Parado',
                'stopped': 'Parado',
                'ready': 'Pronto'
            }[status] || 'Parado';
        }
    }

    // Update mini status in Contas tab
    const dot = document.getElementById('automationStatusDot');
    const text = document.getElementById('automationStatusText');

    if (dot) {
        dot.className = `eio-status-dot-mini status-${status}`;
    }
    if (text) {
        text.textContent = {
            'running': 'Em execução',
            'paused': 'Pausado',
            'idle': 'Parado',
            'stopped': 'Parado',
            'ready': 'Aguardando início'
        }[status] || 'Parado';
    }

    AppState.automationRunning = (status === 'running');
}

// ═══════════════════════════════════════════════════════════
// MESSAGE LISTENER
// ═══════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'statsUpdate':
            updateStats(message.stats);
            break;
        case 'consoleMessage':
            addLog(message.level, message.message);
            break;
        case 'automationStarted':
            updateAutomationUI('running');
            break;
        case 'automationPaused':
            updateAutomationUI('paused');
            break;
        case 'automationStopped':
            updateAutomationUI('stopped');
            break;
        case 'automationProgress':
            updateAutomationProgress(message.current, message.total);
            break;
        case 'extraction_progress':
            addLog('info', `📊 Extração: ${message.count} contas`);
            break;
    }
});

function updateAutomationProgress(current, total) {
    document.getElementById('automationCounter').textContent = `${current}/${total}`;
    document.getElementById('automationProgress').textContent = `${current}/${total}`;

    const progressBar = document.getElementById('automationProgressBar');
    if (progressBar && total > 0) {
        progressBar.style.width = `${(current / total) * 100}%`;
    }
}

function updateStats(stats) {
    if (stats) {
        const total = (stats.followsToday || 0) + (stats.likesToday || 0) + (stats.commentsToday || 0) + (stats.dmsToday || 0);
        const actionsEl = document.getElementById('actionsToday');
        if (actionsEl) actionsEl.textContent = total;
    }
}

// Initial filter application
AppState.filteredAccounts = [...AppState.accounts];

// ═══════════════════════════════════════════════════════════
// MEDIA QUEUE HANDLERS
// ═══════════════════════════════════════════════════════════

function initializeMediaHandlers() {
    const btnAddMedia = document.getElementById('btnAddMedia');
    const mediaUrlInput = document.getElementById('mediaUrl');
    const mediaExtractType = document.getElementById('mediaExtractType');

    if (btnAddMedia) {
        btnAddMedia.addEventListener('click', async () => {
            const originalText = btnAddMedia.textContent;
            btnAddMedia.textContent = 'Carregando...';
            btnAddMedia.disabled = true;

            try {
                let url = mediaUrlInput.value.trim();
                const type = mediaExtractType.value;

                if (!url) {
                    addLog('error', 'Por favor, insira uma URL.');
                    return;
                }

                // Se o usuário digitou apenas um username (ex: msassessoria), vamos assumir que ele quer extrair
                // de um perfil, mas avisar que aqui é para Posts.
                // OU, se ele for teimoso, podemos tentar transformar em URL de perfil.
                // Mas a lógica de extração abaixo espera POSTS para 'likers'/'commenters'.

                const isUsername = /^[a-zA-Z0-9._]+$/.test(url);
                if (isUsername) {
                    addLog('warning', 'Você inseriu um nome de usuário. Para extrair Seguidores, use a aba "Contas".');
                    // Opcional: Podemos tentar converter para URL de perfil se o tipo for compatível?
                    // Por enquanto, vamos pedir a URL completa se ele quis dizer um post.
                    url = `https://www.instagram.com/${url}/`;
                }

                if (!url.includes('instagram.com')) {
                    addLog('error', 'A URL deve ser do Instagram (ex: https://instagram.com/p/...).');
                    return;
                }

                if (!AppState.mediaQueue) AppState.mediaQueue = [];

                AppState.mediaQueue.push({
                    url: url,
                    type: type,
                    status: 'pending', // pending, processing, completed, error
                    addedAt: new Date().toISOString()
                });

                mediaUrlInput.value = '';
                addLog('success', 'Mídia adicionada à fila.');
                saveState();
                renderMediaQueue();

            } catch (e) {
                console.error(e);
                addLog('error', 'Erro ao adicionar mídia.');
            } finally {
                btnAddMedia.textContent = originalText;
                btnAddMedia.disabled = false;
            }
        });
    }

    renderMediaQueue();
}

// ═══════════════════════════════════════════════════════════
// DM HANDLERS
// ═══════════════════════════════════════════════════════════
function initializeDMHandlers() {
    const templateInput = document.getElementById('dmMessageTemplate');
    const quickReplies = document.getElementById('dmQuickReplies');
    const btnSave = document.getElementById('btnSaveDMConfig');
    const btnTest = document.getElementById('btnTestDM');

    // Load saved DM config into UI
    if (AppState.config) {
        if (templateInput) templateInput.value = AppState.config.dmMessageTemplate || '';
        if (document.getElementById('dmSkipPrivate')) document.getElementById('dmSkipPrivate').checked = AppState.config.dmSkipPrivate !== false;
        if (document.getElementById('dmSkipBusiness')) document.getElementById('dmSkipBusiness').checked = !!AppState.config.dmSkipBusiness;
        if (document.getElementById('dmSkipIfChatExists')) document.getElementById('dmSkipIfChatExists').checked = AppState.config.dmSkipIfChatExists !== false;
    }

    // Handle Quick Replies
    if (quickReplies && templateInput) {
        quickReplies.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                templateInput.value = val;
            }
        });
    }

    // Save Button
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            AppState.config = { ...AppState.config, ...collectConfig() };
            saveState();
            addLog('success', '💾 Configuração de DM salva!');
            // Visual feedback
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '✅ Salvo!';
            setTimeout(() => { btnSave.innerHTML = originalText; }, 2000);
        });
    }

    // Test Button
    if (btnTest) {
        btnTest.addEventListener('click', async () => {
            const message = templateInput.value;
            if (!message) {
                alert('Digite uma mensagem primeiro.');
                return;
            }

            addLog('info', '✉️ Enviando teste de DM para você mesmo...');

            // Send test to background
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                if (activeTab?.url?.includes('instagram.com')) {
                    // Get current user to send to self
                    chrome.tabs.sendMessage(activeTab.id, { action: 'get_current_profile' }, (response) => {
                        const target = response?.username || 'instagram'; // Fallback

                        chrome.tabs.sendMessage(activeTab.id, {
                            action: 'execute',
                            payload: {
                                type: 'dm',
                                target: target, // Send to self
                                message: message,
                                options: collectConfig()
                            }
                        });
                    });
                } else {
                    alert('Abra o Instagram para testar.');
                }
            });
        });
    }
}

function renderMediaQueue() {
    const listContainer = document.getElementById('mediaQueueList');
    if (!listContainer) return;

    if (!AppState.mediaQueue || AppState.mediaQueue.length === 0) {
        listContainer.innerHTML = `
            <div class="eio-empty-state">
                <p>Nenhuma mídia na fila</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = AppState.mediaQueue.map((item, index) => {
        let icon = '📷';
        if (item.url.includes('/reel/')) icon = '🎬';
        if (item.url.includes('/stories/')) icon = '⏱️';

        let statusClass = '';
        let statusText = 'Pendente';

        if (item.status === 'processing') {
            statusClass = 'eio-status-processing';
            statusText = 'Extraindo...';
        } else if (item.status === 'completed') {
            statusClass = 'eio-status-success';
            statusText = 'Concluído';
        } else if (item.status === 'error') {
            statusClass = 'eio-status-error';
            statusText = 'Erro';
        }

        const typeLabels = {
            'likers': 'Curtidores',
            'commenters': 'Comentadores',
            'tagged': 'Marcados',
            'all': 'Todos'
        };

        return `
            <div class="eio-media-item ${statusClass}" style="display: flex; align-items: center; padding: 10px; background: var(--eio-dark-600); border-radius: 8px; margin-bottom: 8px; gap: 10px;">
                <div class="eio-media-icon" style="font-size: 1.2rem;">${icon}</div>
                <div class="eio-media-info" style="flex: 1; overflow: hidden;">
                    <a href="${item.url}" target="_blank" class="eio-media-url" title="Abrir Post" style="text-decoration:none; color:var(--eio-primary); cursor:pointer; font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.url} <span style="font-size:0.8em">↗️</span></a>
                    <div class="eio-media-meta" style="font-size: 0.8rem; color: var(--eio-text-secondary); display: flex; gap: 8px;">
                        <span>${typeLabels[item.type] || item.type}</span> • 
                        <span>${statusText}</span>
                    </div>
                </div>
                <div class="eio-media-actions" style="display: flex; gap: 5px;">
                    ${item.status === 'pending' ? `
                        <button class="eio-btn-icon" onclick="processMediaItem(${index})" title="Processar agora" style="background: none; border: none; cursor: pointer; padding: 4px;">
                            ▶️
                        </button>
                    ` : ''}
                    <button class="eio-btn-icon" onclick="removeMediaFromQueue(${index})" title="Remover" style="background: none; border: none; cursor: pointer; padding: 4px;">
                        ❌
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Global functions for inline onclick handlers
window.removeMediaFromQueue = function (index) {
    if (!AppState.mediaQueue) return;
    AppState.mediaQueue.splice(index, 1);
    saveState();
    renderMediaQueue();
    addLog('info', 'Mídia removida da fila.');
};

window.processMediaItem = function (index) {
    if (!AppState.mediaQueue) return;
    const item = AppState.mediaQueue[index];
    if (!item) return;

    addLog('info', `Processando: ${item.url}`);

    // Simulating processing state for UI feedback
    item.status = 'processing';
    renderMediaQueue();

    // Trigger existing extraction logic
    loadFromInstagram(item.type, 1000);
};


// ═══════════════════════════════════════════════════════════
// EXTRACTION LOGIC
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION (SIMPLIFICADA/PERMISSIVA)
// ═══════════════════════════════════════════════════════════
function checkAuthentication() {
    chrome.storage.local.get(['eio_token', 'user'], (result) => {
        const termsModal = document.getElementById('termsModal');
        const mainContainer = document.querySelector('.eio-popup-container');

        if (result.eio_token && result.user) {
            AppState.isAuthenticated = true;
            AppState.user = result.user;
            console.log('Auth: Logado como', result.user.instagram_handle || result.user.email);

            if (termsModal) termsModal.style.display = 'none';
            if (mainContainer) mainContainer.style.display = 'flex';
        } else {
            console.log('Auth: Não logado. Exibindo tela de login.');
            AppState.isAuthenticated = false;

            if (termsModal) {
                termsModal.style.display = 'flex';
                // Resetar para passo 1
                const step1 = document.getElementById('termsStep1');
                const step2 = document.getElementById('termsStep2');
                if (step1) step1.style.display = 'block';
                if (step2) step2.style.display = 'none';
            }
            if (mainContainer) mainContainer.style.display = 'none';
        }
    });

    // Inicializar listeners do Login
    initializeLoginHandlers();
}

function initializeLoginHandlers() {
    const btnGoToLogin = document.getElementById('btnGoToLogin');
    const btnSubmitLogin = document.getElementById('btnSubmitExtensionLogin');
    const inputInstagram = document.getElementById('loginInstagramHandle');

    if (btnGoToLogin) {
        btnGoToLogin.onclick = () => {
            document.getElementById('termsStep1').style.display = 'none';
            document.getElementById('termsStep2').style.display = 'block';
        };
    }

    if (btnSubmitLogin) {
        btnSubmitLogin.onclick = async () => {
            const handle = inputInstagram.value.trim();
            if (!handle) {
                alert('Por favor, digite o @ do seu Instagram.');
                return;
            }

            const originalText = btnSubmitLogin.textContent;
            btnSubmitLogin.textContent = 'Verificando...';
            btnSubmitLogin.disabled = true;

            try {
                // SPECIAL ACCESS FOR ADMIN
                if (handle.toLowerCase().replace('@', '') === 'msassessoriadigital') {
                    const adminUser = {
                        id: 'admin-ms',
                        name: 'MS Assessoria',
                        email: 'maramosps@gmail.com',
                        instagram_handle: 'msassessoriadigital',
                        role: 'admin'
                    };
                    const adminToken = 'eio_admin_bypass_' + Date.now();

                    await chrome.storage.local.set({ eio_token: adminToken, user: adminUser });
                    AppState.isAuthenticated = true;
                    AppState.user = adminUser;

                    document.getElementById('termsModal').style.display = 'none';
                    document.querySelector('.eio-popup-container').style.display = 'flex';
                    addLog('success', '🔓 Acesso de Administrador concedido!');
                    return;
                }

                // Call Backend for Regular Users
                const response = await fetch('https://eio-system.vercel.app/api/v1/auth/instagram-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instagram_handle: handle })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    await chrome.storage.local.set({ eio_token: data.token, user: data.user });
                    AppState.isAuthenticated = true;
                    AppState.user = data.user;

                    document.getElementById('termsModal').style.display = 'none';
                    // Esconder o modal explicitamente
                    if (document.getElementById('termsModal')) {
                        document.getElementById('termsModal').style.display = 'none';
                    }
                    document.querySelector('.eio-popup-container').style.display = 'flex';
                    addLog('success', `🔓 Bem-vindo(a), @${data.user.instagram_handle}!`);
                } else {
                    alert(data.message || 'Erro ao fazer login. Verifique se o @ está correto e se você possui cadastro no dashboard.');
                }

            } catch (error) {
                console.error('Login Error:', error);
                alert('Erro de conexão com o servidor. Tente novamente.');
            } finally {
                btnSubmitLogin.textContent = originalText;
                btnSubmitLogin.disabled = false;
            }
        };
    }
}
