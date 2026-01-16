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
const SUPABASE_URL = 'https://zupnyvnrmwoyqajecxmm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc0MTUsImV4cCI6MjA4MjQzMzQxNX0.j_kNf6oUjY65DXIdIVtDKOHlkktlZvzqHuo_SlEzUvY';

// Configuração de delays humanizados (em milissegundos)
const DELAY_CONFIG = {
    MIN_BETWEEN_PROFILES: 30000,   // 30 segundos mínimo
    MAX_BETWEEN_PROFILES: 120000,  // 120 segundos máximo
    MIN_BETWEEN_ACTIONS: 5000,     // 5 segundos entre ações no mesmo perfil
    MAX_BETWEEN_ACTIONS: 15000,    // 15 segundos entre ações no mesmo perfil
    MIN_UNFOLLOW: 30000,           // 30 segundos para unfollow
    MAX_UNFOLLOW: 90000,           // 90 segundos para unfollow
    MIN_FOLLOW: 30000,             // 30 segundos para follow
    MAX_FOLLOW: 90000              // 90 segundos para follow
};

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
        case 'getAnalyticsData':
            // Retornar dados completos para o Analytics do Dashboard
            (async () => {
                try {
                    const result = await chrome.storage.local.get(['eio_analytics_history', 'eio_analytics_stats']);
                    sendResponse({
                        success: true,
                        history: result.eio_analytics_history || [],
                        stats: result.eio_analytics_stats || {},
                        currentStats: extensionState.stats
                    });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indica resposta assíncrona
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
        case 'navigate':
            // Navegar para uma URL específica (usado para DMs)
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.update(tabs[0].id, { url: message.url });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'No active tab' });
                }
            });
            break;
        case 'sendDM':
            // Enviar DM para um usuário
            (async () => {
                try {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs[0]?.url?.includes('instagram.com')) {
                        sendResponse({ success: false, error: 'Navegue para o Instagram primeiro' });
                        return;
                    }

                    const result = await chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'execute',
                        payload: {
                            type: 'dm',
                            target: message.target,
                            message: message.message
                        }
                    });

                    sendResponse(result);
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            break;
        case 'sendBulkDM':
            // Enviar DMs em massa com delays
            (async () => {
                try {
                    const targets = message.targets || [];
                    const template = message.template || '';
                    const delayMin = message.delayMin || 60000; // 1 min default
                    const delayMax = message.delayMax || 120000; // 2 min default

                    logAction('info', `📨 Iniciando envio de ${targets.length} DMs...`);

                    for (let i = 0; i < targets.length; i++) {
                        if (!extensionState.isRunning) {
                            logAction('warning', '⏸️ Envio de DMs pausado');
                            break;
                        }

                        const target = targets[i];
                        logAction('info', `📩 Enviando DM ${i + 1}/${targets.length} para @${target}...`);

                        // Navegar e enviar
                        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                        if (tabs[0]) {
                            await chrome.tabs.update(tabs[0].id, {
                                url: `https://www.instagram.com/direct/t/${target}/`
                            });
                            await sleep(3000);

                            await chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'execute',
                                payload: {
                                    type: 'dm',
                                    target: target,
                                    message: template
                                }
                            });

                            updateStats('dm', target);
                        }

                        // Delay entre mensagens
                        const delay = calculateHumanDelay(delayMin, delayMax);
                        logAction('info', `⏱️ Aguardando ${Math.round(delay / 1000)}s...`);
                        await sleep(delay);
                    }

                    logAction('success', `✅ Envio de DMs concluído!`);
                    sendResponse({ success: true, sent: targets.length });
                } catch (error) {
                    logAction('error', `❌ Erro no envio de DMs: ${error.message}`);
                    sendResponse({ success: false, error: error.message });
                }
            })();
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
 * Adicionar ao histórico global (Persistente para Analytics)
 */
async function addToHistory(type, target, success = true) {
    if (!extensionState.actionHistory) extensionState.actionHistory = [];

    const historyEntry = {
        type: type,
        target: target,
        username: target?.replace('@', '') || '',
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('pt-BR'),
        success: success
    };

    // Histórico local da extensão (últimos 20)
    extensionState.actionHistory.unshift(historyEntry);
    if (extensionState.actionHistory.length > 20) {
        extensionState.actionHistory.pop();
    }

    // Salvar histórico completo para Analytics do Dashboard
    saveToAnalyticsHistory(historyEntry);
}

/**
 * Salvar no histórico de Analytics (persistente e sem limite)
 */
async function saveToAnalyticsHistory(entry) {
    try {
        // Carregar histórico existente
        const result = await chrome.storage.local.get(['eio_analytics_history']);
        let history = result.eio_analytics_history || [];

        // Adicionar nova entrada
        history.push(entry);

        // Limitar a 1000 entradas para não sobrecarregar
        if (history.length > 1000) {
            history = history.slice(-1000);
        }

        // Salvar
        await chrome.storage.local.set({ eio_analytics_history: history });

        // Também salvar estatísticas agregadas
        await updateAnalyticsStats();
    } catch (error) {
        console.error('Erro ao salvar no histórico de Analytics:', error);
    }
}

