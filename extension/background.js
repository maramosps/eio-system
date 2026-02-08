/*
═══════════════════════════════════════════════════════════
  E.I.O - BACKGROUND SCRIPT (Service Worker)
  Motor de automação ultra-estável - VERSÃO 4.4.22 (SYNC ANALYTICS)
  COM DELAYS INTELIGENTES + HARDCODED SAFETY
  + ACTION LOG MIDDLEWARE + HEARTBEAT + AUTO-FILTERS
═══════════════════════════════════════════════════════════
*/

console.log('E.I.O Extension v4.4.22 starting...');

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
    activeTabId: null,
    nextRunTimestamp: null // v4.1 - Delay à prova de hibernação
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

// v4.2 - Cloud Sync Config
// NOTA: A extensão NÃO deve acessar Supabase diretamente.
// Todas as operações passam pela API backend que já está autenticada.
const BACKEND_URL = 'https://eio-system.vercel.app'; // Production URL
// Chaves Supabase REMOVIDAS - use a API backend como proxy

// ═══════════════════════════════════════════════════════════
// v4.4.22 - HELPER FUNCTIONS FOR AUTH
// ═══════════════════════════════════════════════════════════
async function getUserId() {
    try {
        const result = await chrome.storage.local.get(['eio_user_id', 'userId', 'user']);
        return result.eio_user_id || result.userId || result.user?.id || null;
    } catch (e) {
        console.warn('[E.I.O] getUserId error:', e);
        return null;
    }
}

