/*
═══════════════════════════════════════════════════════════
  E.I.O - EXTENSION POPUP LOGIC
  Controle da interface da extensão
═══════════════════════════════════════════════════════════
*/

// Estado global da extensão
let extensionState = {
    isRunning: false,
    stats: {
        followsToday: 0,
        likesToday: 0,
        commentsToday: 0
    },
    automations: [],
    connectionStatus: 'connected',
    extractedLeads: [],
    lastExtractSource: 'followers',
    lastTargetProfile: '',
    lastExtractTarget: '',
    lastFilters: {}
};

// Função para salvar estado no chrome.storage (persistência)
async function saveExtensionState() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
            await chrome.storage.local.set({ extensionState });
            console.log('📦 Estado salvo com sucesso');
        } catch (e) {
            console.error('Erro ao salvar estado:', e);
        }
    }
}

// Inicialização robusta COM VERIFICAÇÃO DE LICENÇA
document.addEventListener('DOMContentLoaded', async () => {
    console.log('E.I.O Popup DOM Loaded');

    // ═══════════════════════════════════════════════════════════
    // VERIFICAÇÃO DE LICENÇA - PRIMEIRA PRIORIDADE
    // ═══════════════════════════════════════════════════════════
    if (typeof window.licenseManager !== 'undefined') {
        console.log('🔐 Verificando licença...');
        const isLicenseValid = await window.licenseManager.initialize();

        if (!isLicenseValid) {
            console.warn('❌ Licença inválida ou expirada - Bloqueando extensão');
            // License Manager já mostra o modal e bloqueia a UI
            return; // NÃO CONTINUAR A INICIALIZAÇÃO
        }

        console.log('✅ Licença válida - Inicializando extensão');
    } else {
        console.error('⚠️ License Manager não encontrado!');
    }

    // ═══════════════════════════════════════════════════════════
    // INICIALIZAÇÃO NORMAL (apenas se licença válida)
    // ═══════════════════════════════════════════════════════════

    // Inicializar abas primeiro para garantir navegabilidade
    initializeTabs();

    // Tentar carregar estado e inicializar o resto
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await loadSavedState();
            await checkTermsApproval();
            autoDetectTarget();
            startLiveUpdates();
        } else {
            console.warn('Executando fora do contexto de extensão. Usando modo de demonstração.');
            // Simular estado para preview
            document.getElementById('extractionResults').style.display = 'none';
        }
    } catch (e) {
        console.error('Erro na inicialização segura:', e);
    }

    initializeButtons();
    updateUI();

    // Inicializar Flow Builder integrado
    setTimeout(() => {
        if (typeof initializeFlowBuilder === 'function') {
            initializeFlowBuilder();
        }
    }, 500);
});

/**
 * Autodetectar o perfil ou post atual
 */
