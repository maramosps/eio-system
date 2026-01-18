/*
═══════════════════════════════════════════════════════════
  E.I.O - BACKGROUND SCRIPT (Service Worker)
  Motor de automação ultra-estável - VERSÃO 3.9
  COM DELAYS SEGUROS (120-180s entre perfis)
═══════════════════════════════════════════════════════════
*/

console.log('E.I.O Extension v3.9 starting...');

let extensionState = {
    isRunning: false,
    isPausedForSafety: false,
    currentActionType: 'follow',
    currentOptions: {},
    stats: {
        followsToday: 0, likesToday: 0, commentsToday: 0,
        storiesLikedToday: 0, unfollowsToday: 0, dmsToday: 0,
        totalActionsToday: 0, sessionStartTime: null
    },
    limits: {
        maxFollowsPerDay: 200, maxUnfollowsPerDay: 500,
        maxLikesPerDay: 300, maxTotalActionsPerDay: 1000,
        actionsBeforePause: 25, pauseDurationMinutes: 60
    },
    actionsInCurrentBatch: 0,
    queue: [],
    activeTabId: null
};

// ═══════════════════════════════════════════════════════════
// DELAYS FIXOS E SEGUROS - NÃO CONFIGURÁVEIS
// Estes valores são FIXOS para proteger as contas dos usuários
// ═══════════════════════════════════════════════════════════
const DELAY_CONFIG = {
    // Delay entre AÇÕES no MESMO perfil (seguir, curtir, stories)
    // 1 minuto e 20 segundos = 80.000 milissegundos
    BETWEEN_ACTIONS_SAME_PROFILE: 80000,

    // Delay entre PERFIS DIFERENTES
    // 1 minuto e 30 segundos = 90.000 milissegundos  
    BETWEEN_PROFILES: 90000
};

let isProcessing = false;
let processingTimeout = null;

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════

async function saveState() {
    try {
        await chrome.storage.local.set({
            extensionState: {
                ...extensionState,
                isRunning: extensionState.isRunning && extensionState.queue.length > 0
            }
        });
    } catch (e) {
        console.error('Save state error:', e);
    }
}

async function loadState() {
    try {
        const result = await chrome.storage.local.get(['extensionState']);
        if (result.extensionState) {
            extensionState = { ...extensionState, ...result.extensionState };
            console.log('[E.I.O] Estado carregado. Fila:', extensionState.queue.length);
        }
    } catch (e) {
        console.error('Load state error:', e);
    }
}

// ═══════════════════════════════════════════════════════════
// KEEP ALIVE - Mantém o Service Worker ativo
// ═══════════════════════════════════════════════════════════

chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        console.log('[E.I.O KeepAlive] Check - Running:', extensionState.isRunning, 'Queue:', extensionState.queue.length, 'Processing:', isProcessing);
        if (extensionState.isRunning && !isProcessing && extensionState.queue.length > 0) {
            console.log('[E.I.O KeepAlive] Detectou travamento! Reiniciando motor...');
            processQueue();
        }
    }
});

// ═══════════════════════════════════════════════════════════
// MESSAGE LISTENER
// ═══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = message.action || message.type;
    console.log('[E.I.O] Mensagem recebida:', action, message);

    switch (action) {
        case 'setQueue':
            extensionState.queue = message.queue || [];
            extensionState.currentActionType = message.actionType;
            extensionState.currentOptions = message.options || {};
            // Salvar tamanho inicial da fila para o contador de progresso
            totalQueueSize = extensionState.queue.length;
            processedCount = 0;
            console.log('[E.I.O] Fila configurada:', extensionState.queue.length, 'itens. Ação:', message.actionType);
            saveState();
            sendResponse({ success: true, count: extensionState.queue.length });
            break;

        case 'startAutomation':
            handleStartAutomation(sendResponse);
            return true;

        case 'pauseAutomation':
            console.log('[E.I.O] Automação pausada');
            extensionState.isRunning = false;
            if (processingTimeout) clearTimeout(processingTimeout);
            saveState();
            notifyPopup('automationPaused', {});
            sendResponse({ success: true });
            break;

        case 'stopAutomation':
            console.log('[E.I.O] Automação parada');
            extensionState.isRunning = false;
            extensionState.queue = [];
            isProcessing = false;
            if (processingTimeout) clearTimeout(processingTimeout);
            saveState();
            notifyPopup('automationStopped', {});
            sendResponse({ success: true });
            break;

        case 'getStatus':
            sendResponse({
                isRunning: extensionState.isRunning,
                queueLength: extensionState.queue.length,
                stats: extensionState.stats,
                isProcessing: isProcessing
            });
            break;

        case 'console_log':
            // Recebe logs do content script
            console.log(`[ContentScript ${message.level}] ${message.message}`);
            break;
    }
    return true;
});

