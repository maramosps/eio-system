/*
═══════════════════════════════════════════════════════════
  E.I.O - BACKGROUND SCRIPT (Service Worker)
  Motor de automação — VERSÃO 4.7.13
  MVP STREAMLINED: Follow → Like → View Story
  Comment e DM removidos para estabilidade
═══════════════════════════════════════════════════════════
*/

console.log('[E.I.O Engine] ✅ Motor v4.7.13 Ativo');

const BACKEND_URL = 'https://eio-system.vercel.app';

let extensionState = {
    isRunning: false,
    isPausedForSafety: false,
    currentActionType: 'follow',
    currentOptions: {},
    stats: {
        followsToday: 0, likesToday: 0,
        storiesLikedToday: 0, unfollowsToday: 0,
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
    nextRunTimestamp: null,
    // v4.6.5 Persistence
    currentComboIndex: 0,
    currentComboUsername: null
};

let isFilaRodando = false;

// ═══════════════════════════════════════════════════════════
// DELAYS FIXOS E SEGUROS - NÃO CONFIGURÁVEIS
// ═══════════════════════════════════════════════════════════
const DELAY_CONFIG = {
    BETWEEN_ACTIONS_SAME_PROFILE: 15000, // 15s (mínimo seguro)
    BETWEEN_PROFILES: 30000,             // 30s
    COMBO_MIN: 15000,                    // 15s — mínimo entre cliques do combo
    COMBO_MAX: 120000                    // 120s — máximo entre cliques do combo
};

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ═══════════════════════════════════════════════════════════
// v4.7.0 - DELAY EM SEGUNDOS (REQUISITO DO CLIENTE)
// ═══════════════════════════════════════════════════════════
/**
 * Random delay in SECONDS (not milliseconds)
 * @param {number} min - Minimum seconds (default: 90)
 * @param {number} max - Maximum seconds (default: 160)
 * @returns {Promise} - Resolves after random seconds
 */
async function randomDelaySeconds(min = 15, max = 120) {
    const seconds = Math.floor(Math.random() * (max - min + 1)) + min;
    const ms = seconds * 1000;
    console.log(`[Motor] Aguardando ${seconds}s...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════
// UNIFIED AUTH HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function getUserId() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['eio_user_id', 'userId', 'user', 'eio_user'], (result) => {
            if (result.eio_user_id) return resolve(result.eio_user_id);
            if (result.userId) return resolve(result.userId);
            if (result.user?.id) return resolve(result.user.id);
            if (result.eio_user) {
                try {
                    const u = typeof result.eio_user === 'string' ? JSON.parse(result.eio_user) : result.eio_user;
                    if (u.id) return resolve(u.id);
                } catch (e) { }
            }
            resolve(null);
        });
    });
}

async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['eio_token', 'eio_auth_token', 'authToken', 'token', 'eioLicenseData'], (result) => {
            if (result.eio_token) return resolve(result.eio_token);
            if (result.eio_auth_token) return resolve(result.eio_auth_token);
            if (result.authToken) return resolve(result.authToken);
            if (result.token) return resolve(result.token);
            if (result.eioLicenseData?.token) return resolve(result.eioLicenseData.token);
            resolve(null);
        });
    });
}

async function getInstagramHandle() {
    const result = await chrome.storage.local.get(['instagram_handle', 'instagramUsername', 'ig_username']);
    return result.instagram_handle || result.instagramUsername || result.ig_username || null;
}

// ═══════════════════════════════════════════════════════════
// ACTION LOGGING & ENGINE PERMISSIONS
// ═══════════════════════════════════════════════════════════

async function sendActionLog(actionType, targetProfile, success) {
    try {
        const userId = await getUserId();
        const token = await getAuthToken();
        const instagramHandle = await getInstagramHandle();

        if (!userId || !token) {
            console.error('[E.I.O API] ❌ sendActionLog abortado — userId:', userId, 'token:', !!token);
            return;
        }

        // Usar /api/v1/actions (rota que EXISTE no backend e faz dupla escrita: action_logs + logs)
        const payload = {
            user_id: userId,
            action_type: actionType,
            target_username: targetProfile,
            success: success,
            timestamp: new Date().toISOString(),
            source: 'extension',
            metadata: { instagram_handle: instagramHandle }
        };

        const response = await fetch(`${BACKEND_URL}/api/v1/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => '(sem corpo)');
            console.error('ERRO API DASHBOARD [/api/v1/actions]:', response.status, errBody);
        } else {
            console.log('[E.I.O API] 📤 Log enviado com sucesso via /api/v1/actions');
            
            // v4.7.13 - AUTO POPULATE LEAD IN CRM (Immediate population)
            if (success && (actionType === 'follow' || actionType === 'like_feed_2' || actionType === 'like')) {
                try {
                    const crmStatus = actionType === 'follow' ? 'novos' : 'contactados';
                    await fetch(`${BACKEND_URL}/api/v1/crm/update-status`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            instagram_username: targetProfile.replace('@', ''),
                            status: crmStatus,
                            last_action: actionType,
                            force_create: true
                        })
                    });
                    console.log(`[E.I.O CRM] 👤 Lead atualizado/criado no dashboard (${crmStatus})`);
                } catch (crmErr) {
                    console.error('[E.I.O CRM] Falha ao preencher CRM:', crmErr.message);
                }
            }
        }
    } catch (error) {
        console.error('ERRO API DASHBOARD [/api/v1/actions] CATCH:', error.message);
    }
}

