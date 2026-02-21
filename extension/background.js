/*
═══════════════════════════════════════════════════════════
  E.I.O - BACKGROUND SCRIPT (Service Worker)
  Motor de automação — VERSÃO 4.6.5
  LÓGICA DE RECIPROCIDADE E SEGURANÇA CIRÚRGICA
  Combo: Follow → Like×2 → Comment(Emoji) → View Story
  DM somente com follow-back + histórico DM vazio
═══════════════════════════════════════════════════════════
*/

console.log('[E.I.O Engine] ✅ Motor v4.7.0 Ativo');

const BACKEND_URL = 'https://eio-system.vercel.app';

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
    nextRunTimestamp: null,
    // v4.6.5 Persistence
    currentComboIndex: 0,
    currentComboUsername: null
};

// ═══════════════════════════════════════════════════════════
// DELAYS FIXOS E SEGUROS - NÃO CONFIGURÁVEIS
// ═══════════════════════════════════════════════════════════
const DELAY_CONFIG = {
    BETWEEN_ACTIONS_SAME_PROFILE: 80000, // 80s (Fallback)
    BETWEEN_PROFILES: 90000,             // 90s
    COMBO_MIN: 90000,                    // 90s — mínimo entre cliques do combo
    COMBO_MAX: 160000,                   // 160s — máximo entre cliques do combo
    FOLLOWBACK_CHECK_MINUTES: 25         // 25 min para auditoria pós follow-back
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
async function randomDelaySeconds(min = 90, max = 160) {
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
        chrome.storage.local.get(['eio_auth_token', 'authToken', 'token', 'eioLicenseData'], (result) => {
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

        if (!userId || !token) return;

        const payload = {
            user_id: userId,
            instagram_handle: instagramHandle || 'unknown',
            action_type: actionType,
            target_profile: targetProfile,
            success: success,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(`${BACKEND_URL}/api/v1/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('[E.I.O API] 📤 Log enviado com sucesso');
        }
    } catch (error) {
        console.error('[E.I.O API] ❌ Falha no envio de log:', error.message);
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
        return await response.json();
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

// ═══════════════════════════════════════════════════════════
// v4.6.5 - FOLLOW-BACK MONITOR & DM TRIGGER
// REGRA DE OURO: DM SÓ com follow-back + histórico DM vazio
// ═══════════════════════════════════════════════════════════
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith('check_followback_')) {
        const username = alarm.name.replace('check_followback_', '');
        console.log(`[E.I.O v4.6.5] ⏰ Auditoria de Segurança para @${username}...`);

        try {
            const tabId = extensionState.activeTabId || (await ensureValidTab());
            if (!tabId) {
                console.log('[E.I.O v4.6.5] ❌ Nenhuma aba do Instagram disponível para auditoria.');
                return;
            }

            // ═══════════════════════════════════════════════════════════
            // CHECK 1: O perfil ainda nos segue? (Follow-back)
            // ═══════════════════════════════════════════════════════════
            logAction('info', `🔍 [CHECK 1] Verificando se @${username} seguiu de volta...`);

            const followCheckResults = await chrome.scripting.executeScript({
                target: { tabId },
                func: async (u) => {
                    try {
                        const cleanUsername = u.replace('@', '').toLowerCase();
                        const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`, {
                            headers: {
                                'X-IG-App-ID': '936619743392459',
                                'X-ASBD-ID': '129477',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            credentials: 'include'
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const user = data?.data?.user;
                            return {
                                followsViewer: user?.follows_viewer || false,
                                followedByViewer: user?.followed_by_viewer || false,
                                username: user?.username || cleanUsername
                            };
                        }
                        return { followsViewer: false, followedByViewer: false, error: 'API error' };
                    } catch (e) {
                        return { followsViewer: false, followedByViewer: false, error: e.message };
                    }
                },
                args: [username]
            });

            const followStatus = followCheckResults[0]?.result;

            if (!followStatus || !followStatus.followsViewer) {
                logAction('info', `⏸️ [CHECK 1 FALHOU] @${username} NÃO segue de volta. Fluxo encerrado definitivamente.`);
                await sendActionLog('followback_check', username, false);
                return; // REGRA DE OURO: Sem follow-back = encerrado
            }

            logAction('success', `✅ [CHECK 1 OK] @${username} segue de volta!`);

            // ═══════════════════════════════════════════════════════════
            // CHECK 2: Filtro de Virgindade — Histórico de DM vazio?
            // ═══════════════════════════════════════════════════════════
            logAction('info', `🔍 [CHECK 2] Verificando histórico de DMs com @${username}...`);

            const dmCheckResults = await chrome.scripting.executeScript({
                target: { tabId },
                func: async (u) => {
                    try {
                        const cleanUsername = u.replace('@', '').toLowerCase();

                        // Primeiro, obter o ID do usuário
                        const profileResp = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`, {
                            headers: {
                                'X-IG-App-ID': '936619743392459',
                                'X-ASBD-ID': '129477',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            credentials: 'include'
                        });

                        if (!profileResp.ok) return { hasPriorDMs: true, error: 'profile_fetch_fail' };

                        const profileData = await profileResp.json();
                        const targetUserId = profileData?.data?.user?.id;
                        if (!targetUserId) return { hasPriorDMs: true, error: 'no_user_id' };

                        // Verificar inbox para conversas com este usuário
                        // Usa endpoint de inbox threads para checar se existe thread com este user
                        const inboxResp = await fetch(`https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=20&thread_message_limit=1`, {
                            headers: {
                                'X-IG-App-ID': '936619743392459',
                                'X-ASBD-ID': '129477',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            credentials: 'include'
                        });

                        if (!inboxResp.ok) {
                            // Se não conseguir verificar inbox, ABORTAR por segurança (fail-safe)
                            return { hasPriorDMs: true, error: 'inbox_fetch_fail' };
                        }

                        const inboxData = await inboxResp.json();
                        const threads = inboxData?.inbox?.threads || [];

                        // Checar se alguma thread contém este usuário
                        for (const thread of threads) {
                            const users = thread.users || [];
                            for (const user of users) {
                                if (user.pk?.toString() === targetUserId?.toString() ||
                                    user.username?.toLowerCase() === cleanUsername) {
                                    // Thread existe — NÃO é primeira conversa
                                    return { hasPriorDMs: true, threadId: thread.thread_id };
                                }
                            }
                        }

                        // Verificar também mensagens pendentes (requests)
                        const pendingResp = await fetch(`https://www.instagram.com/api/v1/direct_v2/pending_inbox/?persistentBadging=true&folder=&limit=20`, {
                            headers: {
                                'X-IG-App-ID': '936619743392459',
                                'X-ASBD-ID': '129477',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            credentials: 'include'
                        });

                        if (pendingResp.ok) {
                            const pendingData = await pendingResp.json();
                            const pendingThreads = pendingData?.inbox?.threads || [];

                            for (const thread of pendingThreads) {
                                const users = thread.users || [];
                                for (const user of users) {
                                    if (user.pk?.toString() === targetUserId?.toString() ||
                                        user.username?.toLowerCase() === cleanUsername) {
                                        return { hasPriorDMs: true, threadId: thread.thread_id, pending: true };
                                    }
                                }
                            }
                        }

                        // Nenhuma conversa encontrada = histórico limpo
                        return { hasPriorDMs: false };

                    } catch (e) {
                        // Em caso de erro, ABORTAR por segurança
                        return { hasPriorDMs: true, error: e.message };
                    }
                },
                args: [username]
            });

            const dmStatus = dmCheckResults[0]?.result;

            // ═══════════════════════════════════════════════════════════
            // TRAVA DE SEGURANÇA: Se já existe conversa, ABORTAR
            // ═══════════════════════════════════════════════════════════
            if (!dmStatus || dmStatus.hasPriorDMs) {
                const reason = dmStatus?.error
                    ? `Erro na verificação (${dmStatus.error}) — abortando por segurança`
                    : dmStatus?.pending
                        ? 'Conversa pendente já existe'
                        : 'Histórico de DMs NÃO está vazio';

                logAction('info', `🛑 [CHECK 2 FALHOU] @${username}: ${reason}. DM ABORTADA silenciosamente.`);
                await sendActionLog('dm_aborted_history', username, false);
                return; // TRAVA DE SEGURANÇA: Abortar silenciosamente
            }

            logAction('success', `✅ [CHECK 2 OK] Histórico de DMs com @${username} está LIMPO!`);

            // ═══════════════════════════════════════════════════════════
            // TODOS OS CHECKS PASSARAM → ENVIAR DM DE BOAS-VINDAS
            // ═══════════════════════════════════════════════════════════
            logAction('success', `🚀 @${username} passou na auditoria completa! Enviando DM de boas-vindas...`);

            const dmMessage = extensionState.currentOptions.dmMessage
                || extensionState.currentOptions.dmMessageTemplate
                || 'Olá! Obrigado por seguir de volta! 😊';

            const dmResult = await sendMessageWithRetry(tabId, {
                action: 'execute',
                payload: { type: 'dm', target: username, message: dmMessage }
            });

            if (dmResult?.success) {
                logAction('success', `✅ DM de boas-vindas enviada para @${username}!`);
                await sendActionLog('dm_welcome', username, true);
                extensionState.stats.dmsToday++;
                await saveState();
            } else {
                logAction('warning', `⚠️ Falha ao enviar DM para @${username}: ${dmResult?.error || 'desconhecido'}`);
                await sendActionLog('dm_welcome', username, false);
            }

        } catch (e) {
            console.error('[E.I.O v4.6.5] Erro na auditoria de follow-back:', e);
            logAction('error', `❌ Erro na auditoria de @${username}: ${e.message}`);
        }
    }
});

