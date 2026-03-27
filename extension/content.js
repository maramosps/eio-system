/*
═══════════════════════════════════════════════════════════
  E.I.O - CONTENT SCRIPT (ADVANCED VERSION)
  Interação direta com a página do Instagram
  Suporta: Extração de Leads, Automação, Obtenção de Dados
  VERSÃO 4.5.0 - API DIRETA COM CARREGAMENTO VIA GRAPHQL
═══════════════════════════════════════════════════════════
*/

console.log('E.I.O Content Script v4.7.8 Initializing - HUMAN EMULATION MODE...');

// 🛠️ CONFIGURAÇÕES E ESTADO
const config = {
    selectors: {
        dialog: 'div[role="dialog"]',
        followersList: 'div._aano',
        links: 'a[href^="/"]',
        buttons: {
            follow: 'button:not([disabled])',
            like: 'svg[aria-label="Curtir"]',
            comment: 'textarea[aria-label="Adicione um comentário..."]'
        },
        profileStats: 'header section ul li',
        profileBio: 'header section > div > span',
        followButton: 'header section button',
        verifiedBadge: 'svg[aria-label="Verified"]'
    },
    // API Headers para Instagram
    api: {
        xIgAppId: '936619743392459',
        xAsbdId: '129477',
        // Updated Query hashes (2025 compatible)
        followersQueryHash: 'c76146de99bb02f6415203be841dd25a',
        followingQueryHash: 'd04b0a864b4b54837c0d870b0e77e076'
    }
};

// Cache de IDs de usuários
const userIdCache = new Map();

// Estado de carregamento
let loadedAccounts = [];
let currentProfileUsername = null;
let currentProfileId = null;

// ═══════════════════════════════════════════════════════════
// MONITOR DE NAVEGAÇÃO SPA (Single Page Application)
// Detecta mudanças de rota sem refresh
// ═══════════════════════════════════════════════════════════
let lastUrl = window.location.href;
let isAutoScrapingActive = false;

// Função para verificar se URL é de followers/following
function isFollowersFollowingPage(url) {
    const pathname = new URL(url).pathname;
    return pathname.includes('/followers/') || pathname.includes('/following/');
}

// Função para extrair tipo (followers ou following) da URL
function getExtractionType(url) {
    const pathname = new URL(url).pathname;
    if (pathname.includes('/followers/')) return 'followers';
    if (pathname.includes('/following/')) return 'following';
    return null;
}

// Função para extrair username alvo da URL
function getTargetFromUrl(url) {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/([^\/]+)\/(followers|following)/);
    return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════════
// SILENT AUTO-SCRAPE (Sem UI visual - apenas detecção)
// Feedback visual exclusivo no Dashboard/Popup
// ═══════════════════════════════════════════════════════════
async function silentAutoScrape(type, target) {
    if (isAutoScrapingActive) {
        console.log('[E.I.O] ⏸️ Extração já em andamento, ignorando...');
        return;
    }

    isAutoScrapingActive = true;
    console.log(`[E.I.O] 🚀 Iniciando extração silenciosa de ${type} de @${target}`);

    try {
        const limit = type === 'followers' ? 200 : 500;
        let result;

        if (type === 'followers') {
            result = await loadFollowersViaAPI(target, limit);
        } else {
            result = await loadFollowingViaAPI(target, limit);
        }

        if (result && result.success) {
            const accounts = result.accounts || [];
            console.log(`[E.I.O] ✅ Extração silenciosa completa: ${accounts.length} perfis de @${target}`);

            // Salvar no storage para sincronizar com popup/dashboard
            chrome.storage.local.set({
                eio_extracted_accounts: accounts,
                eio_extraction_timestamp: Date.now(),
                eio_extraction_type: type,
                eio_extraction_target: target
            }, () => {
                console.log('[E.I.O] 💾 Dados salvos no storage para sincronização com Dashboard');
            });

            // Notificar popup/background
            chrome.runtime.sendMessage({
                action: 'extraction_complete',
                type: type,
                target: target,
                accounts: accounts,
                count: accounts.length
            });

        } else {
            console.warn('[E.I.O] ⚠️ Extração retornou sem sucesso:', result?.error || 'Erro desconhecido');
        }
    } catch (error) {
        console.error('[E.I.O] ❌ Erro na extração silenciosa:', error.message);
    } finally {
        isAutoScrapingActive = false;
    }
}

// URL Observer com Auto-Detecção Silenciosa
const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        const newProfile = getCurrentProfileUsername();

        // Sempre logar navegação para debug
        console.log('[E.I.O] Navegação detectada:', window.location.pathname);

        if (newProfile && newProfile !== currentProfileUsername) {
            currentProfileUsername = newProfile;
            console.log('[E.I.O] Perfil ativo alterado para:', newProfile);
        }

        // ════════════════════════════════════════════════════════
        // AUTO-DETECÇÃO SILENCIOSA: Se entrou em página de followers/following
        // Apenas loga no console - sem UI visual na página do Instagram
        // ════════════════════════════════════════════════════════
        if (isFollowersFollowingPage(lastUrl)) {
            const type = getExtractionType(lastUrl);
            const target = getTargetFromUrl(lastUrl);

            if (type && target) {
                console.log(`[E.I.O] 🎯 Página de ${type} detectada para @${target} (modo silencioso)`);
                // Salvar contexto para uso posterior via popup/dashboard
                chrome.storage.local.set({
                    eio_current_page_type: type,
                    eio_current_page_target: target,
                    eio_current_page_url: lastUrl
                });
            }
        }
    }
});

if (document.body) {
    urlObserver.observe(document.body, { subtree: true, childList: true });
}

// Inicializar perfil atual
setTimeout(() => {
    currentProfileUsername = getCurrentProfileUsername();
    if (currentProfileUsername) {
        console.log('[E.I.O] Perfil inicial:', currentProfileUsername);

        // ════════════════════════════════════════════════════════════════════════
        // AUTO-SYNC PERFIL: Atualiza seguidores/seguindo no Dashboard se mudou
        // ════════════════════════════════════════════════════════════════════════
        console.log('[E.I.O Sync] ⏳ Verificando necessidade de sync...');
        getProfileInfoViaAPI(currentProfileUsername).then(profile => {
            if (profile) {
                chrome.storage.local.get(['last_sync_stats'], (result) => {
                    const lastStats = result.last_sync_stats?.[profile.username];

                    const hasChanged = !lastStats ||
                        lastStats.followers !== profile.followers ||
                        lastStats.following !== profile.following ||
                        lastStats.posts !== profile.posts;

                    if (hasChanged) {
                        console.log(`[E.I.O Sync] 📊 Stats alterados para @${profile.username}. Sincronizando...`);

                        // Atualizar cache local
                        const updatedCache = result.last_sync_stats || {};
                        updatedCache[profile.username] = {
                            followers: profile.followers,
                            following: profile.following,
                            posts: profile.posts,
                            timestamp: Date.now()
                        };
                        chrome.storage.local.set({ last_sync_stats: updatedCache });

                        // Enviar para o Background -> Backend -> Dashboard
                        chrome.runtime.sendMessage({
                            action: 'update_profile_stats',
                            data: {
                                instagram_handle: profile.username,
                                followers_count: profile.followers,
                                following_count: profile.following,
                                media_count: profile.posts,
                                profile_pic_url: profile.avatar
                            }
                        });
                    } else {
                        console.log(`[E.I.O Sync] ⏸️ Stats de @${profile.username} inalterados. Sync pulado.`);
                    }
                });
            }
        });
    }

    // ════════════════════════════════════════════════════════
    // VERIFICAÇÃO INICIAL SILENCIOSA
    // ════════════════════════════════════════════════════════
    const currentUrl = window.location.href;
    if (isFollowersFollowingPage(currentUrl)) {
        const type = getExtractionType(currentUrl);
        const target = getTargetFromUrl(currentUrl);

        if (type && target) {
            console.log(`[E.I.O] 🎯 Inicialização em página de ${type} de @${target} (modo silencioso)`);
            // Salvar contexto
            chrome.storage.local.set({
                eio_current_page_type: type,
                eio_current_page_target: target,
                eio_current_page_url: currentUrl
            });
        }
    }
}, 3000); // Aumentei para 3s para garantir carregamento dos scripts da página

