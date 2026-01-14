/*
1: ═══════════════════════════════════════════════════════════
2:   E.I.O - BACKGROUND SCRIPT (Service Worker)
3:   Motor de automação da extensão
4: ═══════════════════════════════════════════════════════════
*/

// Estado global da extensão consolidado
let extensionState = {
    isRunning: false,
    isPausedForSafety: false,
    pauseEndTime: null,
    currentFlow: null,
    stats: {
        followsToday: 0,
        likesToday: 0,
        commentsToday: 0,
        storiesLikedToday: 0,
        unfollowsToday: 0,
        dmsToday: 0,
        totalActionsToday: 0,
        sessionStartTime: null
    },
    limits: {
        maxFollowsPerDay: 200,
        maxUnfollowsPerDay: 500,
        maxLikesPerDay: 300,
        maxTotalActionsPerDay: 1000,
        maxHoursPerDay: 8,
        actionsBeforePause: 25,
        pauseDurationMinutes: 60
    },
    actionsInCurrentBatch: 0,
    queue: [],
    lastActionTime: null,
    authToken: null,
    userId: null,
    websocket: null,
    actionHistory: []
};

// Constantes
const API_BASE_URL = 'https://eio-system.vercel.app/api/v1';
const WS_URL = 'https://eio-system.vercel.app';

/**
 * Inicialização da extensão
 */
chrome.runtime.onInstalled.addListener(async () => {
    console.log('E.I.O Extension installed');
    const savedState = await chrome.storage.local.get(['extensionState']);
    if (savedState.extensionState) {
        extensionState = { ...extensionState, ...savedState.extensionState };
    }
    resetDailyStats();
    chrome.alarms.create('resetDailyStats', {
        when: getNextMidnight(),
        periodInMinutes: 24 * 60
    });
    await connectToBackend();
});

/**
 * Listener para mensagens
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received:', message);
    switch (message.action) {
        case 'startAutomation':
            startAutomation().then(sendResponse);
            break;
        case 'pauseAutomation':
            pauseAutomation().then(sendResponse);
            break;
        case 'stopAutomation':
            stopAutomation().then(sendResponse);
            break;
        case 'getStats':
            sendResponse({ stats: extensionState.stats });
            break;
        case 'getStatus':
            sendResponse({
                isRunning: extensionState.isRunning,
                currentFlow: extensionState.currentFlow,
                queueLength: extensionState.queue.length,
                isPausedForSafety: extensionState.isPausedForSafety,
                pauseEndTime: extensionState.pauseEndTime,
                stats: extensionState.stats
            });
            break;
        case 'executeAction':
            executeAction(message.payload).then(sendResponse);
            break;
        case 'logAction':
            logAction(message.level, message.message, message.meta);
            sendResponse({ success: true });
            break;
        case 'loadQueue':
            extensionState.queue = message.payload.actions;
            extensionState.stats.sessionStartTime = new Date().toISOString();
            saveState();
            logAction('info', `Fila carregada: ${extensionState.queue.length} ações`);
            sendResponse({ success: true, count: extensionState.queue.length });
            break;
        case 'setQueue':
            // Set queue from popup with action type
            extensionState.queue = message.queue.map(account => ({
                ...account,
                actionType: message.actionType
            }));
            extensionState.currentActionType = message.actionType;
            extensionState.stats.sessionStartTime = new Date().toISOString();
            saveState();
            logAction('info', `📋 Fila definida: ${extensionState.queue.length} contas para "${message.actionType}"`);
            sendResponse({ success: true, count: extensionState.queue.length });
            break;
        case 'startAutomation':
            if (extensionState.queue.length === 0) {
                sendResponse({ success: false, message: 'Fila vazia. Selecione contas e uma ação primeiro.' });
            } else if (hasReachedDailyLimit()) {
                sendResponse({ success: false, message: 'Limite diário atingido. Aguarde até amanhã.' });
            } else {
                extensionState.isRunning = true;
                saveState();
                processQueue();
                notifyPopup('automationStarted', {});
                sendResponse({ success: true });
            }
            break;
        case 'pauseAutomation':
            extensionState.isRunning = false;
            saveState();
            notifyPopup('automationPaused', {});
            sendResponse({ success: true });
            break;
        case 'stopAutomation':
            extensionState.isRunning = false;
            extensionState.queue = [];
            saveState();
            notifyPopup('automationStopped', {});
            sendResponse({ success: true });
            break;
        case 'getQueue':
            sendResponse({ queue: extensionState.queue });
            break;
        case 'clearQueue':
            extensionState.queue = [];
            saveState();
            sendResponse({ success: true });
            break;
        case 'getHistory':
            sendResponse({ history: extensionState.actionHistory || [] });
            break;
        case 'updateConfig':
            if (message.payload) {
                extensionState.limits = { ...extensionState.limits, ...message.payload.limits };
                saveState();
            }
            sendResponse({ success: true });
            break;
        case 'console_log':
            // Forward console log to popup if open
            notifyPopup('consoleMessage', { level: message.level, message: message.message });
            sendResponse({ success: true });
            break;
        default:
            sendResponse({ error: 'Unknown action' });
    }
    return true;
});


/**
 * Listener para alarmes
 */
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'resetDailyStats') {
        resetDailyStats();
    } else if (alarm.name === 'processQueue') {
        processQueue();
    }
});