/**
 * Atualizar estatísticas agregadas para Analytics
 */
async function updateAnalyticsStats() {
    try {
        const result = await chrome.storage.local.get(['eio_analytics_history']);
        const history = result.eio_analytics_history || [];

        // Calcular totais
        const stats = {
            totalFollows: 0,
            totalLikes: 0,
            totalComments: 0,
            totalDMs: 0,
            totalUnfollows: 0,
            totalStories: 0,
            totalActions: history.length,
            lastUpdated: new Date().toISOString()
        };

        history.forEach(entry => {
            switch (entry.type) {
                case 'follow': stats.totalFollows++; break;
                case 'like': stats.totalLikes++; break;
                case 'comment': stats.totalComments++; break;
                case 'dm': stats.totalDMs++; break;
                case 'unfollow': stats.totalUnfollows++; break;
                case 'likeStory': case 'story': stats.totalStories++; break;
            }
        });

        await chrome.storage.local.set({ eio_analytics_stats: stats });
    } catch (error) {
        console.error('Erro ao atualizar stats de Analytics:', error);
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

/**
 * Salvar ação no Supabase para aparecer no Dashboard
 * Esta função envia as ações para o banco de dados em tempo real
 */
async function saveActionToSupabase(actionType, target, success = true) {
    try {
        // Obter dados do usuário do storage
        const storage = await chrome.storage.local.get(['eio_user', 'eio_user_id']);
        const userId = storage.eio_user_id || storage.eio_user?.id;

        if (!userId) {
            console.log('[SUPABASE] Usuário não encontrado no storage');
            return;
        }

        const actionData = {
            user_id: userId,
            action_type: actionType,
            target_username: target?.replace('@', '') || '',
            success: success,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            session_id: extensionState.stats.sessionStartTime || Date.now().toString()
        };

        console.log('[SUPABASE] Salvando ação:', actionData);

        // Enviar para a API do Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/logs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                user_id: userId,
                level: success ? 'info' : 'warning',
                action: actionType,
                message: `${actionType} ${success ? 'OK' : 'FALHA'}: @${target?.replace('@', '')}`,
                meta: actionData
            })
        });

        if (response.ok) {
            console.log('[SUPABASE] Ação salva com sucesso!');
        } else {
            console.error('[SUPABASE] Erro ao salvar:', response.status);
        }

        // Também atualizar contadores do dia no instagram_accounts
        await updateAccountStats(userId, actionType, success);

    } catch (error) {
        console.error('[SUPABASE] Erro ao salvar ação:', error);
    }
}

/**
 * Atualizar estatísticas da conta no Supabase
 */
async function updateAccountStats(userId, actionType, success) {
    try {
        const storage = await chrome.storage.local.get(['eio_instagram_handle']);
        const instagramHandle = storage.eio_instagram_handle;

        if (!instagramHandle) return;

        // Atualizar today_stats no instagram_accounts
        const response = await fetch(`${SUPABASE_URL}/rest/v1/instagram_accounts?instagram_handle=eq.${instagramHandle}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const accounts = await response.json();
            if (accounts.length > 0) {
                const account = accounts[0];
                const todayStats = account.today_stats || { follows: 0, likes: 0, comments: 0, unfollows: 0 };

                // Incrementar o contador correspondente
                if (success) {
                    switch (actionType) {
                        case 'follow': todayStats.follows = (todayStats.follows || 0) + 1; break;
                        case 'like': todayStats.likes = (todayStats.likes || 0) + 1; break;
                        case 'comment': todayStats.comments = (todayStats.comments || 0) + 1; break;
                        case 'unfollow': todayStats.unfollows = (todayStats.unfollows || 0) + 1; break;
                    }
                }

                todayStats.last_activity = new Date().toISOString();

                // Atualizar no banco
                await fetch(`${SUPABASE_URL}/rest/v1/instagram_accounts?id=eq.${account.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        today_stats: todayStats,
                        last_activity: new Date().toISOString()
                    })
                });

                console.log('[SUPABASE] Stats atualizados:', todayStats);
            }
        }
    } catch (error) {
        console.error('[SUPABASE] Erro ao atualizar stats:', error);
    }
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