// Helper para detectar ID na página
function detectUserIdFromPage() {
    try {
        // Tentar via meta tag al:ios:url (instagram://user?username=X) - as vezes tem id
        const meta = document.querySelector('meta[property="al:ios:url"]');
        if (meta) {
            const content = meta.content; // instagram://user?username=xyz
            // Infelizmente n dá ID direto aqui sempre
        }

        // Tentar via script sharedData (método clássico)
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const text = script.textContent;
            if (text.includes('"id":"') && text.includes('"username":"')) {
                const match = text.match(/"id":"(\d+)","username":"([^"]+)"/);
                if (match && match[2] === getCurrentProfileUsername()) {
                    return match[1];
                }
            }
        }

        // Tentar via profilePage_XXXX
        for (const key in window) {
            if (key.startsWith('profilePage_')) {
                return key.split('_')[1];
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

/**
 * Obter username do perfil atual da URL
 */
function getCurrentProfileUsername() {
    const path = window.location.pathname;
    // Pega o primeiro segmento após a barra inicial (ex: /usuario/followers -> usuario)
    const match = path.match(/^\/([^\/]+)/);

    // Lista de rotas reservadas que NÃO são perfis
    const ignoredRoutes = [
        'explore', 'direct', 'accounts', 'p', 'reel', 'reels', 'stories', 'create', 'settings', 'your_activity'
    ];

    if (match && match[1] && !ignoredRoutes.includes(match[1])) {
        return match[1];
    }
    return null;
}

/* ... loadFollowers functions logic keeps the same structure but using new hashes ... */

/**
 * Obter ID do usuário a partir do username - HÍBRIDO (DOM + API)
 */
async function getUserId(username) {
    const cleanUsername = username.replace('@', '').toLowerCase();

    // 1. Verificar cache primeiro
    if (userIdCache.has(cleanUsername)) {
        return userIdCache.get(cleanUsername);
    }

    // 2. Se for o perfil atual, tentar extrair do DOM instantaneamente
    if (cleanUsername === getCurrentProfileUsername()) {
        const domId = detectUserIdFromPage();
        if (domId) {
            userIdCache.set(cleanUsername, domId);
            addConsoleLog('info', `✅ ID obtido do DOM (Cache atualizado)`);
            return domId;
        }
    }

    addConsoleLog('info', `🔍 Buscando ID de @${cleanUsername} via API...`);

    try {
        // 3. Tentar API web_profile_info
        const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`, {
            headers: {
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const userId = data?.data?.user?.id;
            if (userId) {
                userIdCache.set(cleanUsername, userId);
                return userId;
            }
        }

        // 4. Fallback: Search API (menos restritiva)
        const searchResp = await fetch(`https://www.instagram.com/web/search/topsearch/?context=blended&query=${cleanUsername}&rank_token=0.1`, {
            headers: {
                'X-IG-App-ID': config.api.xIgAppId,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (searchResp.ok) {
            const searchData = await searchResp.json();
            const user = searchData.users?.find(u => u.user.username === cleanUsername)?.user;
            if (user && user.pk) {
                userIdCache.set(cleanUsername, user.pk);
                addConsoleLog('info', `✅ ID recuperado via Search`);
                return user.pk;
            }
        }

    } catch (error) {
        addConsoleLog('error', `❌ Erro ao obter ID: ${error.message}`);
    }

    return null;
}

/**
 * ═══════════════════════════════════════════════════════════
 * CARREGAR SEGUIDORES VIA API - SEM ABRIR MODAL!
 * Carrega ATÉ O LIMITE de perfis NOVOS (que você ainda não segue)
 * ═══════════════════════════════════════════════════════════
 */
async function loadFollowersViaAPI(username, limit = 200) {
    addConsoleLog('info', `📥 Carregando ${limit} seguidores novos de @${username} via API...`);

    const userId = await getUserId(username);
    if (!userId) {
        addConsoleLog('error', `❌ Não foi possível obter ID de @${username}`);
        return [];
    }

    let newFollowers = [];      // Apenas perfis que você NÃO segue
    let totalLoaded = 0;        // Total de perfis carregados (incluindo filtrados)
    let maxId = '';
    let hasNext = true;
    let retryCount = 0;
    const maxRetries = 3;
    const maxTotalToLoad = limit * 3; // Carregar até 3x o limite para compensar filtro

    // Continuar até ter 'limit' perfis NOVOS ou esgotar a lista
    while (hasNext && newFollowers.length < limit && totalLoaded < maxTotalToLoad) {
        try {
            let url = `https://i.instagram.com/api/v1/friendships/${userId}/followers/?count=100`;
            if (maxId) url += `&max_id=${maxId}`;

            const response = await fetch(url, {
                headers: {
                    'X-IG-App-ID': config.api.xIgAppId,
                    'X-ASBD-ID': config.api.xAsbdId,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 429) {
                    addConsoleLog('warning', '⚠️ Rate limit. Aguardando 30s...');
                    await randomDelay(30000, 60000);
                    retryCount++;
                    if (retryCount < maxRetries) continue;
                    break;
                }
                addConsoleLog('error', `❌ API status ${response.status}`);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.users && data.users.length > 0) {
                for (const user of data.users) {
                    totalLoaded++;

                    // Verificar se você JÁ SEGUE este perfil
                    const isFollowing =
                        user.friendship_status?.following === true ||
                        user.friendship_status?.is_following === true ||
                        user.following === true ||
                        user.is_following === true;

                    const hasOutgoingRequest =
                        user.friendship_status?.outgoing_request === true ||
                        user.outgoing_request === true;

                    // FILTRAR EM TEMPO REAL: só adiciona se NÃO segue
                    if (!isFollowing && !hasOutgoingRequest) {
                        newFollowers.push({
                            id: user.pk || user.id,
                            username: user.username,
                            full_name: user.full_name || '',
                            profile_pic_url: user.profile_pic_url || '',
                            is_private: user.is_private || false,
                            is_verified: user.is_verified || false,
                            followed_by_viewer: false,
                            follows_viewer: user.friendship_status?.followed_by || false,
                            requested_by_viewer: false
                        });

                        // Parar se atingiu o limite
                        if (newFollowers.length >= limit) break;
                    }
                }

                maxId = data.next_max_id || '';
                hasNext = !!data.next_max_id;

                const skipped = totalLoaded - newFollowers.length;
                addConsoleLog('info', `📊 ${newFollowers.length}/${limit} novos (${skipped} já seguidos pulados)...`);

                // ENVIAR PROGRESSO PARA O POPUP
                chrome.runtime.sendMessage({
                    action: 'extraction_progress',
                    count: newFollowers.length,
                    total: limit,
                    type: 'followers'
                }).catch(() => { });

            } else {
                hasNext = false;
            }

            // Delay entre requisições
            if (hasNext && newFollowers.length < limit) {
                await randomDelay(800, 1500); // um pouco mais rápido
            }

        } catch (error) {
            addConsoleLog('error', `❌ Erro: ${error.message}`);
            hasNext = false;
        }
    }

    const skippedTotal = totalLoaded - newFollowers.length;
    addConsoleLog('success', `✅ Carregados ${newFollowers.length} perfis novos! (${skippedTotal} já seguidos ignorados)`);

    // Progresso final 100%
    chrome.runtime.sendMessage({
        action: 'extraction_progress',
        count: newFollowers.length,
        total: limit,
        type: 'followers'
    }).catch(() => { });

    loadedAccounts = newFollowers;
    return newFollowers;
}

/**
 * ═══════════════════════════════════════════════════════════
 * CARREGAR SEGUINDO VIA API - SEM ABRIR MODAL!
 * ═══════════════════════════════════════════════════════════
 */
async function loadFollowingViaAPI(username, limit = 200) {
    addConsoleLog('info', `📥 Carregando seguindo de @${username} via API...`);

    const userId = await getUserId(username);
    if (!userId) {
        addConsoleLog('error', `❌ Não foi possível obter ID de @${username}`);
        return [];
    }

    let allFollowing = [];
    let maxId = '';
    let hasNext = true;
    let retryCount = 0;
    const maxRetries = 3;

    while (hasNext && allFollowing.length < limit) {
        try {
            // Endpoint da Private API do Instagram - usando count=100 para carregar mais rápido
            let url = `https://i.instagram.com/api/v1/friendships/${userId}/following/?count=100`;
            if (maxId) url += `&max_id=${maxId}`;

            const response = await fetch(url, {
                headers: {
                    'X-IG-App-ID': config.api.xIgAppId,
                    'X-ASBD-ID': config.api.xAsbdId,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 429) {
                    addConsoleLog('warning', '⚠️ Rate limit atingido. Aguardando 30s...');
                    await randomDelay(30000, 60000);
                    retryCount++;
                    if (retryCount < maxRetries) continue;
                    break;
                }
                addConsoleLog('error', `❌ API retornou status ${response.status}`);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.users && data.users.length > 0) {
                for (const user of data.users) {
                    // Verificar se VOCÊ (viewer) segue esta pessoa
                    const isFollowing =
                        user.friendship_status?.following === true ||
                        user.friendship_status?.is_following === true ||
                        user.following === true ||
                        user.is_following === true ||
                        user.followed_by_viewer === true;

                    const hasOutgoingRequest =
                        user.friendship_status?.outgoing_request === true ||
                        user.outgoing_request === true ||
                        user.requested_by_viewer === true;

                    allFollowing.push({
                        id: user.pk || user.id,
                        username: user.username,
                        full_name: user.full_name || '',
                        profile_pic_url: user.profile_pic_url || '',
                        is_private: user.is_private || false,
                        is_verified: user.is_verified || false,
                        followed_by_viewer: isFollowing,
                        follows_viewer: user.friendship_status?.followed_by || user.follows_viewer || false,
                        requested_by_viewer: hasOutgoingRequest
                    });
                }

                maxId = data.next_max_id || '';
                hasNext = !!data.next_max_id && allFollowing.length < limit;

                addConsoleLog('info', `📊 Carregados ${allFollowing.length} seguindo...`);

                // ENVIAR PROGRESSO PARA O POPUP
                chrome.runtime.sendMessage({
                    action: 'extraction_progress',
                    count: allFollowing.length,
                    total: limit,
                    type: 'following'
                }).catch(() => { });

            } else {
                hasNext = false;
            }

            // Delay entre requisições para evitar rate limit
            if (hasNext) await randomDelay(800, 1500);

        } catch (error) {
            addConsoleLog('error', `❌ Erro ao carregar seguindo: ${error.message}`);
            hasNext = false;
        }
    }

    addConsoleLog('success', `✅ Total: ${allFollowing.length} seguindo carregados!`);

    // Progresso final
    chrome.runtime.sendMessage({
        action: 'extraction_progress',
        count: allFollowing.length,
        total: limit,
        type: 'following'
    }).catch(() => { });

    loadedAccounts = allFollowing;
    return allFollowing;
}


/**
 * Utilitário para delay aleatório (mais humano)
 */
function randomDelay(min, max) {
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}

/**
 * ═══════════════════════════════════════════════════════════
 * ADVANCED HUMAN EMULATION HELPERS (v4.7.8)
 * Bypasses Instagram anti-bot layer by simulating full user
 * interaction sequences with realistic timing.
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Simulates a full human mouse-click sequence on an element.
 * Dispatches: mouseover → mouseenter → mousedown → mouseup → click
 * with small random delays (10-50ms) between each event.
 */
async function simulateHumanClick(element) {
    if (!element) throw new Error('simulateHumanClick: element is null');

    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 + (Math.random() * 4 - 2);
    const cy = rect.top + rect.height / 2 + (Math.random() * 4 - 2);

    const baseOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: cx,
        clientY: cy,
        screenX: cx + window.screenX,
        screenY: cy + window.screenY,
        button: 0,
        buttons: 1
    };

    const tinyDelay = () => new Promise(r => setTimeout(r, Math.floor(Math.random() * 41) + 10));

    element.dispatchEvent(new MouseEvent('mouseover', baseOpts));
    await tinyDelay();

    element.dispatchEvent(new MouseEvent('mouseenter', { ...baseOpts, bubbles: false }));
    await tinyDelay();

    element.dispatchEvent(new MouseEvent('mousedown', baseOpts));
    await tinyDelay();

    element.dispatchEvent(new MouseEvent('mouseup', baseOpts));
    await tinyDelay();

    element.dispatchEvent(new MouseEvent('click', baseOpts));

    addConsoleLog('info', `🖱️ Human click simulated on <${element.tagName}>`);
}

/**
 * Simulates human typing into an input/textarea/contenteditable element.
 * For each character dispatches: focus → keydown → keypress → input → keyup
 * with small random delays between events and between characters.
 */
async function simulateHumanType(inputElement, text) {
    if (!inputElement) throw new Error('simulateHumanType: inputElement is null');

    inputElement.focus();
    inputElement.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await randomDelay(100, 200);

    const isNativeInput = inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT';

    for (const char of text) {
        const keyOpts = {
            key: char,
            code: `Key${char.toUpperCase()}`,
            charCode: char.charCodeAt(0),
            keyCode: char.charCodeAt(0),
            which: char.charCodeAt(0),
            bubbles: true,
            cancelable: true
        };

        inputElement.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
        await randomDelay(5, 15);

        inputElement.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
        await randomDelay(5, 15);

        if (isNativeInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            )?.set || Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            )?.set;

            if (nativeSetter) {
                nativeSetter.call(inputElement, inputElement.value + char);
            } else {
                inputElement.value += char;
            }
        } else {
            inputElement.textContent += char;
        }

        inputElement.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertText',
            data: char
        }));
        await randomDelay(5, 15);

        inputElement.dispatchEvent(new KeyboardEvent('keyup', keyOpts));

        await randomDelay(30, 90);
    }

    addConsoleLog('info', `⌨️ Human type simulated: "${text}"`);
}

/**
 * Sincronizar log com extensão
 */
function addConsoleLog(level, message) {
    console.log(`[E.I.O ${level.toUpperCase()}] ${message}`);
    const time = new Date().toLocaleTimeString('pt-BR');
    try {
        chrome.runtime.sendMessage({
            action: 'console_log',
            level: level,
            message: message,
            time: time
        }).catch(() => { });
    } catch (e) { }
}

/**
 * Obter CSRF Token dos cookies
 */
function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

/**
 * Extract X-Instagram-AJAX revision ID from page shared data
 * Instagram requires this header to validate API requests as legitimate
 */