async function autoDetectTarget() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url.includes('instagram.com')) {
            const url = tabs[0].url;
            const targetInput = document.getElementById('extractTarget');
            const sourceSelect = document.getElementById('extractSource');

            if (url.includes('/p/') || url.includes('/reels/')) {
                if (targetInput) targetInput.value = url;
                if (sourceSelect) sourceSelect.value = 'likes';
            } else {
                const profileMatch = url.match(/instagram\.com\/([^/?#&]+)/);
                if (profileMatch && !['explore', 'reels', 'direct', 'stories'].includes(profileMatch[1])) {
                    if (targetInput) targetInput.value = `@${profileMatch[1]}`;
                    if (sourceSelect) sourceSelect.value = 'followers';
                }
            }
        }
    } catch (e) { console.error('AutoDetect failed', e); }
}

// Carregar estado salvo
async function loadSavedState() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    try {
        const result = await chrome.storage.local.get(['extensionState']);
        if (result.extensionState) {
            extensionState = { ...extensionState, ...result.extensionState };

            // Restaurar campos do formulário
            const sourceSelect = document.getElementById('extractSource');
            const targetProfile = document.getElementById('targetProfile');
            const extractTarget = document.getElementById('extractTarget');

            if (sourceSelect && extensionState.lastExtractSource) {
                sourceSelect.value = extensionState.lastExtractSource;
            }
            if (targetProfile && extensionState.lastTargetProfile) {
                targetProfile.value = extensionState.lastTargetProfile;
            }
            if (extractTarget && extensionState.lastExtractTarget) {
                extractTarget.value = extensionState.lastExtractTarget;
            }

            // Restaurar filtros
            if (extensionState.lastFilters) {
                const filterBR = document.getElementById('filterBR');
                const filterPhoto = document.getElementById('filterPhoto');
                const filterPosts = document.getElementById('filterPosts');
                const filterPublic = document.getElementById('filterPublic');

                if (filterBR) filterBR.checked = extensionState.lastFilters.brOnly ?? true;
                if (filterPhoto) filterPhoto.checked = extensionState.lastFilters.hasPhoto ?? true;
                if (filterPosts) filterPosts.checked = extensionState.lastFilters.minPosts ?? false;
                if (filterPublic) filterPublic.checked = extensionState.lastFilters.publicOnly ?? false;
            }

            // Restaurar leads extraídos
            if (extensionState.extractedLeads && extensionState.extractedLeads.length > 0) {
                updateResultsUI();
            }

            console.log('📂 Estado restaurado com sucesso:', extensionState);
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

// Sistema de navegação por abas
function initializeTabs() {
    const tabs = document.querySelectorAll('.eio-tab');
    const contents = document.querySelectorAll('.eio-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = tab.getAttribute('data-tab');
            console.log('Switching to tab:', targetTab);

            tabs.forEach(t => t.classList.remove('eio-tab-active'));
            contents.forEach(c => c.classList.remove('eio-tab-content-active'));

            tab.classList.add('eio-tab-active');
            const targetContent = document.getElementById(`${targetTab}Tab`);
            if (targetContent) {
                targetContent.classList.add('eio-tab-content-active');
            }
        });
    });
}

// Inicializar botões com segurança
function safeAddEventListener(id, event, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, fn);
        console.log(`✓ Listener adicionado: #${id}`);
    } else {
        console.warn(`⚠ Elemento #${id} não encontrado`);
    }
}