/**
 * Conectar ao backend
 */
async function connectToBackend() {
    try {
        const { authToken } = extensionState;
        if (!authToken) return;
        console.log('Connection attempt to backend...');
        await fetchActiveFlows();
    } catch (error) {
        console.error('Error connecting to backend:', error);
    }
}

async function fetchActiveFlows() {
    try {
        if (!extensionState.authToken) return;
        const response = await fetch(`${API_BASE_URL}/flows?status=active`, {
            headers: {
                'Authorization': `Bearer ${extensionState.authToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.flows && data.flows.length > 0) {
                extensionState.currentFlow = data.flows[0];
                buildQueueFromFlow(data.flows[0]);
            }
        }
    } catch (error) {
        console.error('Error fetching flows:', error);
    }
}

function buildQueueFromFlow(flow) {
    const queue = [];
    const config = typeof flow.config === 'string' ? JSON.parse(flow.config) : flow.config;
    if (config.steps) {
        config.steps.forEach(step => {
            queue.push({
                type: step.type,
                target: step.target,
                options: step.options,
                filters: step.filters,
                delay: step.delay || calculateHumanDelay()
            });
        });
    }
    extensionState.queue = queue;
    saveState();
}

async function startAutomation() {
    try {
        if (extensionState.isRunning) return { success: false, message: 'Already running' };
        if (extensionState.queue.length === 0) {
            await fetchActiveFlows();
            if (extensionState.queue.length === 0) return { success: false, message: 'No actions' };
        }
        extensionState.isRunning = true;
        await saveState();
        logAction('info', 'Automação iniciada');
        notifyPopup('automationStarted', {});
        chrome.alarms.create('processQueue', {
            delayInMinutes: 0.1,
            periodInMinutes: 0.5
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function pauseAutomation() {
    try {
        extensionState.isRunning = false;
        await saveState();
        chrome.alarms.clear('processQueue');
        logAction('warning', 'Automação pausada');
        notifyPopup('automationPaused', {});
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function stopAutomation() {
    try {
        extensionState.isRunning = false;
        extensionState.queue = [];
        extensionState.actionsInCurrentBatch = 0;
        await saveState();
        chrome.alarms.clear('processQueue');
        logAction('info', 'Automação parada e fila limpa');
        notifyPopup('automationStopped', {});
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Sistema de Limites Inteligentes (O Cérebro)
 */
function checkLimits() {
    const now = new Date();

    // 1. Pausa de 60 min
    if (extensionState.isPausedForSafety) {
        if (now < new Date(extensionState.pauseEndTime)) {
            return false;
        } else {
            extensionState.isPausedForSafety = false;
            extensionState.actionsInCurrentBatch = 0;
            logAction('success', 'Pausa concluída. Retomando...');
        }
    }

    // 2. Limites Diários Específicos
    if (extensionState.stats.followsToday >= extensionState.limits.maxFollowsPerDay) {
        logAction('error', `Limite diário de Seguidores (${extensionState.limits.maxFollowsPerDay}) atingido.`);
        pauseAutomation();
        return false;
    }

    if (extensionState.stats.unfollowsToday >= extensionState.limits.maxUnfollowsPerDay) {
        logAction('error', `Limite diário de Unfollow (${extensionState.limits.maxUnfollowsPerDay}) atingido.`);
        pauseAutomation();
        return false;
    }

    if (extensionState.stats.totalActionsToday >= extensionState.limits.maxTotalActionsPerDay) {
        logAction('error', 'Limite total de ações diárias atingido.');
        pauseAutomation();
        return false;
    }

    // 3. Janela de 8h
    if (extensionState.stats.sessionStartTime) {
        const start = new Date(extensionState.stats.sessionStartTime);
        const hours = (now - start) / 3600000;
        if (hours >= extensionState.limits.maxHoursPerDay) {
            logAction('error', 'Limite de 8h diárias atingido.');
            pauseAutomation();
            return false;
        }
    } else {
        extensionState.stats.sessionStartTime = now.toISOString();
    }

    // 4. Pausa por lote
    if (extensionState.actionsInCurrentBatch >= extensionState.limits.actionsBeforePause) {
        extensionState.isPausedForSafety = true;
        extensionState.pauseEndTime = new Date(now.getTime() + extensionState.limits.pauseDurationMinutes * 60000).toISOString();
        logAction('warning', `Lote de ${extensionState.limits.actionsBeforePause} concluído. Pausando por 60 min.`);
        return false;
    }

    return true;
}

async function executeAction(action) {
    const tabs = await chrome.tabs.query({ url: 'https://*.instagram.com/*' });
    if (tabs.length === 0) {
        const tab = await chrome.tabs.create({ url: 'https://www.instagram.com' });
        await waitForTabLoad(tab.id);
    }
    const targetTab = tabs[0] || (await chrome.tabs.query({ url: 'https://*.instagram.com/*' }))[0];

    const result = await chrome.tabs.sendMessage(targetTab.id, {
        action: 'execute',
        payload: action
    });

    if (result && result.success) {
        updateStats(action.type, action.target);
        logAction('success', `${getActionLabel(action.type)} @${action.target.replace('@', '')}`, result.meta);
        await sendActionToBackend(action, result);
    }
    await sleep(action.delay || calculateHumanDelay());
}

function getActionLabel(type) {
    const labels = {
        'follow': 'Seguiu',
        'like': 'Curtiu',
        'comment': 'Comentou',
        'dm': 'Enviou DM',
        'likeStory': 'Curtiu Story',
        'unfollow': 'Deixou de seguir'
    };
    return labels[type] || type;
}

function updateStats(type, target = 'Automação') {
    if (!extensionState.stats.sessionStartTime) extensionState.stats.sessionStartTime = new Date().toISOString();
    extensionState.stats.totalActionsToday++;
    extensionState.actionsInCurrentBatch++;
    switch (type) {
        case 'follow': extensionState.stats.followsToday++; break;
        case 'like': extensionState.stats.likesToday++; break;
        case 'comment': extensionState.stats.commentsToday++; break;
        case 'likeStory': extensionState.stats.storiesLikedToday++; break;
        case 'unfollow': extensionState.stats.unfollowsToday++; break;
        case 'dm': extensionState.stats.dmsToday++; break;
    }

    // Adicionar ao histórico
    addToHistory(type, target);

    notifyPopup('statsUpdate', { stats: extensionState.stats });
    saveState();
}

/**
 * Adicionar ao histórico global (Persistente)
 */
function addToHistory(type, target) {
    if (!extensionState.actionHistory) extensionState.actionHistory = [];

    extensionState.actionHistory.unshift({
        type: type,
        target: target,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });

    if (extensionState.actionHistory.length > 20) {
        extensionState.actionHistory.pop();
    }
}

async function sendActionToBackend(action, result) {
    try {
        if (!extensionState.authToken) return;
        await fetch(`${API_BASE_URL}/executions/log`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${extensionState.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: action.type, result, timestamp: new Date().toISOString() })
        });
    } catch (e) { }
}

async function logAction(level, message, meta = {}) {
    const entry = { level, message, meta, timestamp: new Date().toISOString() };
    console.log(`[LOG] ${message}`);
    notifyPopup('consoleMessage', entry);
    try {
        if (!extensionState.authToken) return;
        await fetch(`${API_BASE_URL}/logs`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${extensionState.authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
    } catch (e) { }
}

function notifyPopup(type, data) {
    chrome.runtime.sendMessage({ type, ...data }).catch(() => { });
}

function resetDailyStats() {
    extensionState.stats = {
        followsToday: 0, likesToday: 0, commentsToday: 0,
        storiesLikedToday: 0, unfollowsToday: 0, totalActionsToday: 0,
        sessionStartTime: null
    };
    extensionState.actionsInCurrentBatch = 0;
    saveState();
}

function calculateHumanDelay(min = 30000, max = 120000) {
    return Math.floor(Math.random() * (max - min) + min);
}

async function saveState() {
    try {
        const result = await chrome.storage.local.get(['extensionState']);
        const currentState = result.extensionState || {};

        // Mesclar estados: manter dados da popup (leads, filtros) e atualizar dados do motor (queue, stats, history)
        const newState = {
            ...currentState,
            ...extensionState,
            // Garantir que não perdemos o que é exclusivo da popup se ela já salvou
            extractedLeads: currentState.extractedLeads || extensionState.extractedLeads || []
        };

        await chrome.storage.local.set({ extensionState: newState });
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

function getNextMidnight() {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.getTime();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForTabLoad(tabId) {
    return new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function l(id, info) {
            if (id === tabId && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(l);
                resolve();
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
// SECURITY & LIMITS
// ═══════════════════════════════════════════════════════════
function hasReachedDailyLimit() {
    const { limits, stats } = extensionState;

    // Check total actions
    if (stats.totalActionsToday >= limits.maxTotalActionsPerDay) {
        logAction('warning', '🛑 Limite diário total atingido');
        return true;
    }

    // Check specific action limits based on current action type
    const actionType = extensionState.currentActionType;
    if (actionType === 'follow' && stats.followsToday >= limits.maxFollowsPerDay) {
        logAction('warning', '🛑 Limite diário de follows atingido');
        return true;
    }
    if (actionType === 'unfollow' && stats.unfollowsToday >= limits.maxUnfollowsPerDay) {
        logAction('warning', '🛑 Limite diário de unfollows atingido');
        return true;
    }
    if (actionType === 'like' && stats.likesToday >= limits.maxLikesPerDay) {
        logAction('warning', '🛑 Limite diário de likes atingido');
        return true;
    }

    return false;
}

function shouldTakeSafetyPause() {
    const { limits, actionsInCurrentBatch } = extensionState;
    return actionsInCurrentBatch >= limits.actionsBeforePause;
}

// ═══════════════════════════════════════════════════════════
// QUEUE PROCESSING
// ═══════════════════════════════════════════════════════════
async function processQueue() {
    if (!extensionState.isRunning) return;
    if (extensionState.queue.length === 0) {
        logAction('success', '✅ Fila concluída!');
        extensionState.isRunning = false;
        notifyPopup('automationStopped', {});
        saveState();
        return;
    }

    // Check limits
    if (hasReachedDailyLimit()) {
        extensionState.isRunning = false;
        notifyPopup('automationStopped', {});
        saveState();
        return;
    }

    // Check safety pause
    if (shouldTakeSafetyPause()) {
        const pauseMinutes = extensionState.limits.pauseDurationMinutes;
        logAction('warning', `⏸️ Pausa de segurança: ${pauseMinutes} minutos`);
        extensionState.actionsInCurrentBatch = 0;
        extensionState.isPausedForSafety = true;
        extensionState.pauseEndTime = Date.now() + (pauseMinutes * 60 * 1000);
        notifyPopup('automationPaused', {});
        saveState();

        // Resume after pause
        setTimeout(() => {
            extensionState.isPausedForSafety = false;
            if (extensionState.isRunning) {
                processQueue();
            }
        }, pauseMinutes * 60 * 1000);
        return;
    }

    // Get next item
    const item = extensionState.queue.shift();
    const actions = item.actions || [item.actionType || extensionState.currentActionType];
    const options = item.options || extensionState.currentOptions || {};
    const total = extensionState.queue.length + 1;
    const current = total - extensionState.queue.length;

    notifyPopup('automationProgress', { current, total });
    logAction('info', `👤 Processando ${item.username}...`);

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.url?.includes('instagram.com')) {
            logAction('warning', '⚠️ Navegue para o Instagram primeiro');
            return;
        }

        const tabId = tabs[0].id;

        // Navigate to profile
        const profileUrl = `https://www.instagram.com/${item.username.replace('@', '')}/`;
        await chrome.tabs.update(tabId, { url: profileUrl });
        await sleep(4000);

        // Execute each action in sequence
        for (const actionType of actions) {
            if (!extensionState.isRunning) break;

            logAction('info', `🎯 ${actionType} em ${item.username}`);

            try {
                // Execute the action
                const result = await chrome.tabs.sendMessage(tabId, {
                    action: 'execute',
                    payload: {
                        type: actionType,
                        target: item.username,
                        options: {
                            likeCount: options.likeCount || 3,
                            useDashboardMsg: options.useDashboardMsg || false
                        }
                    }
                });

                if (result?.success) {
                    updateStats(actionType, item.username);
                    extensionState.actionsInCurrentBatch++;
                    logAction('success', `✅ ${actionType} OK`);
                } else {
                    logAction('warning', `⚠️ Falha ${actionType}: ${result?.error || 'erro'}`);
                }

                // Small delay between actions on same profile
                await sleep(calculateHumanDelay(3000, 6000));

            } catch (actionError) {
                logAction('warning', `⚠️ Erro em ${actionType}: ${actionError.message}`);
            }
        }

        // Also like posts if option enabled and follow was selected
        if (options.likePosts && actions.includes('follow')) {
            const likeCount = options.likeCount || 3;
            logAction('info', `❤️ Curtindo ${likeCount} posts...`);

            await chrome.tabs.sendMessage(tabId, {
                action: 'execute',
                payload: { type: 'like', target: item.username, options: { count: likeCount } }
            });
            await sleep(2000);
        }

        // View story if option enabled and follow was selected
        if (options.viewStory && actions.includes('follow')) {
            logAction('info', `👁️ Vendo story...`);
            await chrome.tabs.sendMessage(tabId, {
                action: 'execute',
                payload: { type: 'story', target: item.username }
            });
            await sleep(3000);
        }

        saveState();

        // Calculate human-like delay before next profile
        const delay = calculateHumanDelay(45000, 90000); // 45-90 seconds
        logAction('info', `⏱️ Aguardando ${Math.round(delay / 1000)}s...`);

        await sleep(delay);

        // Continue processing
        if (extensionState.isRunning) {
            processQueue();
        }

    } catch (error) {
        logAction('error', `❌ Erro: ${error.message}`);
        saveState();

        // Continue after error
        await sleep(5000);
        if (extensionState.isRunning) {
            processQueue();
        }
    }
}