function getInstagramAjaxId() {
    try {
        // Method 1: From window.__initialData or require('ServerNonce')
        if (window.__initialData?.server_revision) return String(window.__initialData.server_revision);
        // Method 2: From embedded script with server_revision
        const scripts = document.querySelectorAll('script[type="text/javascript"]');
        for (const script of scripts) {
            const match = script.textContent?.match(/"server_revision":(\d+)/);
            if (match) return match[1];
        }
        // Method 3: From link preload headers
        const preload = document.querySelector('link[as="script"][href*="/rsrc.php/"]');
        if (preload) {
            const hrefMatch = preload.href.match(/\/v(\d+)\//);
            if (hrefMatch) return hrefMatch[1];
        }
    } catch (e) { /* ignore */ }
    return '1';
}

/**
 * Build the full set of Instagram API headers needed for mutations
 */
function getInstagramApiHeaders() {
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': getCsrfToken(),
        'X-IG-App-ID': config.api.xIgAppId,
        'X-ASBD-ID': config.api.xAsbdId,
        'X-IG-WWW-Claim': sessionStorage.getItem('www-claim-v2') || '0',
        'X-Instagram-AJAX': getInstagramAjaxId(),
        'X-Requested-With': 'XMLHttpRequest'
    };
}

/**
 * ═══════════════════════════════════════════════════════════
 * API DIRETA DO INSTAGRAM - FOLLOW SEM ABRIR PÁGINA
 * ═══════════════════════════════════════════════════════════
 */