async function checkEnginePermission(actionType, targetUsername) {
    try {
        const userId = await getUserId();
        if (!userId) return { allowed: true, delayMs: 2000, riskLevel: 'unknown', reason: 'No User ID' };

        const response = await fetch(`${BACKEND_URL}/api/engine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                actionType: actionType,
                metadata: { target: targetUsername }
            })
        });

        if (!response.ok) return { allowed: true, delayMs: 10000, reason: 'Engine Unreachable' };
        let permissaoServidor = await response.json();
        // Substitui o tempo do servidor por um tempo humano aleatório entre 60 e 80 segundos
        permissaoServidor.delayMs = Math.floor(Math.random() * (80000 - 60000 + 1)) + 60000;
        return permissaoServidor;
    } catch (e) {
        return { allowed: true, delayMs: 5000, reason: 'Engine Error' };
    }
}

// v4.5.0 - ACKNOWLEDGEMENT
async function sendAck(actionId, actionType, success, resultData, errorMsg) {
    return true;
}

// ═══════════════════════════════════════════════════════════
// STATE MANAGEMENT & ALARMS
// ═══════════════════════════════════════════════════════════

async function saveState() {
    await chrome.storage.local.set({ extensionState: { ...extensionState, isRunning: extensionState.isRunning } });
}

async function loadState() {
    const result = await chrome.storage.local.get(['extensionState']);
    if (result.extensionState) {
        extensionState = { ...extensionState, ...result.extensionState };
    }
}

chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        const now = Date.now();
        if (extensionState.isRunning && !isProcessing) {
            if (extensionState.nextRunTimestamp && now >= extensionState.nextRunTimestamp) {
                console.log('[E.I.O KeepAlive] ⏰ Executando agendamento...');
                extensionState.nextRunTimestamp = null;
                processQueue();
            } else if (extensionState.queue.length > 0 && !extensionState.nextRunTimestamp) {
                console.log('[E.I.O KeepAlive] ⚠️ Retomando fila parada...');
                processQueue();
            }
        }
    }
});

// v4.7.13 - Follow-back audit & DM trigger REMOVED for MVP stability

// ═══════════════════════════════════════════════════════════
// MESSAGE HANDLER (CENTRAL)
// ═══════════════════════════════════════════════════════════

if (self.eioMessageHandler) {
    chrome.runtime.onMessage.removeListener(self.eioMessageHandler);
}

self.eioMessageHandler = (message, sender, sendResponse) => {
    const action = message.action || message.type;
    console.log('[E.I.O Msg]', action);

    switch (action) {
        case 'eio_ping':
        case 'EIO_HEARTBEAT_PING':
            sendResponse({
                pong: true, version: '4.7.13',
                status: extensionState.isRunning ? 'running' : 'idle',
                stats: extensionState.stats
            });
            break;

        case 'proxyImage':
            // Proxy de imagem do CDN do Instagram para contornar CSP restrito do Manifest V3
            fetch(message.url, { referrerPolicy: 'no-referrer' })
                .then(response => response.blob())
                .then(async blob => {
                    // Service Worker (MV3) NÃO suporta FileReader. Transforma em Base64 nativamente.
                    const buffer = await blob.arrayBuffer();
                    const bytes = new Uint8Array(buffer);
                    let binary = '';
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);
                    const mimeType = blob.type || 'image/jpeg';
                    sendResponse({ dataUrl: `data:${mimeType};base64,${base64}` });
                })
                .catch(err => {
                    console.error('[E.I.O] Falha no proxyImage:', message.url, err);
                    sendResponse({ error: err.message });
                });
            return true; // Keep message channel open for async response

        case 'setQueue':
            extensionState.queue = message.queue || [];
            extensionState.currentActionType = message.actionType;
            extensionState.currentOptions = message.options || {};
            totalQueueSize = extensionState.queue.length;
            processedCount = 0;
            saveState();
            sendResponse({ success: true, count: extensionState.queue.length });
            break;

        case 'startAutomation':
            handleStartAutomation(sendResponse);
            return true;

        case 'pauseAutomation':
        case 'stopAutomation':
            extensionState.isRunning = false;
            isFilaRodando = false;
            self.isAutomationRunning = false;
            extensionState.nextRunTimestamp = null;
            if (processingTimeout) clearTimeout(processingTimeout);
            saveState();
            notifyPopup(action === 'pauseAutomation' ? 'automationPaused' : 'automationStopped', {});
            sendResponse({ success: true });
            break;

        // AUTH SYNC (BRIDGE & DASHBOARD)
        case 'SYNC_AUTH':
        case 'SAVE_AUTH':
            const payload = message.payload || message;
            chrome.storage.local.set({
                eio_user_id: payload.userId,
                eio_auth_token: payload.token,
                eio_user_email: payload.email || null,
                eio_auth_synced_at: Date.now()
            }, () => {
                console.log('[E.I.O Auth] 🔐 Auth sincronizado!');
                sendResponse({ success: true });
            });
            return true;

        case 'bridge_connected':
            console.log('[E.I.O Bridge] 🌉 Conectado!');
            sendResponse({ success: true, version: '4.7.13' });
            break;

        // v4.5.0 - STATS SYNC HANDLER
        case 'update_profile_stats':
            (async () => {
                const token = await getAuthToken();
                if (!token) return;

                try {
                    console.log('[E.I.O Stats] 🔄 Sincronizando:', message.data?.instagram_handle);
                    const res = await fetch(`${BACKEND_URL}/api/v1/instagram/accounts/stats`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(message.data)
                    });
                    const d = await res.json();
                    if (d.success) console.log('[E.I.O Stats] ✅ Atualizado!');
                } catch (e) {
                    console.error('[E.I.O Stats] Erro:', e);
                }
            })();
            sendResponse({ success: true });
            break;
    }
    return true;
};
chrome.runtime.onMessage.addListener(self.eioMessageHandler);

// ═══════════════════════════════════════════════════════════
// AUTOMATION ENGINE
// ═══════════════════════════════════════════════════════════

let isProcessing = false;
let processingTimeout = null;
let totalQueueSize = 0;
let processedCount = 0;

async function handleStartAutomation(sendResponse) {
    if (self.isAutomationRunning) return;
    self.isAutomationRunning = true;

    if (extensionState.isRunning || isFilaRodando) {
        console.log('[Motor] ⚠️ Tentativa de iniciar recusada: Já está rodando.');
        self.isAutomationRunning = false;
        if (sendResponse) sendResponse({ success: false, message: 'Já está rodando' });
        return;
    }

    const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
    const instagramTab = tabs.find(t => t.active) || tabs[0];

    if (!instagramTab) {
        self.isAutomationRunning = false;
        if (sendResponse) sendResponse({ success: false, message: 'Abra o Instagram primeiro!' });
        return;
    }

    extensionState.activeTabId = instagramTab.id;
    extensionState.isRunning = true;
    isFilaRodando = true;
    isProcessing = false;
    saveState();

    processQueue();
    notifyPopup('automationStarted', {});
    sendResponse({ success: true });
}

// ═══════════════════════════════════════════════════════════
// v4.7.0 - FUNÇÕES DE AÇÃO INDIVIDUAIS (STRICT SEQUENTIAL)
// ═══════════════════════════════════════════════════════════

/**
 * Execute a single action and return result
 * @param {number} tabId - Tab ID
 * @param {string} actionType - Action type (follow, like_feed_2, story_interact)
 * @param {string} username - Target username
 * @param {object} options - Action options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function executeSingleAction(tabId, actionType, username, options = {}) {
    try {
        const result = await sendMessageWithRetry(tabId, {
            action: 'execute',
            payload: {
                type: actionType,
                target: username,
                options: options
            }
        });

        // Se a meta-resposta do Content Script indicou falha explícita, captura a falha
        const isSuccess = result?.meta !== undefined ? result.meta.success : (result?.success || false);

        if (isSuccess) {
            const exactTimestamp = new Date().toISOString();
            const actionNames = {
                'follow': '👥 Seguiu', 'like_feed_2': '❤️ Curtiu post de',
                'story_interact': '👁️ Viu Story de'
            };
            const label = actionNames[actionType] || `✅ Executou ${actionType} em`;
            // Single message only — prevents duplicate log echo
            logAction('success', `${label} @${username}`);
        }

        return {
            success: isSuccess,
            error: result?.meta?.error || result?.error || 'Erro desconhecido'
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * v4.7.2 - HUMANIZED RAPID COMBO STRIKE (CORREÇÃO DE ORDEM E ABORTOS)
 * O Motor agora respeita exatamente as flags do painel e aborta se o Follow falhar.
 */
async function executeInteractionCombo(tabId, username, options = {}) {
    console.log(`[Motor] ═══════ INICIANDO COMBO RÁPIDO PARA @${username} ═══════`);
    const results = {
        follow: { success: false },
        like1: { success: false },
        story: { success: false }
    };

    const actionsToRun = options.selectedActions || [];
    // Garante compatibilidade se for vazio, assume tudo
    const isComboAll = actionsToRun.length === 0;

    // Delay entre ações do combo: 90-160s (seguro para Instagram)
    const comboDelay = async () => {
        const ms = getRandomDelay(DELAY_CONFIG.COMBO_MIN, DELAY_CONFIG.COMBO_MAX);
        const secs = Math.round(ms / 1000);
        logAction('info', `⏳ Aguardando ${secs}s antes da próxima ação...`);
        await sleep(ms);
    };

    // ═══════════════════════════════════════════════════════════
    // PASSO 1: SEGUIR (FOLLOW)
    // ═══════════════════════════════════════════════════════════
    if (isComboAll || actionsToRun.includes('follow')) {
        console.log(`[Motor] Passo 1 (Seguir)...`);
        const followPerm = await checkEnginePermission('follow', username);
        if (followPerm.allowed) {
            results.follow = await executeSingleAction(tabId, 'follow', username, options);
            if (results.follow.success) {
                updateStats('follow');
                await sendActionLog('follow', username, true);
                notifyPopup('actionCompleted', { username, action: 'follow' });
            } else {
                console.log(`[Motor] ⛔ Follow falhou. Abortando restante do combo para proteger perfil.`);
                return { success: false, results, error: 'Follow_Failed' };
            }
        }
        await comboDelay();
    }

    // ═══════════════════════════════════════════════════════════
    // PASSO 2: CURTIR 01 POSTAGEM (LIKE 1)
    // ═══════════════════════════════════════════════════════════
    if (isComboAll || actionsToRun.includes('like')) {
        console.log(`[Motor] Passo 2 (Curtir única postagem)...`);
        const likePerm = await checkEnginePermission('like_feed_2', username);
        if (likePerm.allowed) {
            results.like1 = await executeSingleAction(tabId, 'like_feed_2', username, { ...options, postIndex: 1 });
            if (results.like1.success) {
                updateStats('like_feed_2');
                await sendActionLog('like_feed_2', username, true);
                notifyPopup('actionCompleted', { username, action: 'like_feed_2' });
            }
        }
        await comboDelay();
    }

    // v4.7.13 — Comment step REMOVED for MVP stability

    // ═══════════════════════════════════════════════════════════
    // PASSO 3: VER STORY (STORY)
    // ═══════════════════════════════════════════════════════════
    if (isComboAll || actionsToRun.includes('story') || actionsToRun.includes('viewStory')) {
        console.log(`[Motor] Passo 4 (Visualizar Story)...`);
        const storyPerm = await checkEnginePermission('story_interact', username);
        if (storyPerm.allowed) {
            results.story = await executeSingleAction(tabId, 'story_interact', username, options);
            if (results.story.success) {
                updateStats('story_interact');
                await sendActionLog('story_interact', username, true);
                notifyPopup('actionCompleted', { username, action: 'story_interact' });
            }
        }
    }

    // Combo concluído silenciosamente

    return {
        success: results.follow.success || results.like1.success, // Se curtiu ou seguiu, consideramos a roda motriz vitoriosa
        results
    };
}

async function processQueue() {
    if (isProcessing || !extensionState.isRunning) return;

    if (extensionState.queue.length === 0) {
        extensionState.isRunning = false;
        isFilaRodando = false;
        notifyPopup('automationStopped', { message: 'Fila concluída!' });
        logAction('success', '✅ Fila concluída!');
        saveState();
        return;
    }

    isProcessing = true;

    // PREVIEW do número atual (sem incrementar ainda)
    const currentNumber = processedCount + 1;
    notifyPopup('progressUpdate', { current: currentNumber, total: totalQueueSize });

    try {
        let tabId = await ensureValidTab();
        if (!tabId) throw new Error('Aba do Instagram não encontrada');

        const item = extensionState.queue[0]; // Peek (não remove ainda)

        logAction('info', `🎯 [${currentNumber}/${totalQueueSize}] Processando @${item.username}...`);

        const useCombo = extensionState.currentActionType === 'combo_v4_6' ||
            extensionState.currentActionType?.includes('+') ||
            (item.actions && item.actions.length > 1);

        let actionSuccess = false;

        if (useCombo) {
            const comboOptions = item.options || extensionState.currentOptions || {};
            comboOptions.selectedActions = item.actions;

            const comboResult = await executeInteractionCombo(
                tabId,
                item.username,
                comboOptions
            );
            actionSuccess = comboResult.success;

            if (!actionSuccess) {
                logAction('warning', `⚠️ Combo falhou para @${item.username}: ${comboResult.error}`);
            }
        } else {
            const actionType = item.actions?.[0] || extensionState.currentActionType;

            logAction('info', `🚀 Executando ${actionType} em @${item.username}...`);

            const perm = await checkEnginePermission(actionType, item.username);
            if (!perm.allowed) {
                logAction('warning', `⛔ Bloqueado pelo Engine: ${perm.reason}`);
            } else {
                if (perm.delayMs > 0) await sleep(perm.delayMs);

                const execResult = await executeSingleAction(tabId, actionType, item.username, item.options || extensionState.currentOptions);

                if (execResult.success) {
                    updateStats(actionType);
                    await sendActionLog(actionType, item.username, true);
                    notifyPopup('actionCompleted', { username: item.username, action: 'success' });
                    actionSuccess = true;
                } else {
                    logAction('warning', `⚠️ Falha em ${actionType}: ${execResult.error}`);
                }
            }
        }
// --- INÍCIO DA INTELIGÊNCIA: GRAVAR NA MEMÓRIA ---
        if (actionSuccess) {
            const bancoDeDados = await chrome.storage.local.get(['historicoInteracoesEIO']);
            let historico = bancoDeDados.historicoInteracoesEIO || [];
            
            // Se o nome ainda não está no caderninho, ele anota e salva
            if (!historico.includes(item.username)) {
                historico.push(item.username);
                await chrome.storage.local.set({ historicoInteracoesEIO: historico });
                logAction('info', `🧠 @${item.username} foi salvo na memória para não ser repetido amanhã!`);
            }
        }
        // --- FIM DA INTELIGÊNCIA ---

        // ═══════════════════════════════════════════════════════════
        // ITEM PROCESSADO — Remover da fila e incrementar AQUI (ÚNICO LUGAR)
        // ═══════════════════════════════════════════════════════════
        extensionState.queue.shift();
        processedCount++; // ← ÚNICO processedCount++ DE TODO O ARQUIVO
        extensionState.currentComboIndex = 0;
        extensionState.currentComboUsername = null;
        await saveState();

        // v4.7.13 — Follow-back audit alarm REMOVED for MVP stability

        // Próximo perfil
        if (extensionState.isRunning && extensionState.queue.length > 0) {
            extensionState.nextRunTimestamp = Date.now() + DELAY_CONFIG.BETWEEN_PROFILES;
            logAction('info', `⏳ Próximo perfil em ${DELAY_CONFIG.BETWEEN_PROFILES / 1000}s...`);

            processingTimeout = setTimeout(() => {
                extensionState.nextRunTimestamp = null;
                isProcessing = false;
                processQueue();
            }, DELAY_CONFIG.BETWEEN_PROFILES);
        } else {
            isProcessing = false;
            if (extensionState.queue.length === 0) processQueue();
        }

    } catch (error) {
        if (error.message === 'AbortError') {
            logAction('warning', `⏸️ Automação parada pelo usuário.`);
            isProcessing = false;
            return;
        }
        console.error('[E.I.O Motor] Erro Fatal:', error);
        logAction('error', `❌ Erro: ${error.message}`);
        isProcessing = false;
        if (extensionState.isRunning) {
            processingTimeout = setTimeout(() => processQueue(), 10000);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function ensureValidTab() {
    let tabId = extensionState.activeTabId;
    try {
        if (tabId) {
            const tab = await chrome.tabs.get(tabId);
            if (tab?.url?.includes('instagram.com')) return tabId;
        }
    } catch (e) { }

    const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
    if (tabs.length > 0) {
        extensionState.activeTabId = tabs[0].id;
        return tabs[0].id;
    }
    return null;
}

async function sendMessageWithRetry(tabId, message, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
            if (i < retries - 1) {
                if (error.message.includes('context invalidated')) {
                    const newId = await ensureValidTab();
                    if (newId) tabId = newId;
                }
                await sleep(2000);
            }
        }
    }
    throw new Error('Falha comunicação com Instagram');
}

function updateStats(type) {
    extensionState.stats.totalActionsToday++;
    if (type === 'follow') extensionState.stats.followsToday++;
    if (type === 'like' || type === 'like_feed_2') extensionState.stats.likesToday++;
    // comment stats removed in v4.7.13
    if (type === 'story_interact') extensionState.stats.storiesLikedToday++;
    if (type === 'unfollow') extensionState.stats.unfollowsToday++;
    notifyPopup('statsUpdate', { stats: extensionState.stats });
}

function logAction(level, message) {
    console.log(`[E.I.O ${level.toUpperCase()}] ${message}`);
    notifyPopup('consoleMessage', { level, message, timestamp: new Date().toISOString() });
}

function notifyPopup(type, data) {
    chrome.runtime.sendMessage({ type, ...data }).catch(() => { });
}

function sleep(ms) {
    return new Promise((resolve, reject) => {
        let elapsed = 0;
        const interval = ms > 500 ? 500 : ms;
        const timer = setInterval(() => {
            if (!extensionState.isRunning) {
                clearInterval(timer);
                return reject(new Error('AbortError'));
            }
            elapsed += interval;
            if (elapsed >= ms) {
                clearInterval(timer);
                resolve();
            }
        }, interval);
    });
}

// INITIALIZATION
loadState().then(() => console.log('[E.I.O Engine] Estado recuperado'));
// Se havia automação em andamento, retomar
if (extensionState.isRunning && extensionState.queue.length > 0) {
    console.log('[E.I.O] Retomando automação anterior...');
    setTimeout(() => processQueue(), 2000);
}

// ═══════════════════════════════════════════════════════════
// v4.6.5 - EXTERNAL MESSAGE LISTENER (Dashboard Heartbeat)
// ═══════════════════════════════════════════════════════════
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    const allowedOrigins = [
        'https://eio-system.vercel.app',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];

    if (!allowedOrigins.some(origin => sender.origin?.startsWith(origin) || sender.url?.startsWith(origin))) {
        return; // Silently ignore unauthorized
    }

    if (message.type === 'EIO_HEARTBEAT_PING' || message.action === 'eio_ping') {
        sendResponse({
            pong: true, version: '4.7.13',
            status: extensionState.isRunning ? 'running' : 'idle',
            stats: extensionState.stats
        });
    } else if (message.type === 'EIO_GET_STATUS') {
        sendResponse({
            isRunning: extensionState.isRunning,
            queueLength: extensionState.queue.length,
            stats: extensionState.stats
        });
    }
    return true;
});