async function getAuthToken() {
    try {
        const result = await chrome.storage.local.get(['eio_auth_token', 'authToken', 'token']);
        return result.eio_auth_token || result.authToken || result.token || null;
    } catch (e) {
        console.warn('[E.I.O] getAuthToken error:', e);
        return null;
    }
}




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
        // v4.1 - Verificação inteligente de tempo
        const now = Date.now();
        console.log('[E.I.O KeepAlive] Check - Running:', extensionState.isRunning, 'Processing:', isProcessing);

        if (extensionState.isRunning && !isProcessing) {
            // Se tiver um tempo agendado e já passou
            if (extensionState.nextRunTimestamp && now >= extensionState.nextRunTimestamp) {
                console.log('[E.I.O KeepAlive] ⏰ Tempo de espera concluído! Executando agora...');
                extensionState.nextRunTimestamp = null; // Limpar para não executar 2x
                processQueue();
            } else if (extensionState.queue.length > 0 && !extensionState.nextRunTimestamp) {
                // Se tem fila mas não tem agendamento (travou?), forçar run
                console.log('[E.I.O KeepAlive] ⚠️ Fila parada sem agendamento. Retomando...');
                processQueue();
            }
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
        // ═══════════════════════════════════════════════════════════
        // HEARTBEAT - Dashboard Extension Detection (v4.4.16)
        // ═══════════════════════════════════════════════════════════
        case 'eio_ping':
        case 'EIO_HEARTBEAT_PING':
            console.log('[E.I.O Heartbeat] Ping recebido do Dashboard');
            sendResponse({
                pong: true,
                version: '4.4.22',
                status: extensionState.isRunning ? 'running' : 'idle',
                stats: extensionState.stats,
                timestamp: Date.now()
            });
            break;

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

        case 'queueAction': // New: Handle single actions (Quick Actions) via Engine
            const { actionType: qType, target: qTarget, options: qOptions } = message;
            // Add to front of queue for immediate priority
            extensionState.queue.unshift({
                username: qTarget,
                actions: [qType],
                options: qOptions || {}
            });
            totalQueueSize++;
            saveState();

            // If not running, assume we should start (or at least process this item if user expects immediate action)
            // Ideally, 'queueAction' implies auto-start if idle
            if (!extensionState.isRunning) {
                handleStartAutomation(() => { }); // Fire and forget
            }
            sendResponse({ success: true, message: 'Action queued via Engine' });
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
                isProcessing: isProcessing,
                version: '4.4.22'
            });
            break;

        case 'console_log':
            // Recebe logs do content script
            console.log(`[ContentScript ${message.level}] ${message.message}`);
            break;

        // ═══════════════════════════════════════════════════════════
        // v4.4.22 - SYNC_AUTH: Recebe Token do Dashboard via Bridge
        // ═══════════════════════════════════════════════════════════
        case 'SYNC_AUTH':
            console.log('[E.I.O Auth] 🔐 Recebendo auth sync do Dashboard...');
            console.log('[E.I.O Auth] User ID:', message.userId);
            console.log('[E.I.O Auth] Token presente:', !!message.token);

            // Salvar no chrome.storage.local
            chrome.storage.local.set({
                eio_user_id: message.userId,
                eio_auth_token: message.token,
                eio_user_email: message.email || null,
                eio_auth_synced_at: Date.now()
            }, () => {
                console.log('[E.I.O Auth] ✅ Auth salvo no storage com sucesso!');
                sendResponse({ success: true, message: 'Auth synchronized' });
            });
            return true; // Async response

        // ═══════════════════════════════════════════════════════════
        // v4.4.22 - SAVE_AUTH: Novo formato de mensagem da Bridge
        // ═══════════════════════════════════════════════════════════
        case 'SAVE_AUTH':
            console.log('%c[E.I.O Auth] 🔐 SAVE_AUTH recebido da Bridge!', 'color: #39FF14; font-weight: bold;');
            const payload = message.payload || {};
            console.log('[E.I.O Auth] User ID:', payload.userId);
            console.log('[E.I.O Auth] Token presente:', !!payload.token);

            // Salvar no chrome.storage.local
            chrome.storage.local.set({
                eio_user_id: payload.userId,
                eio_auth_token: payload.token,
                eio_user_email: payload.email || null,
                eio_auth_synced_at: Date.now()
            }, () => {
                console.log('%c[E.I.O Auth] ✅ Token salvo com sucesso!', 'color: #39FF14; font-weight: bold;');
                sendResponse({ success: true, message: 'Token saved successfully' });
            });
            return true; // Async response

        // ═══════════════════════════════════════════════════════════
        // v4.4.22 - BRIDGE_CONNECTED: Dashboard conectou via Bridge
        // ═══════════════════════════════════════════════════════════
        case 'bridge_connected':
            console.log('%c[E.I.O Bridge] 🌉 Dashboard conectado via Bridge!', 'color: #6246ea; font-weight: bold;');
            console.log('[E.I.O Bridge] Origin:', message.origin);
            console.log('[E.I.O Bridge] Extension ID:', message.extensionId);
            sendResponse({ success: true, version: '4.4.22' });
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

            // 1. CHECAR PERMISSÃO NO ENGINE (V3)
            const permission = await checkEnginePermission(actionType, item.username);

            if (!permission.allowed) {
                logAction('warning', `⛔ Bloqueado pelo Engine: ${permission.reason || 'Risco detectado'}`);
                notifyPopup('actionCompleted', { username: item.username, action: 'blocked' });

                // Se foi bloqueado, devemos esperar o delay sugerido pelo engine antes de tentar outra coisa?
                // Ou pular este item. Por segurança, pulamos este item.
                continue;
            }

            const engineDelay = permission.delayMs || 5000;
            const actionId = permission.actionId;

            // Aplicar delay pré-ação (humanização do engine)
            if (engineDelay > 0) {
                logAction('info', `⏳ Aguardando ${Math.round(engineDelay / 1000)}s (Engine)...`);
                await sleep(engineDelay);
            }

            // 2. EXECUTAR
            let execResult = null;
            let execSuccess = false;
            let errorMsg = null;

            try {
                execResult = await sendMessageWithRetry(tabId, {
                    action: 'execute',
                    payload: { type: actionType, target: item.username, options }
                });

                if (execResult?.success || execResult?.meta?.success || execResult?.action?.includes('followed') || execResult?.action?.includes('liked')) {
                    execSuccess = true;
                } else {
                    errorMsg = execResult?.error || execResult?.action || 'Falha desconhecida';
                }
            } catch (e) {
                errorMsg = e.message;
            }

            // 3. ACKNOWLEDGEMENT (ACK) - OBRIGATÓRIO
            // Enviar confirmação para o Engine atualizar o estado
            await sendAck(actionId, actionType, execSuccess, { ...execResult, target: item.username }, errorMsg);

            if (execSuccess) {
                updateStats(actionType);
                logAction('success', `✅ ${actionType} OK (@${item.username})`);
                let status = 'followed';
                if (execResult?.action?.includes('requested')) status = 'requested';
                else if (actionType === 'unfollow') status = 'unfollowed';
                else if (actionType === 'like') status = 'liked';

                notifyPopup('actionCompleted', { username: item.username, action: status });

                // ═══════════════════════════════════════════════════════════
                // v4.4.16 ACTION LOG MIDDLEWARE - POST to /api/v1/actions
                // Envia log para API somente após ação BEM-SUCEDIDA
                // ═══════════════════════════════════════════════════════════
                await sendActionLog(actionType, item.username, execSuccess);
            } else {
                logAction('warning', `⚠️ ${actionType} falhou: ${errorMsg}`);
                notifyPopup('actionCompleted', { username: item.username, action: 'error' });
            }

            // DELAY ENTRE AÇÕES NO MESMO PERFIL: 1min20s (80 segundos)
            if (extensionState.isRunning && actions.indexOf(actionType) < actions.length - 1) {
                const delay = DELAY_CONFIG.BETWEEN_ACTIONS_SAME_PROFILE;
                const delaySeconds = Math.round(delay / 1000);
                logAction('info', `⏳ Aguardando ${delaySeconds}s para próxima ação...`);
                console.log(`[E.I.O Motor] Delay entre ações: ${delay}ms (${delaySeconds}s)`);
                await sleep(delay);
            }
        }

        await saveState();

        // DELAY ENTRE PERFIS DIFERENTES: 1min30s (90 segundos)
        if (extensionState.isRunning && extensionState.queue.length > 0) {
            const delay = DELAY_CONFIG.BETWEEN_PROFILES;
            const delaySeconds = Math.round(delay / 1000);
            logAction('info', `⏱️ Próximo perfil em ${delaySeconds}s... (${extensionState.queue.length} restantes)`);
            console.log(`[E.I.O Motor] Agendando próximo perfil em ${delay}ms (${delaySeconds}s)`);

            isProcessing = false;

            const triggerTime = Date.now() + delay;
            extensionState.nextRunTimestamp = triggerTime;

            console.log(`[E.I.O Motor] Agendado para: ${new Date(triggerTime).toLocaleTimeString()} (em ${delaySeconds}s)`);
            saveState();

            processingTimeout = setTimeout(() => {
                extensionState.nextRunTimestamp = null;
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

// Função para obter token do storage
async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['eioLicenseData', 'eioUserData', 'extensionLicense'], (result) => {
            // Tenta obter token de várias fontes possíveis
            const token = result.eioLicenseData?.token ||
                result.eioUserData?.token ||
                result.extensionLicense?.token || null;
            resolve(token);
        });
    });
}