async function apiFollow(userId) {
    try {
        const headers = getInstagramApiHeaders();
        if (!headers['X-CSRFToken']) return { success: false, error: 'CSRF token not found' };

        const response = await fetch(`https://www.instagram.com/api/v1/friendships/create/${userId}/`, {
            method: 'POST',
            headers,
            body: `user_id=${userId}&container_module=profile&nav_chain=`,
            credentials: 'include',
            referrer: 'https://www.instagram.com/',
            referrerPolicy: 'strict-origin-when-cross-origin',
            mode: 'cors'
        });

        if (!response.ok) return { success: false, status: response.status, error: `HTTP ${response.status}` };
        const data = await response.json().catch(() => ({}));
        if (data.status === 'ok' || data.friendship_status) {
            return { success: true, data };
        }
        return { success: false, status: response.status, message: data.message || 'IG did not confirm follow' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * API DIRETA DO INSTAGRAM - UNFOLLOW SEM ABRIR PÁGINA
 */
async function apiUnfollow(userId) {
    try {
        const headers = getInstagramApiHeaders();
        if (!headers['X-CSRFToken']) return { success: false, error: 'CSRF token not found' };

        const response = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${userId}/`, {
            method: 'POST',
            headers,
            body: `user_id=${userId}&container_module=profile`,
            credentials: 'include',
            referrer: 'https://www.instagram.com/',
            referrerPolicy: 'strict-origin-when-cross-origin',
            mode: 'cors'
        });

        if (!response.ok) return { success: false, status: response.status, error: `HTTP ${response.status}` };
        const data = await response.json().catch(() => ({}));
        if (data.status === 'ok') {
            return { success: true, data };
        }
        return { success: false, status: response.status, message: data.message || 'IG did not confirm unfollow' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * API DIRETA DO INSTAGRAM - LIKE COM HEADERS COMPLETOS
 * Inclui todos os headers anti-bot para garantir registro no backend do IG
 */
async function apiLike(mediaId) {
    try {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            return { success: false, error: 'CSRF token not found in cookies' };
        }

        const ajaxId = getInstagramAjaxId();

        const response = await fetch(`https://www.instagram.com/api/v1/web/likes/${mediaId}/like/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-IG-WWW-Claim': sessionStorage.getItem('www-claim-v2') || '0',
                'X-Instagram-AJAX': ajaxId,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: '',
            credentials: 'include',
            referrer: 'https://www.instagram.com/',
            referrerPolicy: 'strict-origin-when-cross-origin',
            mode: 'cors'
        });

        if (!response.ok) {
            return { success: false, status: response.status, error: `HTTP ${response.status}` };
        }

        const data = await response.json().catch(() => ({}));

        if (data.status === 'ok') {
            return { success: true, data };
        }

        return { success: false, status: response.status, message: data.message || 'IG did not confirm like' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Obter ID do usuário a partir do username - SOMENTE VIA API
 */
async function getUserId(username) {
    const cleanUsername = username.replace('@', '').toLowerCase();

    // Verificar cache primeiro
    if (userIdCache.has(cleanUsername)) {
        addConsoleLog('info', `📋 ID de @${cleanUsername} encontrado no cache`);
        return userIdCache.get(cleanUsername);
    }

    addConsoleLog('info', `🔍 Buscando ID de @${cleanUsername} via API...`);

    try {
        const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`, {
            headers: {
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const userId = data?.data?.user?.id;
            if (userId) {
                userIdCache.set(cleanUsername, userId);
                addConsoleLog('success', `✅ ID obtido via API`);
                return userId;
            }
        } else if (response.status === 404) {
            addConsoleLog('warning', `⚠️ Usuário @${cleanUsername} não encontrado`);
        } else {
            addConsoleLog('warning', `⚠️ API retornou status ${response.status}`);
        }
    } catch (error) {
        addConsoleLog('error', `❌ Erro ao obter ID: ${error.message}`);
    }

    return null;
}

/**
 * Obter informações do perfil via API (não DOM)
 */
async function getProfileInfoViaAPI(username) {
    const cleanUsername = username.replace('@', '').toLowerCase();

    try {
        const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`, {
            headers: {
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const user = data?.data?.user;

            if (user) {
                return {
                    id: user.id,
                    username: user.username,
                    fullName: user.full_name || '',
                    bio: user.biography || '',
                    avatar: user.profile_pic_url || '',
                    posts: user.edge_owner_to_timeline_media?.count || 0,
                    followers: user.edge_followed_by?.count || 0,
                    following: user.edge_follow?.count || 0,
                    isPrivate: user.is_private || false,
                    isVerified: user.is_verified || false,
                    businessCategory: user.business_category_name || '',
                    externalUrl: user.external_url || '',
                    followedByViewer: user.followed_by_viewer || false,
                    followsViewer: user.follows_viewer || false,
                    requestedByViewer: user.requested_by_viewer || false
                };
            }
        }
    } catch (error) {
        console.error('[E.I.O API] Erro ao obter perfil:', error);
    }

    return null;
}


/**
 * Extrair número de uma string (ex: "1.2M" -> 1200000)
 */
function parseCount(str) {
    if (!str) return null;
    const clean = str.replace(/[^\d.,KMkm]/g, '').trim();
    if (!clean) return null;

    let num = parseFloat(clean.replace(',', '.'));
    if (clean.toLowerCase().includes('k')) num *= 1000;
    if (clean.toLowerCase().includes('m')) num *= 1000000;
    return Math.round(num);
}

/**
 * Converter imagem para Base64 (resolve problemas de CORS)
 */
function imageToBase64(imgElement) {
    return new Promise((resolve) => {
        try {
            // Se já é base64, retornar
            if (imgElement.src && imgElement.src.startsWith('data:')) {
                resolve(imgElement.src);
                return;
            }

            // Criar canvas e desenhar a imagem
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Usar tamanho pequeno para economizar espaço
            canvas.width = 64;
            canvas.height = 64;

            // Desenhar imagem no canvas
            ctx.drawImage(imgElement, 0, 0, 64, 64);

            // Converter para base64
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            resolve(base64);
        } catch (e) {
            console.log('[E.I.O] Erro ao converter imagem:', e.message);
            resolve(null);
        }
    });
}

/**
 * Obter dados detalhados do perfil atual
 * Safe version with robust error handling
 */
function getDetailedProfileInfo() {
    const info = {
        username: '',
        fullName: '',
        bio: '',
        avatar: null,
        posts: null,
        followers: null,
        following: null,
        ratio: null,
        isPrivate: false,
        isVerified: false,
        businessCategory: '',
        externalUrl: '',
        followedByMe: false,
        followsMe: false
    };

    try {
        // Username from URL
        const pathParts = window.location.pathname.split('/').filter(p => p);
        info.username = pathParts[0] ? `@${pathParts[0]}` : '';
    } catch (e) {
        console.log('[E.I.O] Error extracting username from URL:', e.message);
    }

    try {
        // Header section
        const header = document.querySelector('header section');
        if (header) {
            try {
                // Full Name
                const nameEl = header.querySelector('span[style*="font-weight"]') || header.querySelector('h2');
                if (nameEl) info.fullName = nameEl.textContent?.trim() || '';
            } catch (e) { /* ignore */ }

            try {
                // Avatar
                const avatarEl = document.querySelector('header img');
                if (avatarEl && avatarEl.src) info.avatar = avatarEl.src;
            } catch (e) { /* ignore */ }

            try {
                // Stats (posts, followers, following)
                const statsEls = document.querySelectorAll('header section ul li');
                if (statsEls && statsEls.length >= 3) {
                    info.posts = parseCount(statsEls[0]?.textContent);
                    info.followers = parseCount(statsEls[1]?.textContent);
                    info.following = parseCount(statsEls[2]?.textContent);

                    if (info.followers && info.following && info.following > 0) {
                        info.ratio = parseFloat((info.followers / info.following).toFixed(2));
                    }
                }
            } catch (e) { /* ignore */ }

            try {
                // Bio
                const bioSection = header.querySelector('div > span');
                if (bioSection) info.bio = bioSection.textContent?.trim() || '';
            } catch (e) { /* ignore */ }

            try {
                // Verified badge
                info.isVerified = !!header.querySelector('svg[aria-label="Verified"]');
            } catch (e) { /* ignore */ }

            try {
                // Private account check - avoid using :contains() which is not standard
                const bodyText = document.body?.innerText || '';
                info.isPrivate = bodyText.includes('This Account is Private') || bodyText.includes('Esta conta é privada');
            } catch (e) { /* ignore */ }

            try {
                // Follow button state
                const followBtn = header.querySelector('button');
                if (followBtn) {
                    const btnText = (followBtn.textContent || '').toLowerCase();
                    info.followedByMe = btnText.includes('seguindo') || btnText.includes('following');
                }
            } catch (e) { /* ignore */ }

            try {
                // Follows me (mutual)
                const bodyText = document.body?.innerText || '';
                info.followsMe = bodyText.includes('Segue você') || bodyText.includes('Follows you');
            } catch (e) { /* ignore */ }

            try {
                // External URL
                const linkEl = header.querySelector('a[href*="l.instagram.com"]');
                if (linkEl && linkEl.href) info.externalUrl = linkEl.href;
            } catch (e) { /* ignore */ }

            try {
                // Business category - use safer selector
                const allDivs = header.querySelectorAll('div');
                for (const div of allDivs) {
                    const style = div.getAttribute('style') || '';
                    if (style.includes('color: rgb(142, 142, 142)') || style.includes('color:rgb(142, 142, 142)')) {
                        const text = div.textContent?.trim();
                        if (text && text.length < 50) {
                            info.businessCategory = text;
                            break;
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }
    } catch (e) {
        console.log('[E.I.O] Error getting profile info (outer):', e.message);
    }

    return info;
}

/**
 * Iniciar Extração com coleta de dados completos
 */
async function runExtractionFlow(payload) {
    const leads = [];
    const filters = payload.filters || {};
    const limit = payload.limit || 200;
    const extractType = payload.type || 'followers';
    const getDetailedData = payload.getDetailedData || false;

    const listTypeLabels = {
        'followers': 'Seguidores',
        'following': 'Seguindo',
        'likes': 'Curtidas',
        'likers': 'Curtidores',
        'commenters': 'Comentadores',
        'hashtags': 'Hashtag',
        'unfollow': 'Não me seguem',
        'pending': 'Pendentes'
    };
    const listLabel = listTypeLabels[extractType] || 'leads';

    addConsoleLog('info', `🚀 Iniciando extração de ${listLabel} (Limite: ${limit})...`);

    // Localizar o Container de Scroll - Múltiplos métodos de fallback
    let scrollContainer = null;
    const dialog = document.querySelector('div[role="dialog"]');

    if (dialog) {
        addConsoleLog('info', '🔍 Janela modal detectada. Buscando container de scroll...');

        // Método 1: Buscar por classe conhecida _aano (padrão atual do Instagram)
        scrollContainer = dialog.querySelector('div._aano');

        // Método 2: Buscar divs com scroll ativo
        if (!scrollContainer) {
            const allDivs = dialog.querySelectorAll('div');
            for (const div of allDivs) {
                // Verificar se tem conteúdo scrollável
                if (div.scrollHeight > div.clientHeight + 10) {
                    const style = window.getComputedStyle(div);
                    const overflowY = style.overflowY || style.overflow;
                    if (overflowY === 'auto' || overflowY === 'scroll') {
                        // Verificar se contém links de perfil (indica lista de usuários)
                        const hasProfileLinks = div.querySelectorAll('a[href^="/"]').length > 3;
                        if (hasProfileLinks) {
                            scrollContainer = div;
                            addConsoleLog('success', '✅ Container encontrado via detecção de scroll');
                            break;
                        }
                    }
                }
            }
        }

        // Método 3: Seletores alternativos comuns
        if (!scrollContainer) {
            const alternativeSelectors = [
                'div[style*="overflow: hidden auto"]',
                'div[style*="overflow-y: auto"]',
                'div[style*="overflow-y: scroll"]',
                'div[class*="x1n2onr6"]', // Classe usada em alguns layouts
                'div[class*="x1lliihq"]', // Outra classe comum
                'div[style*="max-height"]'
            ];

            for (const selector of alternativeSelectors) {
                const found = dialog.querySelector(selector);
                if (found && found.querySelectorAll('a[href^="/"]').length > 3) {
                    scrollContainer = found;
                    addConsoleLog('success', `✅ Container encontrado via selector alternativo`);
                    break;
                }
            }
        }
    }

    // Fallback final: buscar na página toda
    if (!scrollContainer) {
        scrollContainer = document.querySelector('div._aano');
    }

    if (!scrollContainer) {
        addConsoleLog('error', `❌ Lista de ${listLabel} não detectada. Abra uma lista primeiro!`);
        return {
            success: false,
            message: `Por favor, abra a lista de ${listLabel} na tela antes de iniciar.`,
            errorType: 'MISSING_CONTAINER'
        };
    }

    addConsoleLog('success', `🎯 Lista de ${listLabel} pronta. Iniciando captura...`);

    let idleCount = 0; // Contador para detectar fim da lista ou travamento

    for (let scrollStep = 0; scrollStep < 1000; scrollStep++) { // Aumentar o limite de passos para garantir que a lista seja percorrida
        let items = scrollContainer.querySelectorAll('div[role="listitem"]');
        if (items.length === 0) items = scrollContainer.querySelectorAll('div[role="button"]');
        if (items.length === 0) items = scrollContainer.querySelectorAll('li');
        if (items.length === 0) items = scrollContainer.querySelectorAll('div._aacl');

        // Fallback: Links diretos
        if (items.length === 0) {
            items = scrollContainer.querySelectorAll('a[href^="/"]');
        }
        let newFound = 0;

        for (const item of items) {
            const link = item.querySelector('a[href^="/"]');
            if (!link) continue;

            const href = link.getAttribute('href');
            const username = href.replace(/\//g, '');

            if (!username || ['explore', 'reels', 'direct', 'stories', 'p', 'about', 'legal', 'help', 'terms', 'privacy'].includes(username)) continue;

            const cleanUsername = `@${username}`;
            if (leads.find(l => l.username === cleanUsername)) continue;

            // Extrair nome - geralmente está em spans dentro do link
            const nameSpans = item.querySelectorAll('span');
            let name = '';
            for (const span of nameSpans) {
                const text = span.textContent?.trim();
                if (text && text.length > 0 && text.length < 50 && !text.includes('@') && !text.includes('Seguir')) {
                    name = text;
                    break;
                }
            }
            if (!name) {
                name = link.innerText.trim().split('\n')[0] || '';
            }

            // Extrair avatar - tentar múltiplos métodos
            let avatarSrc = null;
            let avatarImg = null;

            // Método 1: qualquer img com src válida no item
            const allImgs = item.querySelectorAll('img');
            for (const img of allImgs) {
                const src = img.src || img.getAttribute('src');
                if (src && (src.startsWith('http') || src.startsWith('data:image'))) {
                    // Preferir imagens com URLs do Instagram CDN
                    if (src.includes('cdninstagram') || src.includes('fbcdn') || src.includes('instagram')) {
                        avatarSrc = src;
                        avatarImg = img;
                        break;
                    }
                    // Aceitar qualquer imagem válida se ainda não temos
                    if (!avatarSrc) {
                        avatarSrc = src;
                        avatarImg = img;
                    }
                }
            }

            // Método 2: verificar img no elemento link direto
            if (!avatarSrc) {
                const linkImg = link.querySelector('img');
                if (linkImg && linkImg.src) {
                    avatarSrc = linkImg.src;
                    avatarImg = linkImg;
                }
            }

            // Método 3: Background image
            if (!avatarSrc) {
                const divWithBg = item.querySelector('[style*="background-image"]');
                if (divWithBg) {
                    const bgStyle = divWithBg.style.backgroundImage;
                    const match = bgStyle.match(/url\(["']?([^"')]+)["']?\)/);
                    if (match) avatarSrc = match[1];
                }
            }

            // Método 4: Tentar converter para Base64 se temos elemento img
            // Isso resolve problemas de CORS quando a URL expira
            if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(avatarImg, 0, 0, 64, 64);
                    avatarSrc = canvas.toDataURL('image/jpeg', 0.7);
                } catch (e) {
                    // Se falhar (CORS), manter a URL original
                    console.log('[E.I.O] Fallback para URL original:', username);
                }
            }

            // Log para debug
            if (!avatarSrc) {
                console.log('[E.I.O] Sem avatar para:', username);
            }

            const hasStoryRing = !!item.querySelector('canvas') || !!item.querySelector('[style*="gradient"]');
            const isPrivate = item.innerText.includes('Solicitado') || item.innerText.includes('Private');
            const isVerified = !!item.querySelector('svg[aria-label="Verified"]') || !!item.querySelector('svg[aria-label="Verificado"]');

            // ═══════════════════════════════════════════════════════════
            // DETECÇÃO SE VOCÊ JÁ SEGUE ESTE PERFIL - FILTRO RIGOROSO
            // ═══════════════════════════════════════════════════════════

            const btnText = item.innerText.toLowerCase();

            // 1. Você já segue?
            const isFollowing = btnText.includes('seguindo') || btnText.includes('following');

            // 2. Pedido pendente?
            const isRequested = btnText.includes('solicitado') || btnText.includes('requested');

            // 3. Ele te segue? (Para contato totalmente frio)
            // Se o usuário pedir 'followers' (leads), geralmente quer quem NÃO o segue ainda.
            // O texto "Segue você" ou "Follows you" aparece no item.
            const followsMe = btnText.includes('segue você') || btnText.includes('follows you');

            // APLICAR FILTROS - COMENTADO PARA NÃO OCULTAR DADOS
            // Deixamos o usuário filtrar no Dashboard depois
            /* 
            if (extractType === 'followers') {
                if (isFollowing || isRequested || followsMe) {
                    continue;
                }
            }
            */

            if (extractType === 'following') {
                // Se carrego quem sigo, obviamente aceito 'isFollowing'
                // Mas aqui é loadFromInstagram 'following' -> Unfollow list.
            }

            // Adicionar à lista
            leads.push({
                username: cleanUsername,
                fullName: name,
                profilePic: avatarSrc || '',
                followers: 0,
                following: 0,
                posts: 0,
                isPrivate: isPrivate,
                isVerified: isVerified,
                status: 'none'
            });

            // -------------------------------------------------------------------------
            // NOVA LÓGICA DE CONTROLE DE LOOP
            // O check 'if (leads.find...)' acima já garante unicidade.
            // Aqui garantimos que contamos novos itens para controle de fluxo.
            // -------------------------------------------------------------------------
            newFound++;
        }

        // Atualizar contagens
        const total = leads.length;

        // Enviar progresso SEMPRE a cada bloco processado
        chrome.runtime.sendMessage({
            action: 'extraction_progress',
            count: total,
            total: limit, // Enviar meta também
            type: extractType
        }).catch(() => { });

        addConsoleLog('info', `📊 Progresso: ${total}/${limit} leads coletados (${newFound} novos neste scroll)`);

        // Verificar meta atingida
        if (total >= limit) {
            addConsoleLog('success', `✅ Meta alcançada: ${limit} perfis!`);
            break;
        }

        // SCROLL MAIS RÁPIDO PARA PRÓXIMO LOTE
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const currentScroll = scrollContainer.scrollTop;

        if (currentScroll >= maxScroll - 50 && newFound === 0) {
            idleCount++;
            addConsoleLog('warning', `⚠️ Sem novos itens. Tentativa ${idleCount}/5...`);

            // Tentar um "shake" no scroll para acordar o Instagram
            scrollContainer.scrollTo(0, maxScroll - 100);
            await new Promise(r => setTimeout(r, 300));
            scrollContainer.scrollTo(0, maxScroll);
        } else {
            idleCount = 0; // Resetar contador se encontrou itens
        }

        if (idleCount >= 5) {
            addConsoleLog('warning', '⚠️ Fim da lista detectado ou carregamento travado.');
            break;
        }

        // Scroll principal - RÁPIDO
        scrollContainer.scrollTo(0, scrollContainer.scrollHeight);

        // Esperar carregamento - Tempo otimizado
        await new Promise(r => setTimeout(r, 800));
    }

    addConsoleLog('success', `🎉 Extração concluída! Total: ${leads.length} leads.`);

    // Garantir envio final
    chrome.runtime.sendMessage({
        action: 'extraction_progress',
        count: leads.length,
        total: leads.length,
        type: extractType,
        completed: true
    }).catch(() => { });

    return {
        success: true,
        data: leads,
        count: leads.length
    };
}
/**
 * Executar ações no Instagram
 * v4.4.24 - ZERO-RISK PROTOCOL - Regras obrigatórias para proteger a conta
 */
async function executeInstagramAction(payload) {
    const { type, target } = payload;

    // ═══════════════════════════════════════════════════════════
    // v4.4.24 ZERO-RISK PROTOCOL - Pre-Flight Check
    // Verifica metadados ANTES de qualquer interação
    // Retorna SKIPPED (sucesso) em vez de erro para não poluir logs
    // ═══════════════════════════════════════════════════════════

    // Para ações de follow, verificar perfil antes de executar
    if (type === 'follow' && target) {
        const cleanUsername = target.replace('@', '').toLowerCase();

        try {
            // Tentar obter informações do perfil via API
            const profileInfo = await getProfileInfoViaAPI(cleanUsername);

            if (profileInfo) {
                // REGRA 1: Pular contas privadas - ZERO INTERAÇÃO
                if (profileInfo.isPrivate) {
                    addConsoleLog('info', `🔒 [IGNORADO] @${cleanUsername} - Conta Privada (risco de block)`);
                    return {
                        success: true,  // SUCESSO no skip, não erro!
                        status: 'SKIPPED',
                        action: 'skipped',
                        reason: 'private_account',
                        message: 'Conta privada ignorada automaticamente',
                        username: cleanUsername
                    };
                }

                // REGRA 2: Pular contas verificadas - ZERO INTERAÇÃO
                if (profileInfo.isVerified) {
                    addConsoleLog('info', `✓ [IGNORADO] @${cleanUsername} - Conta Verificada (alto risco)`);
                    return {
                        success: true,  // SUCESSO no skip, não erro!
                        status: 'SKIPPED',
                        action: 'skipped',
                        reason: 'verified_account',
                        message: 'Conta verificada ignorada automaticamente',
                        username: cleanUsername
                    };
                }

                // REGRA 3: Pular contas sem foto de perfil - ZERO INTERAÇÃO
                const hasNoPicture = !profileInfo.avatar ||
                    profileInfo.avatar.includes('default') ||
                    profileInfo.avatar.includes('44884218_345707102882519');
                if (hasNoPicture) {
                    addConsoleLog('info', `📷 [IGNORADO] @${cleanUsername} - Sem Foto (possível fake)`);
                    return {
                        success: true,  // SUCESSO no skip, não erro!
                        status: 'SKIPPED',
                        action: 'skipped',
                        reason: 'no_profile_picture',
                        message: 'Conta sem foto ignorada automaticamente',
                        username: cleanUsername
                    };
                }

                addConsoleLog('success', `✅ [SEGURO] @${cleanUsername} - Perfil aprovado, executando ação...`);
            }
        } catch (safetyCheckError) {
            // Se não conseguir verificar, continuar com a ação (não bloquear por erro de verificação)
            console.warn('[E.I.O Safety] Erro ao verificar perfil:', safetyCheckError.message);
        }
    }

    const actionFunctions = {
        'follow': executeFollow,
        'unfollow': executeUnfollow,
        'viewStory': executeStoryInteract,
        'like_feed_2': executeLikeFeed2,
        'story_interact': executeStoryInteract,
        'comment': executeSmartComment,
        'dm': executeDM
    };

    const actionFn = actionFunctions[type];
    if (actionFn) {
        try {
            const result = await actionFn(target, payload);
            // Propagate inner function's success status — NEVER override with true
            const innerSuccess = result?.success !== undefined ? result.success : false;
            return { success: innerSuccess, meta: { target, time: new Date().toISOString(), success: innerSuccess, ...result } };
        } catch (e) {
            addConsoleLog('error', `Erro ao executar ${type}: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    addConsoleLog('warning', `Ação desconhecida: ${type}`);
    return { success: false, error: 'Unknown action' };
}

/**
 * ═══════════════════════════════════════════════════════════
 * FOLLOW VIA API DIRETA - NÃO PRECISA ABRIR PÁGINA!
 * Usa a API privada do Instagram para seguir sem navegar
 * ═══════════════════════════════════════════════════════════
 */
async function executeFollow(target) {
    const cleanTarget = target?.replace('@', '').toLowerCase();
    addConsoleLog('info', `🔄 Seguindo @${cleanTarget} via API...`);

    try {
        // Obter ID do usuário via API
        const userId = await getUserId(cleanTarget);

        if (!userId) {
            addConsoleLog('warning', `⚠️ Não foi possível obter ID de @${cleanTarget}`);
            return { success: false, error: 'user_id_not_found', username: cleanTarget };
        }

        addConsoleLog('info', `📡 ID obtido. Executando follow...`);

        // Executar follow via API
        const result = await apiFollow(userId);

        if (result.success) {
            addConsoleLog('success', `✅ Seguiu @${cleanTarget} via API!`);
            return { success: true, action: 'followed', username: cleanTarget, method: 'api' };
        } else if (result.status === 400 || result.message?.includes('following')) {
            addConsoleLog('info', `ℹ️ Já segue @${cleanTarget}`);
            return { success: true, action: 'already_following', username: cleanTarget };
        } else {
            addConsoleLog('warning', `⚠️ API retornou erro (${result.status}): ${result.message || 'desconhecido'}`);
            return { success: false, error: result.message || 'api_error', username: cleanTarget };
        }
    } catch (error) {
        addConsoleLog('error', `❌ Erro ao seguir @${cleanTarget}: ${error.message}`);
        return { success: false, error: error.message, username: cleanTarget };
    }
}

/**
 * Fallback: Follow via DOM (método antigo, só se API falhar)
 */
async function executeFollowViaDOM(target) {
    const cleanTarget = target?.replace('@', '').toLowerCase();

    // Verificar se estamos em uma lista (modal de seguidores)
    const dialog = document.querySelector('div[role="dialog"]');

    if (dialog) {
        // Estamos em uma lista - procurar o usuário
        const allItems = dialog.querySelectorAll('div[role="button"], li, div._aacl');

        for (const item of allItems) {
            const link = item.querySelector('a[href^="/"]');
            if (!link) continue;

            const href = link.getAttribute('href');
            const username = href?.replace(/\//g, '').toLowerCase();

            // Encontrou o usuário alvo?
            if (username === cleanTarget) {
                // Procurar o botão "Seguir" ao lado deste usuário
                const buttons = item.querySelectorAll('button');

                for (const btn of buttons) {
                    const btnText = btn.textContent.toLowerCase();
                    // Verificar se é botão de seguir (não "Seguindo", não "Solicitado")
                    if (btnText.includes('seguir') && !btnText.includes('seguindo') && !btnText.includes('solicitado')) {
                        btn.click();
                        await randomDelay(500, 800);
                        addConsoleLog('success', `✅ Seguiu @${cleanTarget} via DOM`);
                        return { success: true, action: 'followed', username: cleanTarget, method: 'dom' };
                    }
                    // Verificar em inglês também
                    if (btnText === 'follow') {
                        btn.click();
                        await randomDelay(500, 800);
                        addConsoleLog('success', `✅ Seguiu @${cleanTarget} via DOM`);
                        return { success: true, action: 'followed', username: cleanTarget, method: 'dom' };
                    }
                }

                // Verificar se já está seguindo
                for (const btn of buttons) {
                    const btnText = btn.textContent.toLowerCase();
                    if (btnText.includes('seguindo') || btnText.includes('following') || btnText.includes('solicitado') || btnText.includes('requested')) {
                        addConsoleLog('info', `ℹ️ Já segue @${cleanTarget}`);
                        return { success: true, action: 'already_following', username: cleanTarget };
                    }
                }

                addConsoleLog('warning', `⚠️ Botão "Seguir" não encontrado para @${cleanTarget}`);
                return { success: false, action: 'button_not_found' };
            }
        }

        addConsoleLog('warning', `⚠️ Usuário @${cleanTarget} não encontrado na lista visível`);
        return { success: false, action: 'user_not_in_list' };
    }

    // Fallback: se não estamos em uma lista, usar método do header (página do perfil)
    const followBtn = document.querySelector('header button');
    if (followBtn && !followBtn.textContent.toLowerCase().includes('seguindo')) {
        followBtn.click();
        await randomDelay(500, 1000);
        addConsoleLog('success', `✅ Seguiu ${target || 'perfil atual'} via header`);
        return { success: true, action: 'followed', method: 'header' };
    }
    return { success: true, action: 'already_following' };
}

/**
 * ═══════════════════════════════════════════════════════════
 * UNFOLLOW VIA API DIRETA - NÃO PRECISA ABRIR PÁGINA!
 * Usa a API privada do Instagram para deixar de seguir sem navegar
 * ═══════════════════════════════════════════════════════════
 */
async function executeUnfollow(target) {
    const cleanTarget = target?.replace('@', '').toLowerCase();
    addConsoleLog('info', `🔄 Deixando de seguir @${cleanTarget} via API...`);

    try {
        // Obter ID do usuário via API
        const userId = await getUserId(cleanTarget);

        if (!userId) {
            addConsoleLog('warning', `⚠️ Não foi possível obter ID de @${cleanTarget}`);
            return { success: false, error: 'user_id_not_found', username: cleanTarget };
        }

        addConsoleLog('info', `📡 ID obtido. Executando unfollow...`);

        // Executar unfollow via API
        const result = await apiUnfollow(userId);

        if (result.success) {
            addConsoleLog('success', `✅ Deixou de seguir @${cleanTarget} via API!`);
            return { success: true, action: 'unfollowed', username: cleanTarget, method: 'api' };
        } else {
            addConsoleLog('warning', `⚠️ API retornou erro (${result.status}): ${result.message || 'desconhecido'}`);
            return { success: false, error: result.message || 'api_error', username: cleanTarget };
        }
    } catch (error) {
        addConsoleLog('error', `❌ Erro ao deixar de seguir @${cleanTarget}: ${error.message}`);
        return { success: false, error: error.message, username: cleanTarget };
    }
}

/**
 * Fallback: Unfollow via DOM (método antigo)
 */
async function executeUnfollowViaDOM(target) {
    const cleanTarget = target?.replace('@', '').toLowerCase();

    // Primeiro, verificar se estamos na lista de "Seguindo"
    const dialog = document.querySelector('div[role="dialog"]');

    if (dialog) {
        // Estamos em uma lista (modal de seguindo/seguidores)
        const allItems = dialog.querySelectorAll('div[role="button"], li, div._aacl');

        for (const item of allItems) {
            const link = item.querySelector('a[href^="/"]');
            if (!link) continue;

            const href = link.getAttribute('href');
            const username = href?.replace(/\//g, '').toLowerCase();

            if (username === cleanTarget) {
                const buttons = item.querySelectorAll('button');

                for (const btn of buttons) {
                    const btnText = btn.textContent.toLowerCase();
                    if (btnText.includes('seguindo') || btnText.includes('following') || btnText.includes('requested')) {
                        btn.click();
                        await randomDelay(500, 800);

                        const confirmButtons = document.querySelectorAll('button');
                        for (const confirmBtn of confirmButtons) {
                            const text = confirmBtn.textContent.toLowerCase();
                            if (text.includes('deixar de seguir') || text.includes('unfollow')) {
                                confirmBtn.click();
                                await randomDelay(300, 500);
                                addConsoleLog('success', `✅ Deixou de seguir @${cleanTarget} via DOM`);
                                return { success: true, action: 'unfollowed', username: cleanTarget, method: 'dom' };
                            }
                        }

                        const dialogs = document.querySelectorAll('div[role="dialog"]');
                        for (const dlg of dialogs) {
                            const dlgButtons = dlg.querySelectorAll('button');
                            for (const dlgBtn of dlgButtons) {
                                const text = dlgBtn.textContent.toLowerCase();
                                if (text.includes('deixar de seguir') || text.includes('unfollow')) {
                                    dlgBtn.click();
                                    await randomDelay(300, 500);
                                    addConsoleLog('success', `✅ Deixou de seguir @${cleanTarget} via DOM`);
                                    return { success: true, action: 'unfollowed', username: cleanTarget, method: 'dom' };
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const followBtn = document.querySelector('header button');
    if (followBtn && followBtn.textContent.toLowerCase().includes('seguindo')) {
        followBtn.click();
        await randomDelay(500, 1000);
        const confirmBtn = document.querySelector('button[tabindex="0"]');
        if (confirmBtn && confirmBtn.textContent.toLowerCase().includes('deixar')) {
            confirmBtn.click();
            await randomDelay(300, 500);
        }
        addConsoleLog('success', `✅ Deixou de seguir ${target || 'perfil atual'} via header`);
        return { success: true, action: 'unfollowed', method: 'header' };
    }
    return { success: true, action: 'not_following' };
}

/**
 * Curte um post - Tenta via API primeiro, depois via DOM
 */
async function executeLike(target) {
    // Tentar encontrar mediaId no meta tag (se estivermos na página do post)
    let mediaId = null;
    const metaId = document.querySelector('meta[property="al:ios:url"]');
    if (metaId) {
        const content = metaId.getAttribute('content');
        const match = content.match(/id=(\d+)/);
        if (match) mediaId = match[1];
    }

    // Se não encontrou no meta, tentar em scripts do IG
    if (!mediaId) {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            if (s.textContent.includes('media_id')) {
                const match = s.textContent.match(/"media_id":"(\d+)"/);
                if (match) {
                    mediaId = match[1];
                    break;
                }
            }
        }
    }

    if (mediaId) {
        addConsoleLog('info', `📡 Curtindo via API (MediaID: ${mediaId})...`);
        const result = await apiLike(mediaId);
        if (result.success) {
            addConsoleLog('success', `❤️ Curtiu via API!`);
            return { success: true, action: 'liked', method: 'api', mediaId };
        }
    }

    // DOM clicks are silently blocked by IG anti-bot — do NOT trust them
    addConsoleLog('warning', '⚠️ Like via API falhou e DOM click não é confiável. Ação marcada como falha.');
    return { success: false, action: 'like_api_failed' };
}



/**
 * Comentário Inteligente via DOM Human Emulation (v4.7.8)
 * Simula digitação humana no campo de comentários e clique no botão Post.
 * Bypasses Shadow Block que descartava fetch API silenciosamente.
 */
async function executeSmartComment(target, payload) {
    const emojis = ['👍', '❤️', '🔥', '👏', '🚀', '🙌'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const textToComment = payload.comment || randomEmoji;

    addConsoleLog('info', `💬 [DOM] Comentando: "${textToComment}"...`);
    chrome.runtime.sendMessage({ action: 'log_progress', message: 'Comentando via DOM humano...' });

    try {
        // Locate comment input — Instagram uses multiple selectors
        const commentSelectors = [
            'textarea[aria-label="Adicione um comentário..."]',
            'textarea[aria-label="Add a comment…"]',
            'textarea[placeholder="Adicione um comentário..."]',
            'textarea[placeholder="Add a comment…"]',
            'form textarea',
            'textarea'
        ];

        let commentInput = null;
        for (const sel of commentSelectors) {
            commentInput = document.querySelector(sel);
            if (commentInput) break;
        }

        if (!commentInput) {
            addConsoleLog('warning', '⚠️ Campo de comentário não encontrado na página.');
            return { success: false, action: 'comment_input_not_found' };
        }

        // Click on the textarea to expand it (Instagram collapses it by default)
        await simulateHumanClick(commentInput);
        await randomDelay(300, 600);

        // Re-query after click (Instagram may replace the element upon focus)
        for (const sel of commentSelectors) {
            const refreshed = document.querySelector(sel);
            if (refreshed) { commentInput = refreshed; break; }
        }

        commentInput.focus();
        await randomDelay(200, 400);

        // Type the comment using human emulation
        await simulateHumanType(commentInput, textToComment);
        await randomDelay(500, 800);

        // Locate the Post / Publicar button
        const postButtonSelectors = [
            'div[role="button"][tabindex="0"]',
            'button[type="submit"]'
        ];

        let postButton = null;

        // Strategy 1: find by text content "Publicar" or "Post"
        const allButtons = document.querySelectorAll('button, div[role="button"], span[role="button"]');
        for (const btn of allButtons) {
            const txt = btn.textContent?.trim().toLowerCase();
            if (txt === 'publicar' || txt === 'post' || txt === 'postar') {
                postButton = btn;
                break;
            }
        }

        // Strategy 2: Submit button within the same form as the comment input
        if (!postButton) {
            const form = commentInput.closest('form');
            if (form) {
                postButton = form.querySelector('button[type="submit"]') ||
                             form.querySelector('div[role="button"]');
            }
        }

        if (!postButton) {
            addConsoleLog('warning', '⚠️ Botão Post/Publicar não encontrado.');
            return { success: false, action: 'post_button_not_found' };
        }

        // Click Post with human emulation
        await simulateHumanClick(postButton);

        // Wait minimum 2 seconds for IG internal scripts to register the action
        await randomDelay(2000, 3000);

        addConsoleLog('success', `💬 Comentário enviado via DOM: "${textToComment}"`);
        return { success: true, action: 'commented', text: textToComment, method: 'dom_human' };

    } catch (e) {
        addConsoleLog('error', `❌ Erro no comentário DOM: ${e.message}`);
        return { success: false, action: 'comment_exception', error: e.message };
    }
}

/**
 * Curte posts recentes do perfil alvo via DOM Human Emulation (v4.7.8)
 * Navega para o perfil, abre posts e clica no coração via simulateHumanClick.
 * Bypasses Shadow Block que descartava fetch API silenciosamente.
 */
async function executeLikeFeed2(target) {
    const cleanTarget = target?.replace('@', '').toLowerCase();
    addConsoleLog('info', `❤️ [DOM] Curtindo posts recentes de @${cleanTarget}...`);

    try {
        // 1. Navigate to the target profile if not already there
        const currentPath = window.location.pathname.replace(/\//g, '').toLowerCase();
        if (currentPath !== cleanTarget) {
            addConsoleLog('info', `📍 Navegando para perfil de @${cleanTarget}...`);
            window.location.href = `https://www.instagram.com/${cleanTarget}/`;
            await randomDelay(3000, 5000);
        }

        // 2. Find post thumbnails on the profile grid
        await randomDelay(1500, 2500);

        const postLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');

        if (postLinks.length === 0) {
            addConsoleLog('warning', `⚠️ @${cleanTarget} não tem posts visíveis no grid.`);
            return { success: true, action: 'no_posts', count: 0 };
        }

        const postsToLike = Array.from(postLinks).slice(0, 2);
        let likedCount = 0;

        for (let i = 0; i < postsToLike.length; i++) {
            const postLink = postsToLike[i];
            addConsoleLog('info', `❤️ Abrindo post ${i + 1}/${postsToLike.length}...`);
            chrome.runtime.sendMessage({ action: 'log_progress', message: `Curtindo post ${i + 1}/${postsToLike.length}...` });

            // Click to open the post modal
            await simulateHumanClick(postLink);
            await randomDelay(2000, 3000);

            // 3. Find the Like button (SVG heart) inside the opened post
            const likeSelectors = [
                'svg[aria-label="Curtir"]',
                'svg[aria-label="Like"]',
                'svg[aria-label="Amei"]'
            ];

            let likeButton = null;
            for (const sel of likeSelectors) {
                const svg = document.querySelector(sel);
                if (svg) {
                    likeButton = svg.closest('div[role="button"]') ||
                                 svg.closest('button') ||
                                 svg.closest('span[role="button"]') ||
                                 svg.parentElement;
                    break;
                }
            }

            if (likeButton) {
                // Click like with human emulation
                await simulateHumanClick(likeButton);

                // Wait minimum 2 seconds for IG to register the DOM change
                await randomDelay(2000, 3000);

                // Verify the like was registered (heart should become filled/red)
                const filledHeart = document.querySelector('svg[aria-label="Descurtir"], svg[aria-label="Unlike"]');
                if (filledHeart) {
                    likedCount++;
                    addConsoleLog('success', `❤️ Post ${i + 1} curtido com sucesso via DOM!`);

                    // Save a reference for the comment step (extract mediaId from URL)
                    const postUrl = window.location.href;
                    const mediaMatch = postUrl.match(/\/p\/([^/]+)/) || postUrl.match(/\/reel\/([^/]+)/);
                    if (mediaMatch) {
                        window._lastEioPostShortcode = mediaMatch[1];
                    }
                } else {
                    // It may already have been liked
                    const alreadyLiked = document.querySelector('svg[aria-label="Descurtir"], svg[aria-label="Unlike"]');
                    if (alreadyLiked) {
                        likedCount++;
                        addConsoleLog('info', `ℹ️ Post ${i + 1} já estava curtido.`);
                    } else {
                        addConsoleLog('warning', `⚠️ Like no post ${i + 1} não confirmado visualmente.`);
                    }
                }
            } else {
                addConsoleLog('warning', `⚠️ Botão de like (coração) não encontrado no post ${i + 1}.`);
            }

            // Close the post modal (press Escape or click X)
            const closeBtn = document.querySelector('svg[aria-label="Fechar"], svg[aria-label="Close"]');
            if (closeBtn) {
                const closeBtnParent = closeBtn.closest('div[role="button"]') || closeBtn.closest('button') || closeBtn.parentElement;
                if (closeBtnParent) await simulateHumanClick(closeBtnParent);
            } else {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }
            await randomDelay(1000, 1500);

            // Wait between likes
            if (i < postsToLike.length - 1) {
                addConsoleLog('info', '⏳ Aguardando 5s para próximo like...');
                await randomDelay(5000, 6000);
            }
        }

        return { success: likedCount > 0, action: 'liked_feed_2', count: likedCount, method: 'dom_human' };

    } catch (e) {
        addConsoleLog('error', `❌ Erro ao curtir feed de @${cleanTarget}: ${e.message}`);
        return { success: false, error: e.message };
    }
}

/**
 * Interage com Story (Visualizar + Like opcional) - v4.6.1 Refined
 */
async function executeStoryInteract(target) {
    addConsoleLog('info', `👁️ Buscando Stories de @${target}...`);
    chrome.runtime.sendMessage({ action: 'log_progress', message: 'Buscando Stories...' });

    // 1. Clicar na foto de perfil para abrir story
    const profilePic = document.querySelector('header canvas') ||
        document.querySelector('header span[role="link"]') ||
        document.querySelector('div[role="button"][aria-disabled="false"] canvas');

    // Verificar se tem anel de story (canvas geralmente indica isso ou borda colorida)
    // Método alternativo: verificar se a foto é clicável (button wrapper)
    const storyButton = profilePic?.closest('button') || profilePic?.closest('div[role="button"]');

    if (!storyButton) {
        addConsoleLog('info', 'ℹ️ Nenhum story disponível para interagir.');
        return { success: true, action: 'no_stories_found' }; // Não trava o combo
    }

    storyButton.click();
    addConsoleLog('info', '👁️ Abrindo Story...');
    await randomDelay(3000, 5000); // Esperar story carregar

    // 2. Procurar botão de curtir (Coração)
    // O seletor de like no story muda frequentemente. Geralmente é um SVG de coração.
    const likeStoryBtn = document.querySelector('svg[aria-label="Curtir"], svg[aria-label="Like"]')?.closest('div[role="button"]') ||
        document.querySelector('span svg[aria-label="Curtir"]')?.closest('span');

    if (likeStoryBtn) {
        addConsoleLog('info', '❤️ Curtindo Story...');
        chrome.runtime.sendMessage({ action: 'log_progress', message: 'Curtindo Story...' });

        likeStoryBtn.click();
        await randomDelay(1000, 2000);
        addConsoleLog('success', '✅ Story curtido!');

        // Fechar story (clicar no X ou voltar)
        const closeBtn = document.querySelector('svg[aria-label="Fechar"], svg[aria-label="Close"]')?.closest('div[role="button"]');
        if (closeBtn) closeBtn.click();
        else history.back();

        return { success: true, action: 'story_liked' };
    } else {
        addConsoleLog('warning', '⚠️ Botão de curtir story não encontrado ou já curtido.');
        // Tentar fechar mesmo assim
        const closeBtn = document.querySelector('svg[aria-label="Fechar"], svg[aria-label="Close"]')?.closest('div[role="button"]');
        if (closeBtn) closeBtn.click();
        else history.back();

        return { success: true, action: 'story_viewed_only' };
    }
}

/**
 * Envia Direct Message (DM) para um usuário
 * Funciona navegando para a página de mensagens e enviando
 */
async function executeDM(target, payload) {
    const cleanTarget = target?.replace('@', '');
    const message = payload?.message || payload?.text || payload?.options?.dmMessageTemplate || '';

    if (!message) {
        addConsoleLog('warning', '⚠️ Nenhuma mensagem definida para enviar');
        return { success: false, action: 'no_message' };
    }

    addConsoleLog('info', `✉️ Preparando DM para @${cleanTarget}...`);

    try {
        // Verificar se já estamos na página de DMs
        const currentUrl = window.location.href;

        if (currentUrl.includes('/direct/')) {
            // Já estamos nas DMs - procurar ou criar conversa
            return await sendDMInCurrentPage(cleanTarget, message);
        }

        // Se estamos no perfil do usuário, procurar botão de mensagem
        if (currentUrl.includes(`/${cleanTarget}`)) {
            const messageBtn = findMessageButton();
            if (messageBtn) {
                messageBtn.click();
                await randomDelay(2000, 3000);
                return await sendDMInCurrentPage(cleanTarget, message);
            }
        }

        // Navegar para DMs do usuário
        const dmUrl = `https://www.instagram.com/direct/t/${cleanTarget}/`;
        addConsoleLog('info', `📩 Navegando para DM de @${cleanTarget}...`);

        // Notificar background para navegar
        chrome.runtime.sendMessage({
            action: 'navigate',
            url: dmUrl
        });

        await randomDelay(3000, 4000);

        // Tentar enviar a mensagem
        return await sendDMInCurrentPage(cleanTarget, message);

    } catch (error) {
        addConsoleLog('error', `❌ Erro ao enviar DM: ${error.message}`);
        return { success: false, action: 'dm_error', error: error.message };
    }
}

/**
 * Encontra o botão de mensagem na página do perfil
 */
function findMessageButton() {
    const buttons = document.querySelectorAll('button, div[role="button"]');
    for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

        if (text.includes('mensagem') || text.includes('message') ||
            ariaLabel.includes('mensagem') || ariaLabel.includes('message')) {
            return btn;
        }
    }

    // Procurar pelo ícone de mensagem
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
        const parent = svg.closest('button, div[role="button"]');
        if (parent) {
            const ariaLabel = parent.getAttribute('aria-label')?.toLowerCase() || '';
            if (ariaLabel.includes('mensagem') || ariaLabel.includes('message')) {
                return parent;
            }
        }
    }

    return null;
}

/**
 * Envia mensagem na página de DMs atual
 */
async function sendDMInCurrentPage(target, message) {
    // Aguardar a página carregar
    await randomDelay(1000, 1500);

    // Procurar campo de texto da mensagem
    const messageInput = document.querySelector('textarea[placeholder*="Mensagem"], textarea[placeholder*="Message"]') ||
        document.querySelector('div[contenteditable="true"][role="textbox"]') ||
        document.querySelector('textarea');

    if (!messageInput) {
        addConsoleLog('warning', '⚠️ Campo de mensagem não encontrado');
        return { success: false, action: 'input_not_found' };
    }

    // Focar no campo
    messageInput.focus();
    await randomDelay(300, 500);

    // Personalizar mensagem com variáveis
    const personalizedMessage = personalizeMessage(message, target);

    // Digitar mensagem de forma humanizada (letra por letra)
    await typeHumanized(messageInput, personalizedMessage);

    await randomDelay(500, 800);

    // Procurar botão de enviar
    const sendBtn = document.querySelector('button[type="submit"]') ||
        document.querySelector('div[role="button"] svg[aria-label*="Enviar"]')?.closest('div[role="button"]') ||
        findSendButton();

    if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        await randomDelay(500, 800);
        addConsoleLog('success', `✅ DM enviada para @${target}!`);
        return { success: true, action: 'dm_sent', target };
    }

    // Se não encontrou botão, tentar Enter — MAS não confirmar sucesso
    messageInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await randomDelay(500, 800);

    addConsoleLog('warning', `⚠️ DM para @${target}: botão de enviar não encontrado, Enter pressionado mas não confirmado.`);
    return { success: false, action: 'dm_unconfirmed', target };
}

/**
 * Encontra o botão de enviar na página de DMs
 */
function findSendButton() {
    const allButtons = document.querySelectorAll('button, div[role="button"]');
    for (const btn of allButtons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text === 'enviar' || text === 'send') {
            return btn;
        }
    }
    return null;
}

/**
 * Personaliza mensagem com variáveis
 */
function personalizeMessage(message, target) {
    return message
        .replace(/\{\{nome\}\}/gi, target)
        .replace(/\{\{username\}\}/gi, target)
        .replace(/\{\{@\}\}/gi, `@${target}`)
        .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString('pt-BR'))
        .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
}

/**
 * Digita texto de forma humanizada (letra por letra)
 */
async function typeHumanized(element, text) {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const typeChar = async (char) => {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (element.getAttribute('contenteditable')) {
            element.textContent += char;
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
        }
        await randomDelay(50, 150);
    };

    const backspace = async () => {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = element.value.slice(0, -1);
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (element.getAttribute('contenteditable')) {
            element.textContent = element.textContent.slice(0, -1);
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
        }
        await randomDelay(100, 200);
    };

    // Mapeamento de "vizinhas" no teclado QWERTY para erros realistas
    const qwertyMap = {
        'a': 's', 's': 'd', 'd': 'f', 'f': 'g', 'g': 'h', 'h': 'j', 'j': 'k', 'k': 'l',
        'q': 'w', 'w': 'e', 'e': 'r', 'r': 't', 't': 'y', 'y': 'u', 'u': 'i', 'i': 'o',
        'z': 'x', 'x': 'c', 'c': 'v', 'v': 'b', 'b': 'n', 'n': 'm', 'm': 'n'
    };

    // Limpar
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        element.value = '';
    } else {
        element.textContent = '';
    }

    for (const char of text) {
        // 5% de chance de erro de digitação
        if (Math.random() < 0.05 && qwertyMap[char.toLowerCase()]) {
            const wrongChar = qwertyMap[char.toLowerCase()];
            await typeChar(wrongChar); // Digita errado
            await randomDelay(200, 500); // "Ops, errei" reaction time
            await backspace(); // Apaga
            await randomDelay(50, 150); // Breve pausa
        }
        await typeChar(char); // Digita certo
    }
}


async function executeViewStory(target) {
    const storyRing = document.querySelector('canvas')?.closest('div[role="button"]');
    if (storyRing) {
        storyRing.click();
        addConsoleLog('success', `👁️ Visualizou story`);
        return { action: 'story_viewed' };
    }
    return { action: 'no_story' };
}

/**
 * Listener para mensagens da extensão
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('E.I.O Message Received:', message);
    if (!message.action) return;

    switch (message.action) {
        // Note: execute_extraction case is handled below with proper async handling

        case 'execute':
            executeInstagramAction(message.payload).then(sendResponse);
            return true;

        // v4.6.9 - CHECK FOLLOW-BACK via API (chamado pelo background)
        case 'check_followback':
            (async () => {
                try {
                    const targetUsername = message.username;
                    if (!targetUsername) {
                        sendResponse({ followsViewer: false, error: 'no_username' });
                        return;
                    }
                    const info = await getProfileInfoViaAPI(targetUsername);
                    sendResponse({
                        followsViewer: info?.followsViewer || false,
                        followedByViewer: info?.followedByViewer || false,
                        username: info?.username || targetUsername
                    });
                } catch (e) {
                    sendResponse({ followsViewer: false, error: e.message });
                }
            })();
            return true;

        case 'get_profile_info':
            sendResponse(getDetailedProfileInfo());
            return true;

        case 'get_detailed_profile':
            sendResponse(getDetailedProfileInfo());
            return true;

        case 'get_current_profile':
            const username = getCurrentProfileUsername();
            sendResponse({ success: !!username, username });
            return true;

        case 'check_modal_open':
            // Verificar se há um modal de seguidores/seguindo aberto
            const dialog = document.querySelector('div[role="dialog"]');
            let hasModal = false;
            let modalType = null;

            if (dialog) {
                // Verificar se é um modal de lista (seguidores/seguindo)
                // Seletor _aano é o padrão atual, mas tentamos outros por segurança
                const scrollContainer = dialog.querySelector('div._aano') ||
                    dialog.querySelector('div[style*="overflow-y: auto"]') ||
                    dialog.querySelector('div[style*="overflow-y: scroll"]') ||
                    dialog.querySelector('div[class*="x1n2onr6"]'); // Nova classe comum em alguns layouts

                // Verificar título também
                const titleEl = dialog.querySelector('h1') || dialog.querySelector('span[style*="font-weight: 600"]');
                const titleText = titleEl ? titleEl.textContent.toLowerCase() : '';

                // Se o usuário está pedindo check, e tem um dialog com scroll, assumimos que é útil
                if (scrollContainer) {
                    hasModal = true;
                    // Tentar detectar o tipo
                    if (titleText.includes('seguindo') || titleText.includes('following') || window.location.href.includes('/following')) {
                        modalType = 'following';
                    } else if (titleText.includes('curtidas') || titleText.includes('likes')) {
                        modalType = 'likes';
                    } else {
                        // Default fallback (Seguidores é o mais comum)
                        modalType = 'followers';
                    }
                    console.log(`[E.I.O] Modal detectado: ${modalType} via ${scrollContainer ? 'container' : 'titulo'}`);
                } else if (titleText.includes('seguidores') || titleText.includes('followers') || titleText.includes('seguindo') || titleText.includes('following')) {
                    // Tem titulo mas scroll pode estar escondido ou diferente
                    hasModal = true;
                    modalType = titleText.includes('seguindo') || titleText.includes('following') ? 'following' : 'followers';
                }
            }

            sendResponse({ hasModal, modalType });
            return true;

        case 'execute_extraction':
            // 🔥 CORREÇÃO CRÍTICA: Listener para extração que estava faltando
            (async () => {
                try {
                    console.log('[E.I.O] Recebido comando execute_extraction:', message.payload);
                    const result = await runExtractionFlow(message.payload);
                    sendResponse(result);
                } catch (error) {
                    console.error('[E.I.O] Erro na extração:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;

        case 'load_followers':
            (async () => {
                const username = message.username || getCurrentProfileUsername();
                const limit = message.limit || 200;
                if (!username) {
                    sendResponse({ success: false, error: 'Acesse um perfil primeiro' });
                    return;
                }
                const accounts = await loadFollowersViaAPI(username, limit);
                sendResponse({ success: true, accounts, count: accounts.length });
            })();
            return true;

        case 'load_following':
            (async () => {
                const username = message.username || getCurrentProfileUsername();
                const limit = message.limit || 200;
                if (!username) {
                    sendResponse({ success: false, error: 'Acesse um perfil primeiro' });
                    return;
                }
                const accounts = await loadFollowingViaAPI(username, limit);
                sendResponse({ success: true, accounts, count: accounts.length });
            })();
            return true;

        case 'get_loaded_accounts':
            sendResponse({ success: true, accounts: loadedAccounts, count: loadedAccounts.length });
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Inicialização
console.log('E.I.O Content Script v4.7.8 Ready!');

// ===== ÍCONE FLUTUANTE E CONTAINER INJETADO =====

/**
 * Cria o ícone flutuante que fica fixo na tela (usando o foguete oficial)
 */
function createFloatingIcon() {
    if (document.getElementById('eio-floating-icon')) return;

    const icon = document.createElement('div');
    icon.id = 'eio-floating-icon';
    icon.title = 'E.I.O - Decole seu Instagram! Clique para abrir/minimizar';

    // Usar a imagem oficial do foguete
    const rocketUrl = chrome.runtime.getURL('public/assets/official_brand_rocket.png');
    icon.innerHTML = `<img src="${rocketUrl}" alt="E.I.O" />`;

    icon.addEventListener('click', toggleMainContainer);
    document.body.appendChild(icon);
    console.log('E.I.O Floating Icon created with official rocket');
}

/**
 * Cria o container principal que será mostrado/escondido
 * Sem header adicional - usa apenas o popup.html que já tem seu próprio design
 */
function createMainContainer() {
    if (document.getElementById('eio-main-container')) return;

    const container = document.createElement('div');
    container.id = 'eio-main-container';

    // Apenas o iframe com o popup - sem header adicional
    container.innerHTML = `
        <iframe id="eio-popup-frame" src="${chrome.runtime.getURL('popup.html')}"></iframe>
    `;

    document.body.appendChild(container);
    console.log('E.I.O Main Container created');
}

/**
 * Alterna a visibilidade do container principal
 */
function toggleMainContainer() {
    const container = document.getElementById('eio-main-container');
    const icon = document.getElementById('eio-floating-icon');

    if (!container) {
        createMainContainer();
        setTimeout(() => {
            document.getElementById('eio-main-container').classList.add('visible');
            icon.classList.add('active');
        }, 50);
    } else {
        const isVisible = container.classList.contains('visible');
        container.classList.toggle('visible');
        icon.classList.toggle('active', !isVisible);
    }
}

/**
 * Atualiza o badge do ícone (ex: quantidade de ações na fila)
 */
function updateIconBadge(count) {
    const icon = document.getElementById('eio-floating-icon');
    if (!icon) return;

    let badge = icon.querySelector('.eio-icon-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'eio-icon-badge';
            icon.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : count;
    } else if (badge) {
        badge.remove();
    }
}

// Iniciar ícone flutuante quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFloatingIcon, 1000);
    });
} else {
    setTimeout(createFloatingIcon, 1000);
}