// ═══════════════════════════════════════════════════════════
// MESSAGE HANDLER (CENTRAL)
// ═══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = message.action || message.type;
    console.log('[E.I.O Msg]', action);

    switch (action) {
        case 'eio_ping':
        case 'EIO_HEARTBEAT_PING':
            sendResponse({
                pong: true, version: '4.7.0',
                status: extensionState.isRunning ? 'running' : 'idle',
                stats: extensionState.stats
            });
            break;

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
            sendResponse({ success: true, version: '4.7.0' });
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
});

// ═══════════════════════════════════════════════════════════
// AUTOMATION ENGINE
// ═══════════════════════════════════════════════════════════

let isProcessing = false;
let processingTimeout = null;
let totalQueueSize = 0;
let processedCount = 0;

async function handleStartAutomation(sendResponse) {
    const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
    const instagramTab = tabs.find(t => t.active) || tabs[0];

    if (!instagramTab) {
        sendResponse({ success: false, message: 'Abra o Instagram primeiro!' });
        return;
    }

    extensionState.activeTabId = instagramTab.id;
    extensionState.isRunning = true;
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
 * @param {string} actionType - Action type (follow, like_feed_2, comment, story_interact)
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
                options: options,
                comment: options.commentMessage || "Top! 👏"
            }
        });
        return {
            success: result?.success || result?.meta?.success || false,
            error: result?.error
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * v4.7.0 - STRICT SEQUENTIAL COMBO EXECUTION
 * A ORDEM É INEGOCIÁVEL: Follow → Delay → Like1 → Delay → Like2 → Delay → Comment → Delay → Story
 * @param {number} tabId - Tab ID
 * @param {string} username - Target username
 * @param {object} options - Action options
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function executeInteractionCombo(tabId, username, options = {}) {
    console.log(`[Motor] ═══════ INICIANDO COMBO PARA @${username} ═══════`);
    const results = {
        follow: { success: false },
        like1: { success: false },
        like2: { success: false },
        comment: { success: false },
        story: { success: false }
    };

    // ═══════════════════════════════════════════════════════════
    // PASSO 1: SEGUIR (FOLLOW)
    // ═══════════════════════════════════════════════════════════
    console.log(`[Motor] Passo 1 (Seguir) executando...`);

    // Engine check
    const followPerm = await checkEnginePermission('follow', username);
    if (!followPerm.allowed) {
        console.log(`[Motor] Passo 1 (Seguir) BLOQUEADO: ${followPerm.reason}`);
        return { success: false, results, error: followPerm.reason };
    }
    if (followPerm.delayMs > 0) await sleep(followPerm.delayMs);

    // Execute follow
    results.follow = await executeSingleAction(tabId, 'follow', username, options);

    if (!results.follow.success) {
        console.log(`[Motor] Passo 1 (Seguir) FALHOU. Abortando combo.`);
        return { success: false, results, error: 'Follow failed' };
    }

    // Update stats and log
    updateStats('follow');
    await sendActionLog('follow', username, true);
    notifyPopup('actionCompleted', { username, action: 'follow' });
    console.log(`[Motor] Passo 1 (Seguir) OK.`);

    // DELAY AFTER FOLLOW (90-160 seconds)
    const delaySeconds1 = Math.floor(Math.random() * (160 - 90 + 1)) + 90;
    console.log(`[Motor] Aguardando ${delaySeconds1}s...`);
    await randomDelaySeconds(90, 160);

    // ═══════════════════════════════════════════════════════════
    // PASSO 2: CURTIR PRIMEIRO POST (LIKE 1)
    // ═══════════════════════════════════════════════════════════
    console.log(`[Motor] Passo 2 (Like Post 1) executando...`);

    const like1Perm = await checkEnginePermission('like_feed_2', username);
    if (like1Perm.allowed) {
        if (like1Perm.delayMs > 0) await sleep(like1Perm.delayMs);

        results.like1 = await executeSingleAction(tabId, 'like_feed_2', username, { ...options, postIndex: 1 });

        if (results.like1.success) {
            updateStats('like_feed_2');
            await sendActionLog('like_feed_2', username, true);
            notifyPopup('actionCompleted', { username, action: 'like_feed_2' });
            console.log(`[Motor] Passo 2 (Like Post 1) OK.`);
        } else {
            console.log(`[Motor] Passo 2 (Like Post 1) FALHOU. Continuando...`);
        }
    } else {
        console.log(`[Motor] Passo 2 (Like Post 1) BLOQUEADO: ${like1Perm.reason}`);
    }

    // DELAY AFTER LIKE 1 (90-160 seconds)
    const delaySeconds2 = Math.floor(Math.random() * (160 - 90 + 1)) + 90;
    console.log(`[Motor] Aguardando ${delaySeconds2}s...`);
    await randomDelaySeconds(90, 160);

    // ═══════════════════════════════════════════════════════════
    // PASSO 3: CURTIR SEGUNDO POST (LIKE 2)
    // ═══════════════════════════════════════════════════════════
    console.log(`[Motor] Passo 3 (Like Post 2) executando...`);

    const like2Perm = await checkEnginePermission('like_feed_2', username);
    if (like2Perm.allowed) {
        if (like2Perm.delayMs > 0) await sleep(like2Perm.delayMs);

        results.like2 = await executeSingleAction(tabId, 'like_feed_2', username, { ...options, postIndex: 2 });

        if (results.like2.success) {
            updateStats('like_feed_2');
            await sendActionLog('like_feed_2', username, true);
            notifyPopup('actionCompleted', { username, action: 'like_feed_2' });
            console.log(`[Motor] Passo 3 (Like Post 2) OK.`);
        } else {
            console.log(`[Motor] Passo 3 (Like Post 2) FALHOU. Continuando...`);
        }
    } else {
        console.log(`[Motor] Passo 3 (Like Post 2) BLOQUEADO: ${like2Perm.reason}`);
    }

    // DELAY AFTER LIKE 2 (90-160 seconds)
    const delaySeconds3 = Math.floor(Math.random() * (160 - 90 + 1)) + 90;
    console.log(`[Motor] Aguardando ${delaySeconds3}s...`);
    await randomDelaySeconds(90, 160);

    // ═══════════════════════════════════════════════════════════
    // PASSO 4: COMENTÁRIO (COMMENT)
    // ═══════════════════════════════════════════════════════════
    console.log(`[Motor] Passo 4 (Comentário) executando...`);

    const commentPerm = await checkEnginePermission('comment', username);
    if (commentPerm.allowed) {
        if (commentPerm.delayMs > 0) await sleep(commentPerm.delayMs);

        results.comment = await executeSingleAction(tabId, 'comment', username, options);

        if (results.comment.success) {
            updateStats('comment');
            await sendActionLog('comment', username, true);
            notifyPopup('actionCompleted', { username, action: 'comment' });
            console.log(`[Motor] Passo 4 (Comentário) OK.`);
        } else {
            console.log(`[Motor] Passo 4 (Comentário) FALHOU. Continuando...`);
        }
    } else {
        console.log(`[Motor] Passo 4 (Comentário) BLOQUEADO: ${commentPerm.reason}`);
    }

    // DELAY AFTER COMMENT (90-160 seconds)
    const delaySeconds4 = Math.floor(Math.random() * (160 - 90 + 1)) + 90;
    console.log(`[Motor] Aguardando ${delaySeconds4}s...`);
    await randomDelaySeconds(90, 160);

    // ═══════════════════════════════════════════════════════════
    // PASSO 5: VER STORY (STORY)
    // ═══════════════════════════════════════════════════════════
    console.log(`[Motor] Passo 5 (Story) executando...`);

    const storyPerm = await checkEnginePermission('story_interact', username);
    if (storyPerm.allowed) {
        if (storyPerm.delayMs > 0) await sleep(storyPerm.delayMs);

        results.story = await executeSingleAction(tabId, 'story_interact', username, options);

        if (results.story.success) {
            updateStats('story_interact');
            await sendActionLog('story_interact', username, true);
            notifyPopup('actionCompleted', { username, action: 'story_interact' });
            console.log(`[Motor] Passo 5 (Story) OK.`);
        } else {
            console.log(`[Motor] Passo 5 (Story) FALHOU.`);
        }
    } else {
        console.log(`[Motor] Passo 5 (Story) BLOQUEADO: ${storyPerm.reason}`);
    }

    console.log(`[Motor] ═══════ COMBO FINALIZADO PARA @${username} ═══════`);

    // Return overall success (follow is required, others are optional)
    return {
        success: results.follow.success,
        results
    };
}

async function processQueue() {
    if (isProcessing || !extensionState.isRunning) return;

    if (extensionState.queue.length === 0) {
        extensionState.isRunning = false;
        notifyPopup('automationStopped', { message: 'Fila concluída!' });
        logAction('success', '✅ Fila concluída!');
        saveState();
        return;
    }

    isProcessing = true;
    processedCount++;
    notifyPopup('progressUpdate', { current: processedCount, total: totalQueueSize });

    try {
        let tabId = await ensureValidTab();
        if (!tabId) throw new Error('Aba do Instagram não encontrada');

        const item = extensionState.queue[0]; // Peek (não remove ainda)

        logAction('info', `🎯 [${processedCount}/${totalQueueSize}] Processando @${item.username}...`);

        // Ativar sequência COMBO quando múltiplas ações selecionadas ou tipo explícito
        // follow+like+comment+story (actionType com '+') = combo sequencial com intervalos 90-160s
        const useCombo = extensionState.currentActionType === 'combo_v4_6' ||
            extensionState.currentActionType?.includes('+') ||
            (item.actions && item.actions.length > 1);

        let actionSuccess = false;

        if (useCombo) {
            // ═══════════════════════════════════════════════════════════
            // v4.7.0: USAR NOVA FUNÇÃO SEQUENCIAL ESTRITA
            // ═══════════════════════════════════════════════════════════
            const comboResult = await executeInteractionCombo(
                tabId,
                item.username,
                item.options || extensionState.currentOptions
            );
            actionSuccess = comboResult.success;

            if (!actionSuccess) {
                logAction('warning', `⚠️ Combo falhou para @${item.username}: ${comboResult.error}`);
            }
        } else {
            // Ação única (não-combo)
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

        // ═══════════════════════════════════════════════════════════
        // FIM DO COMBO — PULAR IMEDIATAMENTE PARA PRÓXIMO PERFIL
        // ═══════════════════════════════════════════════════════════
        extensionState.queue.shift(); // Remove permanentemente
        extensionState.currentComboIndex = 0;
        extensionState.currentComboUsername = null;
        processedCount++;
        await saveState();

        if (actionSuccess && useCombo) {
            // v4.6.5: Agendar auditoria de follow-back (25 min)
            // DM SÓ será enviada se passar nos 2 checks da auditoria
            chrome.alarms.create(`check_followback_${item.username}`, {
                delayInMinutes: DELAY_CONFIG.FOLLOWBACK_CHECK_MINUTES
            });
            logAction('success', `✅ Combo finalizado para @${item.username}. Auditoria agendada para daqui a ${DELAY_CONFIG.FOLLOWBACK_CHECK_MINUTES}min.`);
        }

        // v4.6.5: Fluxo Contínuo — pular IMEDIATAMENTE para o próximo perfil
        if (extensionState.isRunning && extensionState.queue.length > 0) {
            isProcessing = false;
            extensionState.nextRunTimestamp = Date.now() + DELAY_CONFIG.BETWEEN_PROFILES;
            logAction('info', `⏳ Próximo perfil em ${DELAY_CONFIG.BETWEEN_PROFILES / 1000}s...`);

            processingTimeout = setTimeout(() => {
                extensionState.nextRunTimestamp = null;
                processQueue();
            }, DELAY_CONFIG.BETWEEN_PROFILES);
        } else {
            isProcessing = false;
            if (extensionState.queue.length === 0) processQueue(); // Re-check para finalizar
        }

    } catch (error) {
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
    if (type === 'comment') extensionState.stats.commentsToday++;
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
    return new Promise(r => setTimeout(r, ms));
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
            pong: true, version: '4.7.0',
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