// Enviar log para o backend
async function sendLogToBackend(action, target, result = 'success', metadata = {}) {
    try {
        const token = await getAuthToken();
        const API_URL = 'https://eio-system.vercel.app/api/v1'; // Hardcoded para produção por segurança

        if (!token) {
            // Se não tiver token, loga apenas no console local
            // console.log('[E.I.O Backend] ⚠️ Log não enviado (sem token):', action);
            return;
        }

        fetch(`${API_URL}/analytics/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: action,
                target: target.replace('@', ''), // Remove @ se existir
                result: result,
                timestamp: new Date().toISOString(),
                metadata: {
                    source: 'extension_background',
                    ...metadata
                }
            })
        }).then(response => {
            if (response.ok) {
                console.log(`[E.I.O Backend] ✅ Log enviado: ${action}`);
            } else {
                console.log(`[E.I.O Backend] ❌ Falha ao enviar log: ${response.status}`);
            }
        }).catch(err => {
            console.error('[E.I.O Backend] Erro de rede:', err);
        });

    } catch (e) {
        console.error('[E.I.O Backend] Erro geral:', e);
    }
}

function logAction(level, message) {
    console.log(`[E.I.O LOG] ${message}`);
    notifyPopup('consoleMessage', { level, message, timestamp: new Date().toISOString() });

    // Tenta extrair informações estruturadas da mensagem para enviar ao backend
    // Ex: "Seguindo @usuario..."
    const lowerMsg = message.toLowerCase();
    let action = null;
    let target = null;
    let result = 'success'; // Default

    // Detector simples de ações baseadas no log
    // Isso é um fallback se não chamarmos sendLogToBackend explicitamente nos locais de ação
    if (lowerMsg.includes('seguindo @')) {
        action = 'follow';
        target = message.split('@')[1]?.split(' ')[0]?.trim();
    } else if (lowerMsg.includes('curtindo') || lowerMsg.includes('curtido')) {
        action = 'like';
        // Tenta achar usuario no log se houver, ou usa metadados se disponíveis
    } else if (lowerMsg.includes('deixando de seguir @')) {
        action = 'unfollow';
        target = message.split('@')[1]?.split(' ')[0]?.trim();
    }

    if (action && target) {
        sendLogToBackend(action, target, 'success', { original_message: message });
    }
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

// v4.2 - Cloud Sync Function
// v4.3 - ENGINE API CONNECTOR
async function getUserId() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['eio_user'], (res) => {
            try {
                if (res.eio_user) {
                    const u = JSON.parse(res.eio_user);
                    resolve(u.id);
                } else {
                    resolve(null);
                }
            } catch (e) { resolve(null); }
        });
    });
}

// Pergunta ao Engine se pode executar (Decision Endpoint)
async function checkEnginePermission(actionType, targetUsername) {
    try {
        const userId = await getUserId();
        if (!userId) return { allowed: true, delayMs: 2000, riskLevel: 'unknown', reason: 'No User ID' }; // Fallback loose for testing if no logic

        const response = await fetch(`${BACKEND_URL}/api/engine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                actionType: actionType,
                metadata: { target: targetUsername }
            })
        });

        if (!response.ok) {
            console.error('[Engine API] Falha na verificação:', response.status);
            // Fallback safety: if engine down, use local safeguards or block? 
            // Blocking is safer.
            return { allowed: true, delayMs: 10000, reason: 'Engine Unreachable (Safe Fallback)' };
        }

        const decision = await response.json();
        return decision;

    } catch (e) {
        console.error('[Engine API] Exception:', e);
        return { allowed: true, delayMs: 5000, reason: 'Engine Error' };
    }
}