// Listener para atualização do badge via mensagem
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'update_badge') {
        updateIconBadge(message.count || 0);
    }
});

// ═══════════════════════════════════════════════════════════
// COMUNICAÇÃO COM O DASHBOARD (postMessage)
// Permite que o Explorador de Leads e outras features funcionem
// ═══════════════════════════════════════════════════════════

window.addEventListener('message', async (event) => {
    // Apenas processar mensagens do próprio site
    if (event.source !== window) return;

    const data = event.data;

    // Responder ping do dashboard (detecta se extensão está ativa)
    if (data?.type === 'EIO_PING') {
        window.postMessage({
            type: 'EIO_PONG',
            extensionId: chrome.runtime.id,
            version: '4.7.8'
        }, '*');
        return;
    }

    // Processar comandos do dashboard
    if (data?.type === 'EIO_COMMAND') {
        console.log('E.I.O Command received:', data);

        try {
            let response = { success: false };

            switch (data.action) {
                case 'exploreLeads':
                    // O dashboard pediu para explorar leads
                    // Isso só funciona se estivermos na página de seguidores/seguindo
                    const leads = await extractAccountsFromList();
                    response = {
                        success: leads.length > 0,
                        leads: leads,
                        count: leads.length
                    };
                    break;

                case 'getAccounts':
                    // Retorna as contas carregadas
                    const accounts = await extractAccountsFromList();
                    response = { success: true, accounts };
                    break;

                case 'executeAction':
                    // Executar uma ação específica
                    const result = await executeInstagramAction(data.payload);
                    response = { success: true, result };
                    break;

                default:
                    response = { success: false, error: 'Unknown command' };
            }

            window.postMessage({ type: 'EIO_RESPONSE', ...response }, '*');

        } catch (error) {
            window.postMessage({
                type: 'EIO_RESPONSE',
                success: false,
                error: error.message
            }, '*');
        }
    }
});