function calculateHumanDelay(min = DELAY_CONFIG.MIN_BETWEEN_PROFILES, max = DELAY_CONFIG.MAX_BETWEEN_PROFILES) {
    // Calcular delay aleatório dentro do range especificado
    // NÃO forçar mínimo - respeitar os valores passados
    const delay = Math.floor(Math.random() * (max - min) + min);
    console.log(`[DELAY] Calculado: ${Math.round(delay / 1000)}s (range: ${Math.round(min / 1000)}s - ${Math.round(max / 1000)}s)`);
    return delay;
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
        const actionType = item.actionType || extensionState.currentActionType;

        // Verificar se temos múltiplas ações selecionadas
        const hasMultipleActions = actions.length > 1 ||
            (actions.length === 1 && !['follow', 'unfollow'].includes(actions[0]));

        // Log das ações que serão executadas
        logAction('info', `🎯 Ações: ${actions.join(' + ')}`);

        // ═══════════════════════════════════════════════════════════
        // UNFOLLOW OTIMIZADO: Executar diretamente na lista (sem navegar)
        // Apenas se for SOMENTE unfollow
        // ═══════════════════════════════════════════════════════════
        if (actions.length === 1 && actions[0] === 'unfollow') {
            logAction('info', `➖ Unfollow @${item.username.replace('@', '')}...`);

            try {
                // Executar unfollow diretamente na lista (content.js modificado)
                const result = await chrome.tabs.sendMessage(tabId, {
                    action: 'execute',
                    payload: {
                        type: 'unfollow',
                        target: item.username
                    }
                });

                if (result?.success || result?.action === 'unfollowed') {
                    updateStats('unfollow', item.username);
                    extensionState.actionsInCurrentBatch++;
                    logAction('success', `✅ Deixou de seguir @${item.username.replace('@', '')}`);
                } else {
                    logAction('warning', `⚠️ Falha unfollow @${item.username.replace('@', '')}: ${result?.action || 'erro'}`);
                }

                // Delay de segurança entre unfollows (30-90 segundos)
                const delay = calculateHumanDelay(DELAY_CONFIG.MIN_UNFOLLOW, DELAY_CONFIG.MAX_UNFOLLOW);
                logAction('info', `⏱️ Aguardando ${Math.round(delay / 1000)}s antes do próximo...`);
                await sleep(delay);

                // Salvar ação no Supabase/Dashboard
                await saveActionToSupabase('unfollow', item.username, true);

            } catch (unfollowError) {
                logAction('warning', `⚠️ Erro unfollow: ${unfollowError.message}`);
            }

            saveState();

            // Continuar processando
            if (extensionState.isRunning) {
                processQueue();
            }
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // FOLLOW SIMPLES: Executar diretamente na lista (sem navegar)
        // Apenas se for SOMENTE follow
        // ═══════════════════════════════════════════════════════════
        if (actions.length === 1 && actions[0] === 'follow') {
            logAction('info', `➕ Follow @${item.username.replace('@', '')}...`);

            try {
                // Executar follow diretamente na lista
                const result = await chrome.tabs.sendMessage(tabId, {
                    action: 'execute',
                    payload: {
                        type: 'follow',
                        target: item.username
                    }
                });

                if (result?.success || result?.action === 'followed') {
                    updateStats('follow', item.username);
                    extensionState.actionsInCurrentBatch++;
                    logAction('success', `✅ Seguiu @${item.username.replace('@', '')}`);
                } else if (result?.action === 'already_following') {
                    logAction('info', `ℹ️ Já segue @${item.username.replace('@', '')}`);
                } else {
                    logAction('warning', `⚠️ Falha follow @${item.username.replace('@', '')}: ${result?.action || 'erro'}`);
                }

                // Delay de segurança entre follows (30-90 segundos)
                const delay = calculateHumanDelay(DELAY_CONFIG.MIN_FOLLOW, DELAY_CONFIG.MAX_FOLLOW);
                logAction('info', `⏱️ Aguardando ${Math.round(delay / 1000)}s antes do próximo...`);
                await sleep(delay);

                // Salvar ação no Supabase/Dashboard
                await saveActionToSupabase('follow', item.username, true);

            } catch (followError) {
                logAction('warning', `⚠️ Erro follow: ${followError.message}`);
            }

            saveState();

            // Continuar processando
            if (extensionState.isRunning) {
                processQueue();
            }
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // MÚLTIPLAS AÇÕES: Navegar para o perfil e executar cada ação
        // (follow + like + story + comment + dm)
        // ═══════════════════════════════════════════════════════════

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

                // Delay humanizado entre ações no mesmo perfil (5-15 segundos)
                const actionDelay = calculateHumanDelay(DELAY_CONFIG.MIN_BETWEEN_ACTIONS, DELAY_CONFIG.MAX_BETWEEN_ACTIONS);
                logAction('info', `⏱️ Aguardando ${Math.round(actionDelay / 1000)}s entre ações...`);
                await sleep(actionDelay);

                // Salvar ação no Supabase/Dashboard
                await saveActionToSupabase(actionType, item.username, result?.success || false);

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

        // Delay humanizado antes do próximo perfil (30-120 segundos)
        const delay = calculateHumanDelay(DELAY_CONFIG.MIN_BETWEEN_PROFILES, DELAY_CONFIG.MAX_BETWEEN_PROFILES);
        logAction('info', `⏱️ Aguardando ${Math.round(delay / 1000)}s antes do próximo perfil...`);

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