// Envia ACK para o Engine (Confirmação)
async function sendAck(actionId, actionType, success, metadata, errorMessage) {
    try {
        const userId = await getUserId();
        if (!userId) return;

        // Se actionId for nulo (execução imediata sem ID do engine), geramos um placeholder ou o engine aceita sem?
        // O endpoint de ACK provavelmente precisa de algum identificador se foi scheduled.
        // Se foi 'instant-exec', o ACK serve para logar.

        await fetch(`${BACKEND_URL}/api/engine/ack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                actionType,
                success,
                metadata: { ...metadata, actionId },
                errorMessage
            })
        });

    } catch (e) {
        console.error('[Engine API] ACK Error:', e);
    }
}

// Legacy Cloud Sync (mantido apenas como backup secundário, se necessário)
async function syncToCloud(action, target, status) {
    // Deprecated in favor of sendAck
}

// ═══════════════════════════════════════════════════════════
// v4.4.16 ACTION LOG MIDDLEWARE
// Envia log de ações BEM-SUCEDIDAS para /api/v1/actions
// Aguarda Status 201 para validar sincronização
// ═══════════════════════════════════════════════════════════
async function sendActionLog(actionType, targetUsername, success) {
    try {
        const userId = await getUserId();
        const token = await getAuthToken();

        if (!userId && !token) {
            console.log('[E.I.O ActionLog] ⚠️ Sem autenticação, log não enviado');
            return false;
        }

        const payload = {
            user_id: userId,
            action_type: actionType,
            target_username: targetUsername.replace('@', ''),
            timestamp: new Date().toISOString(),
            success: success,
            source: 'extension_v4.4.22'
        };

        console.log('[E.I.O ActionLog] 📤 Enviando log para API...', payload);

        const response = await fetch(`${BACKEND_URL}/api/v1/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
        });

        if (response.status === 201) {
            console.log('[E.I.O ActionLog] ✅ Log sincronizado com sucesso (201)');
            return true;
        } else {
            console.warn('[E.I.O ActionLog] ⚠️ Resposta inesperada:', response.status);
            // Log detalhado em produção para debug de falhas de rede
            if (process?.env?.NODE_ENV === 'production' || true) {
                console.error('[E.I.O ActionLog] Fetch Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: `${BACKEND_URL}/api/v1/actions`
                });
            }
            return false;
        }
    } catch (err) {
        // Log detalhado de erro de rede para produção
        console.error('[E.I.O ActionLog] ❌ Fetch Error:', err.message);
        console.error('[E.I.O ActionLog] Stack:', err.stack);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// v4.4.16 EXTERNAL MESSAGE LISTENER (Dashboard Heartbeat)
// Permite que páginas externas (dashboard) detectem a extensão
// ═══════════════════════════════════════════════════════════
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    console.log('[E.I.O External] Mensagem externa recebida:', message, 'de:', sender.origin);

    // Verificar origem permitida
    const allowedOrigins = [
        'https://eio-system.vercel.app',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];

    if (!allowedOrigins.some(origin => sender.origin?.startsWith(origin) || sender.url?.startsWith(origin))) {
        console.warn('[E.I.O External] Origem não autorizada:', sender.origin);
        sendResponse({ error: 'Unauthorized origin' });
        return true;
    }

    if (message.type === 'EIO_HEARTBEAT_PING' || message.action === 'eio_ping') {
        console.log('[E.I.O Heartbeat] 💓 Ping recebido do Dashboard');
        sendResponse({
            pong: true,
            version: '4.4.22',
            status: extensionState.isRunning ? 'running' : 'idle',
            stats: extensionState.stats,
            queueLength: extensionState.queue.length,
            timestamp: Date.now()
        });
    } else if (message.type === 'EIO_GET_STATUS') {
        sendResponse({
            isRunning: extensionState.isRunning,
            queueLength: extensionState.queue.length,
            stats: extensionState.stats,
            isProcessing: isProcessing,
            version: '4.4.22'
        });
    }

    return true;
});

console.log('E.I.O Extension v4.4.22 Ready - Sync Analytics + Hardcoded Safety Active');