// Função para extrair contas da lista (seguidores/seguindo)
async function extractAccountsFromList() {
    const accounts = [];

    // Verificar se estamos em uma lista (modal de seguidores/seguindo)
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) {
        console.log('E.I.O: Nenhum modal de lista encontrado');
        return accounts;
    }

    // Procurar todos os itens da lista
    const scrollContainer = dialog.querySelector('div[style*="overflow"]') ||
        dialog.querySelector('ul') ||
        dialog;

    // Fazer scroll para carregar mais contas
    const items = scrollContainer.querySelectorAll('a[href^="/"]');
    console.log(`E.I.O: Encontrados ${items.length} links`);

    const processedUsernames = new Set();

    for (const link of items) {
        try {
            const href = link.getAttribute('href');
            if (!href || href === '/') continue;

            const username = href.replace(/\//g, '');
            if (!username || processedUsernames.has(username)) continue;

            // Extrair informações do item
            const container = link.closest('div[role="button"]') ||
                link.closest('li') ||
                link.parentElement?.parentElement;

            if (!container) continue;

            // ═══════════════════════════════════════════════════════════
            // EXTRAÇÃO ROBUSTA DE AVATAR - Múltiplos métodos
            // ═══════════════════════════════════════════════════════════
            let profilePic = '';
            let avatarImg = null;

            // Método 1: Procurar qualquer img com src válida no container
            const allImgs = container.querySelectorAll('img');
            for (const img of allImgs) {
                const src = img.src || img.getAttribute('src');
                if (src && (src.startsWith('http') || src.startsWith('data:image'))) {
                    // Preferir imagens com URLs do Instagram CDN
                    if (src.includes('cdninstagram') || src.includes('fbcdn') || src.includes('instagram')) {
                        profilePic = src;
                        avatarImg = img;
                        break;
                    }
                    // Aceitar qualquer imagem válida se ainda não temos
                    if (!profilePic) {
                        profilePic = src;
                        avatarImg = img;
                    }
                }
            }

            // Método 2: Verificar img no elemento link direto
            if (!profilePic) {
                const linkImg = link.querySelector('img');
                if (linkImg && linkImg.src) {
                    profilePic = linkImg.src;
                    avatarImg = linkImg;
                }
            }

            // Método 3: Background image
            if (!profilePic) {
                const divWithBg = container.querySelector('[style*="background-image"]');
                if (divWithBg) {
                    const bgStyle = divWithBg.style.backgroundImage;
                    const match = bgStyle.match(/url\(["']?([^"')]+)["']?\)/);
                    if (match) profilePic = match[1];
                }
            }

            // Método 4: Converter para Base64 se temos elemento img (resolve CORS)
            if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(avatarImg, 0, 0, 64, 64);
                    profilePic = canvas.toDataURL('image/jpeg', 0.7);
                    console.log(`[E.I.O] Avatar convertido para Base64: ${username}`);
                } catch (e) {
                    // Se falhar (CORS), manter a URL original
                    console.log(`[E.I.O] Fallback para URL original: ${username}`);
                }
            }

            // Log para debug
            if (!profilePic) {
                console.log(`[E.I.O] ⚠️ Sem avatar para: ${username}`);
            } else {
                console.log(`[E.I.O] ✅ Avatar encontrado para: ${username}`);
            }

            // Pegar o nome completo
            const spans = container.querySelectorAll('span');
            let fullName = '';
            spans.forEach(span => {
                const text = span.textContent?.trim();
                if (text && text !== username && !text.includes('Verificado')) {
                    if (!fullName && text.length > 1) {
                        fullName = text;
                    }
                }
            });

            processedUsernames.add(username);
            accounts.push({
                username: username,
                fullName: fullName || username,
                profilePic: profilePic,
                avatar: profilePic, // Adicionar também como avatar para compatibilidade
                followers: 0,
                following: 0,
                posts: 0,
                bio: '',
                contact: ''
            });
        } catch (e) {
            console.log('Erro ao processar item:', e);
        }
    }

    console.log(`E.I.O: Extraídas ${accounts.length} contas com avatares`);
    return accounts;
}