async function handleStartAutomation(sendResponse) {
    try {
        console.log('[E.I.O] Iniciando automação...');

        // Buscar aba do Instagram
        const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
        console.log('[E.I.O] Abas do Instagram encontradas:', tabs.length);

        const instagramTab = tabs.find(t => t.active) || tabs[0];

        if (!instagramTab) {
            console.log('[E.I.O] ERRO: Nenhuma aba do Instagram encontrada');
            sendResponse({ success: false, message: 'Abra o Instagram primeiro!' });
            return;
        }

        console.log('[E.I.O] Usando aba:', instagramTab.id, 'URL:', instagramTab.url);

        extensionState.activeTabId = instagramTab.id;
        extensionState.isRunning = true;
        isProcessing = false;

        saveState();

        // Testar comunicação com content script
        try {
            const pingResult = await chrome.tabs.sendMessage(instagramTab.id, { action: 'get_profile_info' });
            console.log('[E.I.O] Ping para content script:', pingResult ? 'OK' : 'Sem resposta');
        } catch (pingError) {
            console.log('[E.I.O] Aviso: Content script pode não estar pronto:', pingError.message);
        }

        // Iniciar processamento
        processQueue();

        notifyPopup('automationStarted', {});
        sendResponse({ success: true });

    } catch (e) {
        console.error('[E.I.O] Erro ao iniciar:', e);
        sendResponse({ success: false, message: e.message });
    }
}

// ═══════════════════════════════════════════════════════════
// MOTOR DE AUTOMAÇÃO
// ═══════════════════════════════════════════════════════════

let totalQueueSize = 0;  // Tamanho inicial da fila
let processedCount = 0;  // Quantos foram processados

