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
    websocket: null
};

// Constantes
const API_BASE_URL = 'https://api.eio-system.com/v1';
const WS_URL = 'wss://api.eio-system.com';

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
        case 'getStats':
            sendResponse({ stats: extensionState.stats });
            break;
        case 'getStatus':
            sendResponse({
                isRunning: extensionState.isRunning,
                currentFlow: extensionState.currentFlow,
                queueLength: extensionState.queue.length,
                isPausedForSafety: extensionState.isPausedForSafety,
                pauseEndTime: extensionState.pauseEndTime
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
            sendResponse({ success: true, count: extensionState.queue.length });
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

/**
 * Processar fila respeitando segurança
 */
async function processQueue() {
    if (!extensionState.isRunning || extensionState.queue.length === 0) return;

    if (!checkLimits()) {
        console.log('Safety pause or limit reached');
        return;
    }

    const action = extensionState.queue.shift();
    if (!action) {
        await pauseAutomation();
        return;
    }

    try {
        await executeAction(action);
    } catch (error) {
        logAction('error', `Erro na ação: ${error.message}`);
    }
    await saveState();
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
        updateStats(action.type);
        logAction('success', `Ação ${action.type} concluída`, result.meta);
        await sendActionToBackend(action, result);
    }
    await sleep(action.delay || calculateHumanDelay());
}

function updateStats(type) {
    if (!extensionState.stats.sessionStartTime) extensionState.stats.sessionStartTime = new Date().toISOString();
    extensionState.stats.totalActionsToday++;
    extensionState.actionsInCurrentBatch++;
    switch (type) {
        case 'follow': extensionState.stats.followsToday++; break;
        case 'like': extensionState.stats.likesToday++; break;
        case 'comment': extensionState.stats.commentsToday++; break;
        case 'likeStory': extensionState.stats.storiesLikedToday++; break;
        case 'unfollow': extensionState.stats.unfollowsToday++; break;
    }
    notifyPopup('statsUpdate', { stats: extensionState.stats });
    saveState();
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

function calculateHumanDelay(min = 3000, max = 7000) {
    return Math.floor(Math.random() * (max - min) + min);
}

async function saveState() {
    await chrome.storage.local.set({ extensionState });
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