// ═══════════════════════════════════════════════════════════
// FECHAR POPUPS AUTOMÁTICOS DO INSTAGRAM
// Detecta e fecha popups de notificações, cookies, login, etc.
// ═══════════════════════════════════════════════════════════

/**
 * Verificar se a opção está habilitada no storage
 */
async function isAutoClosePopupsEnabled() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['eioAppState'], (result) => {
            const config = result.eioAppState?.config || {};
            resolve(config.dismissNotifications !== false); // ativo por padrão
        });
    });
}

/**
 * Fechar popups automáticos do Instagram
 */
async function dismissInstagramPopups() {
    const enabled = await isAutoClosePopupsEnabled();
    if (!enabled) return;

    // Seletores para diferentes tipos de popups
    const popupSelectors = [
        // Popup de notificações "Ativar notificações?"
        'button:contains("Agora não")',
        'button:contains("Not Now")',
        'button[tabindex="0"]:contains("Agora")',

        // Botões de fechar padrão
        'div[role="dialog"] button[aria-label="Fechar"]',
        'div[role="dialog"] button[aria-label="Close"]',

        // Popup de cookies
        'button:contains("Aceitar")',
        'button:contains("Accept")',

        // Popup de login
        'button:contains("Agora não")',

        // Botão X genérico em dialogs
        'div[role="dialog"] svg[aria-label="Fechar"]',
        'div[role="dialog"] svg[aria-label="Close"]'
    ];

    // Função auxiliar para encontrar botão por texto
    function findButtonByText(texts) {
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const btnText = btn.textContent?.toLowerCase().trim();
            for (const text of texts) {
                if (btnText === text.toLowerCase()) {
                    return btn;
                }
            }
        }
        return null;
    }

    // Tentar fechar popup de notificações
    const notificationTexts = ['agora não', 'not now', 'ahora no'];
    const dismissBtn = findButtonByText(notificationTexts);

    if (dismissBtn) {
        console.log('[E.I.O] 🔕 Fechando popup de notificações automaticamente...');
        dismissBtn.click();
        addConsoleLog('info', '🔕 Popup de notificações fechado automaticamente');
        return true;
    }

    // Tentar fechar dialogs genéricos
    const dialogs = document.querySelectorAll('div[role="dialog"]');
    for (const dialog of dialogs) {
        // Verificar se é um popup de notificação/promoção (não modal de seguidores)
        const isNotificationPopup =
            dialog.textContent?.includes('notificações') ||
            dialog.textContent?.includes('notifications') ||
            dialog.textContent?.includes('Ativar') ||
            dialog.textContent?.includes('Turn on');

        if (isNotificationPopup) {
            const closeBtn = dialog.querySelector('button[aria-label="Fechar"], button[aria-label="Close"]');
            if (closeBtn) {
                console.log('[E.I.O] 🔕 Fechando dialog de promoção...');
                closeBtn.click();
                addConsoleLog('info', '🔕 Dialog promocional fechado automaticamente');
                return true;
            }
        }
    }

    return false;
}

/**
 * Observador de mutações para detectar novos popups
 */
let popupObserver = null;

function startPopupObserver() {
    if (popupObserver) return; // Já está rodando

    popupObserver = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                // Aguardar um pouco para o popup renderizar completamente
                await new Promise(r => setTimeout(r, 500));
                await dismissInstagramPopups();
            }
        }
    });

    popupObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[E.I.O] 👁️ Observador de popups iniciado');
}

// Iniciar observador de popups
startPopupObserver();

// Executar verificação inicial após carregamento
setTimeout(async () => {
    await dismissInstagramPopups();
}, 2000);

console.log('E.I.O Content Script v4.7.8 - DOM Human Emulation active!');