async function processQueue() {
    console.log('[E.I.O Motor] processQueue chamado. isProcessing:', isProcessing, 'isRunning:', extensionState.isRunning, 'Queue:', extensionState.queue.length);

    // Guards
    if (isProcessing) {
        console.log('[E.I.O Motor] Já processando, ignorando...');
        return;
    }
    if (!extensionState.isRunning) {
        console.log('[E.I.O Motor] Não está rodando, ignorando...');
        return;
    }
    if (extensionState.queue.length === 0) {
        console.log('[E.I.O Motor] Fila vazia, finalizando...');
        extensionState.isRunning = false;
        notifyPopup('automationStopped', { message: 'Fila concluída!' });
        notifyPopup('progressUpdate', { current: totalQueueSize, total: totalQueueSize });
        logAction('success', '✅ Fila concluída!');
        processedCount = 0;
        totalQueueSize = 0;
        saveState();
        return;
    }

    isProcessing = true;
    processedCount++;

    // Notificar popup sobre o progresso atual
    notifyPopup('progressUpdate', { current: processedCount, total: totalQueueSize });

    try {
        // Garantir que temos uma aba válida
        let tabId = await ensureValidTab();
        if (!tabId) {
            throw new Error('Não foi possível encontrar aba do Instagram');
        }

        console.log('[E.I.O Motor] Tab válida:', tabId);

        // Pegar próximo item
        const item = extensionState.queue.shift();
        const actions = item.actions || [extensionState.currentActionType];
        const options = item.options || extensionState.currentOptions;

        console.log(`[E.I.O Motor] Processando @${item.username} - Ações: ${actions.join(', ')}`);
        logAction('info', `🎯 [${processedCount}/${totalQueueSize}] Processando @${item.username}...`);

        // Executar ações
        for (const actionType of actions) {
            if (!extensionState.isRunning) {
                console.log('[E.I.O Motor] Parado durante execução');
                break;
            }

            console.log(`[E.I.O Motor] Executando ${actionType} em @${item.username}`);

            try {
                const result = await sendMessageWithRetry(tabId, {
                    action: 'execute',
                    payload: { type: actionType, target: item.username, options }
                });

                console.log('[E.I.O Motor] Resultado:', JSON.stringify(result));

                if (result?.success || result?.meta?.success || result?.action?.includes('followed') || result?.action?.includes('liked')) {
                    updateStats(actionType);
                    logAction('success', `✅ ${actionType} OK (@${item.username})`);

                    // Notificar popup para atualizar stamp visual
                    let status = 'followed';
                    if (result?.action?.includes('requested')) status = 'requested';
                    else if (actionType === 'unfollow') status = 'unfollowed';
                    else if (actionType === 'like') status = 'liked';

                    notifyPopup('actionCompleted', { username: item.username, action: status });
                } else {
                    logAction('warning', `⚠️ ${actionType} falhou: ${result?.error || result?.action || 'erro'}`);
                    notifyPopup('actionCompleted', { username: item.username, action: 'error' });
                }
            } catch (msgError) {
                console.error(`[E.I.O Motor] Erro na mensagem:`, msgError);
                logAction('error', `❌ Erro: ${msgError.message}`);
                notifyPopup('actionCompleted', { username: item.username, action: 'error' });
            }

            // ═══════════════════════════════════════════════════════════
            // DELAY ENTRE AÇÕES NO MESMO PERFIL: 1min20s (80 segundos)
            // ═══════════════════════════════════════════════════════════
            if (extensionState.isRunning && actions.indexOf(actionType) < actions.length - 1) {
                const delay = DELAY_CONFIG.BETWEEN_ACTIONS_SAME_PROFILE;
                const delaySeconds = Math.round(delay / 1000);
                logAction('info', `⏳ Aguardando ${delaySeconds}s para próxima ação...`);
                console.log(`[E.I.O Motor] Delay entre ações: ${delay}ms (${delaySeconds}s)`);
                await sleep(delay);
            }
        }

        await saveState();

        // ═══════════════════════════════════════════════════════════
        // DELAY ENTRE PERFIS DIFERENTES: 1min30s (90 segundos)
        // ═══════════════════════════════════════════════════════════
        if (extensionState.isRunning && extensionState.queue.length > 0) {
            const delay = DELAY_CONFIG.BETWEEN_PROFILES;
            const delaySeconds = Math.round(delay / 1000);
            logAction('info', `⏱️ Próximo perfil em ${delaySeconds}s... (${extensionState.queue.length} restantes)`);
            console.log(`[E.I.O Motor] Agendando próximo perfil em ${delay}ms (${delaySeconds}s)`);

            isProcessing = false;
            processingTimeout = setTimeout(() => {
                processQueue();
            }, delay);
        } else {
            isProcessing = false;
            if (extensionState.queue.length === 0) {
                extensionState.isRunning = false;
                logAction('success', '✅ Fila concluída!');
                notifyPopup('automationStopped', {});
                saveState();
            }
        }

    } catch (error) {
        console.error('[E.I.O Motor] Erro:', error);
        logAction('error', `❌ Erro no motor: ${error.message}`);
        isProcessing = false;

        // Tentar novamente após 10 segundos
        if (extensionState.isRunning && extensionState.queue.length > 0) {
            console.log('[E.I.O Motor] Tentando novamente em 10 segundos...');
            processingTimeout = setTimeout(() => processQueue(), 10000);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════

async function ensureValidTab() {
    let tabId = extensionState.activeTabId;

    // Verificar se a aba ainda é válida
    try {
        if (tabId) {
            const tab = await chrome.tabs.get(tabId);
            if (tab && tab.url && tab.url.includes('instagram.com')) {
                console.log('[E.I.O] Aba válida:', tabId);
                return tabId;
            }
        }
    } catch (e) {
        console.log('[E.I.O] Aba anterior não existe mais:', e.message);
    }

    // Buscar nova aba do Instagram
    const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
    if (tabs.length > 0) {
        tabId = tabs[0].id;
        extensionState.activeTabId = tabId;
        console.log('[E.I.O] Nova aba encontrada:', tabId);
        return tabId;
    }

    console.log('[E.I.O] Nenhuma aba do Instagram encontrada!');
    return null;
}

async function sendMessageWithRetry(tabId, message, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[E.I.O] Enviando mensagem (tentativa ${i + 1}/${retries}) para tab ${tabId}:`, message.action);
            const result = await chrome.tabs.sendMessage(tabId, message);
            console.log(`[E.I.O] Resposta recebida:`, result);
            return result;
        } catch (error) {
            console.log(`[E.I.O] Tentativa ${i + 1}/${retries} falhou:`, error.message);

            if (error.message.includes('context invalidated') || error.message.includes('no tab')) {
                // Content script morreu ou aba fechou, tentar encontrar outra
                const newTabId = await ensureValidTab();
                if (newTabId && newTabId !== tabId) {
                    console.log('[E.I.O] Tentando nova aba:', newTabId);
                    tabId = newTabId;
                    continue;
                }
            }

            if (i < retries - 1) {
                console.log('[E.I.O] Aguardando 2s antes de tentar novamente...');
                await sleep(2000);
            }
        }
    }
    throw new Error('Não foi possível comunicar com a aba do Instagram. Atualize a página (F5).');
}

function updateStats(type) {
    extensionState.stats.totalActionsToday++;
    extensionState.actionsInCurrentBatch++;
    if (type === 'follow') extensionState.stats.followsToday++;
    if (type === 'like') extensionState.stats.likesToday++;
    if (type === 'unfollow') extensionState.stats.unfollowsToday++;
    notifyPopup('statsUpdate', { stats: extensionState.stats });
}

function logAction(level, message) {
    console.log(`[E.I.O LOG] ${message}`);
    notifyPopup('consoleMessage', { level, message, timestamp: new Date().toISOString() });
}

function notifyPopup(type, data) {
    chrome.runtime.sendMessage({ type, ...data }).catch(() => { });
}

function calculateHumanDelay(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════

loadState().then(() => {
    console.log('[E.I.O] Background script pronto!');

    // Se havia automação em andamento, retomar
    if (extensionState.isRunning && extensionState.queue.length > 0) {
        console.log('[E.I.O] Retomando automação anterior...');
        setTimeout(() => processQueue(), 2000);
    }
});

console.log('E.I.O Extension v3.8 installed');