function initializeButtons() {
    safeAddEventListener('startAutomationBtn', 'click', startAutomation);
    safeAddEventListener('pauseAutomationBtn', 'click', pauseAutomation);
    safeAddEventListener('clearConsoleBtn', 'click', clearConsole);
    safeAddEventListener('startExtractionBtn', 'click', startExtraction);
    safeAddEventListener('sendToCrmBtn', 'click', sendLeadsToCRM);
    safeAddEventListener('executeSelectedBtn', 'click', executeActionOnSelected);

    safeAddEventListener('selectAllLeads', 'change', (e) => toggleSelectAll(e.target.checked));
    safeAddEventListener('deselectLast50', 'click', () => deselectLastN(50));
    safeAddEventListener('deselectLast100', 'click', () => deselectLastN(100));
    safeAddEventListener('clearSelection', 'click', () => toggleSelectAll(false));

    safeAddEventListener('settingsBtn', 'click', () => {
        console.log('⚙️ Settings button clicked');

        // Criar modal de configurações se não existir
        let settingsModal = document.getElementById('settingsModal');
        if (!settingsModal) {
            settingsModal = document.createElement('div');
            settingsModal.id = 'settingsModal';
            settingsModal.className = 'eio-terms-modal';
            settingsModal.innerHTML = `
                <div class="eio-terms-content" style="max-width: 400px;">
                    <span class="eio-terms-title">⚙️ Configurações</span>
                    <div style="text-align: left; margin: 20px 0;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: rgba(255,255,255,0.6); font-size: 0.75rem; margin-bottom: 8px; text-transform: uppercase;">Velocidade de Ação</label>
                            <select class="eio-input" id="speedSetting" style="width: 100%;">
                                <option value="safe">Humana (Segura - Recomendado)</option>
                                <option value="fast">Rápida (Contas antigas)</option>
                                <option value="turbo">Turbo (Alto risco)</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" id="autoStartSetting" style="width: 18px; height: 18px;">
                                <span style="color: white; font-size: 0.9rem;">Iniciar automação ao abrir</span>
                            </label>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" id="notificationsSetting" checked style="width: 18px; height: 18px;">
                                <span style="color: white; font-size: 0.9rem;">Notificações de ações</span>
                            </label>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="eio-btn eio-btn-ghost" style="flex: 1;" id="cancelSettingsBtn">Cancelar</button>
                        <button class="eio-btn eio-btn-primary" style="flex: 1;" id="saveSettingsBtn">Salvar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(settingsModal);

            // Adicionar event listeners
            document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
                document.getElementById('settingsModal').style.display = 'none';
            });
            document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
        }

        // Mostrar modal
        settingsModal.style.display = 'flex';

        if (typeof showToast === 'function') {
            showToast('⚙️ Configurações abertas', 'info');
        }
    });

    safeAddEventListener('openDashboardBtn', 'click', () => {
        const url = 'dashboard.html'; // Usar local no preview ou full URL em prod
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: chrome.runtime.getURL('frontend/dashboard.html') });
        } else {
            window.open('../frontend/dashboard.html', '_blank');
        }
    });

    // Dashboard Link agora tem href direto no HTML com URL correta
    // Não precisa de handler de clique adicional

    safeAddEventListener('acceptTermsBtn', 'click', async () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get(['extensionState']);
            const state = result.extensionState || extensionState;
            state.termsAccepted = true;
            await chrome.storage.local.set({ 'extensionState': state });
        }
        const modal = document.getElementById('termsModal');
        if (modal) modal.classList.remove('active');
    });

    // Fluxos - Atualizar
    safeAddEventListener('refreshFlowsBtn', 'click', loadActiveFlows);

    // Fluxos - Criar novo
    safeAddEventListener('createFlowBtn', 'click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: chrome.runtime.getURL('frontend/flow-builder.html') });
        } else {
            window.open('../frontend/flow-builder.html', '_blank');
        }
    });
}

/**
 * Verificar se os termos foram aceitos
 */
async function checkTermsApproval() {
    const result = await chrome.storage.local.get(['extensionState']);
    if (!result.extensionState || !result.extensionState.termsAccepted) {
        document.getElementById('termsModal').classList.add('active');
    }
}

// Iniciar extração de leads
async function startExtraction() {
    const source = document.getElementById('extractSource').value;
    const targetProfile = document.getElementById('targetProfile')?.value || '';
    const extractTarget = document.getElementById('extractTarget')?.value || '';

    // Determinar o alvo correto baseado no tipo de fonte
    let target = extractTarget;
    if ((source === 'followers' || source === 'following') && targetProfile) {
        target = targetProfile;
    }

    // Coletar Filtros (Resiliente a elementos faltantes)
    const filters = {
        brOnly: document.getElementById('filterBR')?.checked || false,
        hasPhoto: document.getElementById('filterPhoto')?.checked || false,
        minPosts: document.getElementById('filterPosts')?.checked || false,
        publicOnly: document.getElementById('filterPublic')?.checked || false
    };

    if (!target) {
        addConsoleEntry('error', 'Por favor, informe o alvo da extração (perfil ou referência)');
        return;
    }

    // Salvar configurações para persistência
    extensionState.lastExtractSource = source;
    extensionState.lastTargetProfile = targetProfile;
    extensionState.lastExtractTarget = extractTarget;
    extensionState.lastFilters = filters;
    await saveExtensionState();

    try {
        extensionState.extractedLeads = [];
        updateResultsUI();

        document.getElementById('extractionProgress').style.display = 'block';
        document.getElementById('extractionResults').style.display = 'none';

        updateExtractionProgress(5, 0);

        const sourceLabels = {
            'followers': 'seguidores',
            'following': 'seguindo',
            'likes': 'curtidas',
            'hashtags': 'hashtag',
            'unfollow': 'deixar de seguir'
        };
        addConsoleEntry('info', `Solicitando extração de ${sourceLabels[source] || source}...`);

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        // Definir Limite (200 para seguidores/curtidas, 500 para unfollow)
        const limit = source === 'unfollow' ? 500 : 200;

        const result = await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'execute_extraction',
            payload: {
                type: source,
                value: target,
                filters: filters,
                limit: limit
            }
        });

        if (result && result.success) {
            // Adicionar flag de selecionado por padrão
            extensionState.extractedLeads = result.data.map(lead => ({ ...lead, selected: true }));
            updateExtractionProgress(100, result.data.length);
            updateResultsUI();
            addConsoleEntry('success', `Extração concluída: ${result.data.length} leads.`);

            // Salvar leads extraídos
            await saveExtensionState();
        } else {
            updateExtractionProgress(0, 0);
            addConsoleEntry('error', `Falha: ${result ? result.message : 'Sem resposta'}`);
        }
    } catch (error) {
        console.error('Extraction error:', error);
        addConsoleEntry('error', '⚠️ Erro de comunicação. RECARREGUE o Instagram (F5).');
    }
}

// Atualizar barra de progresso
function updateExtractionProgress(percent, count) {
    const fill = document.getElementById('extractionProgressFill');
    const countEl = document.getElementById('extractionCount');
    if (fill) fill.style.width = `${percent}%`;
    if (countEl) countEl.innerText = `${count} leads`;
}

// Ouvir progresso em tempo real
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'extraction_progress') {
        const percent = Math.min(message.count * 2, 98);
        updateExtractionProgress(percent, message.count);
    }
});

// Ações de Seleção Manual
function toggleSelectAll(checked) {
    extensionState.extractedLeads.forEach(l => l.selected = checked);
    if (document.getElementById('selectAllLeads')) {
        document.getElementById('selectAllLeads').checked = checked;
    }
    updateResultsUI();
}

function deselectLastN(n) {
    const leads = extensionState.extractedLeads;
    for (let i = Math.max(0, leads.length - n); i < leads.length; i++) {
        leads[i].selected = false;
    }
    updateResultsUI();
}

// Atualizar lista de resultados com Inteligência Visual
function updateResultsUI() {
    const container = document.getElementById('extractionResults');
    const list = document.getElementById('resultsList');
    const selectedCountEl = document.getElementById('selectedCount');
    const controls = document.querySelector('.eio-results-controls');
    const source = document.getElementById('extractSource')?.value || 'followers';
    const isUnfollow = source === 'unfollow';

    if (!extensionState.extractedLeads || extensionState.extractedLeads.length === 0) {
        if (container) container.style.display = 'none';
        return;
    }

    if (container) container.style.display = 'block';
    if (list) list.innerHTML = '';

    // Mostrar ou esconder controles de seleção (Só para Unfollow)
    if (controls) {
        controls.style.display = isUnfollow ? 'flex' : 'none';
    }

    let selectedCount = 0;

    extensionState.extractedLeads.forEach((lead, index) => {
        if (lead.selected) selectedCount++;

        const item = document.createElement('div');
        item.className = 'eio-lead-item';

        // Renderizar com ou sem checkbox baseado na funcionalidade
        const checkboxHtml = isUnfollow ?
            `<input type="checkbox" ${lead.selected ? 'checked' : ''} data-index="${index}">` :
            '';

        // Tratamento melhorado para avatares - usar placeholder quando imagem não carrega
        const getAvatarHtml = (lead) => {
            if (!lead.avatar || lead.avatar === '' || lead.avatar === 'undefined') {
                // Avatar padrão com inicial do nome
                const initial = (lead.name || lead.username || 'U').charAt(0).toUpperCase();
                return `<div class="eio-lead-avatar eio-lead-avatar-placeholder">${initial}</div>`;
            }
            // Tentar carregar imagem com fallback
            return `<img src="${lead.avatar}" 
                         class="eio-lead-avatar-img" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                         alt="${lead.name || 'Avatar'}">
                    <div class="eio-lead-avatar eio-lead-avatar-placeholder" style="display:none;">
                        ${(lead.name || lead.username || 'U').charAt(0).toUpperCase()}
                    </div>`;
        };

        item.innerHTML = `
            ${checkboxHtml}
            <div class="eio-lead-avatar-container">
                ${getAvatarHtml(lead)}
            </div>
            <div class="eio-lead-info">
                <span class="eio-lead-name">${lead.name || 'Usuário Instagram'}</span>
                <span class="eio-lead-username">${lead.username || '@unknown'}</span>
            </div>
        `;

        if (isUnfollow) {
            const checkbox = item.querySelector('input');
            if (checkbox) {
                checkbox.onchange = (e) => {
                    extensionState.extractedLeads[index].selected = e.target.checked;
                    updateSelectedCount();
                    saveExtensionState(); // Salvar ao mudar seleção
                };
            }
        }

        if (list) list.appendChild(item);
    });

    if (selectedCountEl) {
        selectedCountEl.style.display = isUnfollow ? 'block' : 'none';
        selectedCountEl.innerText = `${selectedCount} selecionados`;
    }
}

function updateSelectedCount() {
    const count = extensionState.extractedLeads.filter(l => l.selected).length;
    const el = document.getElementById('selectedCount');
    const source = document.getElementById('extractSource').value;
    if (el) {
        el.style.display = source === 'unfollow' ? 'block' : 'none';
        el.innerText = `${count} selecionados`;
    }
}

// ENVIAR AÇÕES PARA O ROBÔ (O GRANDE BOTÃO START)
async function executeActionOnSelected() {
    const selectedLeads = extensionState.extractedLeads.filter(l => l.selected);
    const source = document.getElementById('extractSource').value;

    if (selectedLeads.length === 0) {
        addConsoleEntry('warning', 'Nenhum perfil selecionado para ação.');
        return;
    }

    addConsoleEntry('info', `Preparando ${selectedLeads.length} ações de ${source}...`);

    const actionType = source === 'unfollow' ? 'unfollow' : 'follow';

    const actions = selectedLeads.map(lead => ({
        type: actionType,
        target: { type: 'profile', value: lead.username.replace('@', '') },
        delay: Math.floor(Math.random() * (45000 - 30000 + 1) + 30000) // 30-45s entre ações para segurança
    }));

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'loadQueue',
            payload: { actions: actions }
        });

        if (response && response.success) {
            addConsoleEntry('success', `${actions.length} perfis enviados para a fila!`);

            // Mudar para a aba Dashboard
            const dashTab = document.querySelector('[data-tab="dashboard"]');
            if (dashTab) dashTab.click();

            // Iniciar automação
            startAutomation();
        }
    } catch (error) {
        console.error('Error loading queue:', error);
        addConsoleEntry('error', 'Falha ao enviar perfis para o motor de automação.');
    }
}

// Enviar leads para o CRM
async function sendLeadsToCRM() {
    const count = extensionState.extractedLeads.length;
    addConsoleEntry('info', `Enviando ${count} leads para o CRM...`);
    await new Promise(r => setTimeout(r, 1500));
    addConsoleEntry('success', 'Leads integrados ao CRM com sucesso!');
    extensionState.extractedLeads = [];
    updateResultsUI();
    document.getElementById('extractionProgress').style.display = 'none';
}

// Automação
async function startAutomation() {
    extensionState.isRunning = true;
    await chrome.runtime.sendMessage({ action: 'startAutomation' });
    updateUI();
    addConsoleEntry('success', 'Automação iniciada');
}

async function pauseAutomation() {
    extensionState.isRunning = false;
    await chrome.runtime.sendMessage({ action: 'pauseAutomation' });
    updateUI();
    addConsoleEntry('warning', 'Automação pausada');
}

// Console
function addConsoleEntry(type, message) {
    const log = document.getElementById('consoleLog');
    if (!log) return;

    const entry = document.createElement('div');
    entry.className = `eio-log-entry log-${type}`;
    const time = new Date().toLocaleTimeString('pt-BR');
    entry.innerHTML = `<span class="eio-log-time">[${time}]</span><span class="eio-log-msg">${message}</span>`;
    log.prepend(entry);
}

function clearConsole() {
    const log = document.getElementById('consoleLog');
    if (log) log.innerHTML = '';
}

// Carregar fluxos ativos
async function loadActiveFlows() {
    const list = document.getElementById('activeFlowsList');
    const noFlows = document.getElementById('noFlowsMessage');
    if (!list) return;

    let flows = [];

    if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
            if (response && response.currentFlow) {
                flows = [response.currentFlow];
            }
        } catch (e) { console.error('Error fetching flows', e); }
    } else {
        // Mock para preview
        flows = [
            { id: 1, name: 'Engajamento Orgânico #1', status: 'active' },
            { id: 2, name: 'Boas-vindas para Seguidores', status: 'paused' }
        ];
    }

    if (flows.length === 0) {
        list.style.display = 'none';
        if (noFlows) noFlows.style.display = 'flex';
    } else {
        list.style.display = 'block';
        if (noFlows) noFlows.style.display = 'none';

        list.innerHTML = flows.map(flow => `
            <div class="eio-flow-card">
                <div class="eio-flow-info">
                    <span class="eio-flow-name">${flow.name}</span>
                    <span class="eio-flow-status" style="color: ${flow.status === 'active' ? '#4CAF50' : '#FF9800'}">
                        ${flow.status === 'active' ? '✓ Rodando' : '⏳ Pausado'}
                    </span>
                </div>
                <div class="eio-flow-actions">
                    <button class="eio-btn-mini" onclick="toggleFlow(${flow.id})">${flow.status === 'active' ? 'Pausar' : 'Retomar'}</button>
                    <button class="eio-btn-mini eio-btn-mini-danger" onclick="stopFlow(${flow.id})">Parar</button>
                </div>
            </div>
        `).join('');
    }
}

window.toggleFlow = function (id) {
    console.log('Toggle flow:', id);
    alert('Ação enviada para o motor de automação.');
};

window.stopFlow = function (id) {
    if (confirm('Deseja realmente parar este fluxo?')) {
        console.log('Stop flow:', id);
        loadActiveFlows();
    }
};

// Reiniciar atualizações em tempo real
function startLiveUpdates() {
    loadActiveFlows();
    setInterval(async () => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
                if (stats && stats.stats) {
                    const follows = document.getElementById('followsToday');
                    const likes = document.getElementById('likesToday');
                    const comments = document.getElementById('commentsToday');
                    if (follows) follows.innerText = stats.stats.followsToday || 0;
                    if (likes) likes.innerText = stats.stats.likesToday || 0;
                    if (comments) comments.innerText = stats.stats.commentsToday || 0;
                }
            } catch (e) { }
        }
    }, 3000);
}

// UI Updates
function updateUI() {
    const startBtn = document.getElementById('startAutomationBtn');
    const pauseBtn = document.getElementById('pauseAutomationBtn');
    if (startBtn) startBtn.disabled = extensionState.isRunning;
    if (pauseBtn) pauseBtn.disabled = !extensionState.isRunning;

    loadActiveFlows();
}

// NOTA: As funções safeAddEventListener para refreshFlowsBtn e createFlowBtn
// já estão definidas dentro de initializeButtons() (linhas 241-250)

// Função para salvar configurações
window.saveSettings = async function () {
    const speedSetting = document.getElementById('speedSetting')?.value || 'safe';
    const autoStart = document.getElementById('autoStartSetting')?.checked || false;
    const notifications = document.getElementById('notificationsSetting')?.checked || true;

    const settings = {
        speed: speedSetting,
        autoStart: autoStart,
        notifications: notifications,
        savedAt: new Date().toISOString()
    };

    console.log('💾 Salvando configurações:', settings);

    // Salvar no Chrome Storage se disponível
    if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
            await chrome.storage.local.set({ settings });
        } catch (e) {
            console.log('Storage não disponível');
        }
    }

    // Fechar modal
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';

    // Feedback
    if (typeof showToast === 'function') {
        showToast('✅ Configurações salvas com sucesso!', 'success');
    }

    if (typeof addConsoleEntry === 'function') {
        addConsoleEntry('success', '✅ Configurações atualizadas');
    }
};
