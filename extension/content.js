/*
═══════════════════════════════════════════════════════════
  E.I.O - CONTENT SCRIPT (ADVANCED VERSION)
  Interação direta com a página do Instagram
  Suporta: Extração de Leads, Automação, Obtenção de Dados
  VERSÃO 3.2.0 - API DIRETA COM CARREGAMENTO VIA GRAPHQL
═══════════════════════════════════════════════════════════
*/

console.log('E.I.O Content Script v3.2.0 Initializing - FULL API MODE...');

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
    const match = path.match(/^\/([^\/]+)\/?$/);
    if (match && match[1] && !['explore', 'direct', 'accounts', 'p', 'reel', 'stories'].includes(match[1])) {
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
            addConsoleLog('success', `✅ ID obtido do DOM: ${domId}`);
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
                addConsoleLog('success', `✅ ID recuperado via Search: ${user.pk}`);
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

            } else {
                hasNext = false;
            }

            // Delay entre requisições
            if (hasNext && newFollowers.length < limit) {
                await randomDelay(1000, 2000);
            }

        } catch (error) {
            addConsoleLog('error', `❌ Erro: ${error.message}`);
            hasNext = false;
        }
    }

    const skippedTotal = totalLoaded - newFollowers.length;
    addConsoleLog('success', `✅ Carregados ${newFollowers.length} perfis novos! (${skippedTotal} já seguidos ignorados)`);

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
                // Log de debug para ver a estrutura (apenas no primeiro usuário)
                if (allFollowing.length === 0 && data.users[0]) {
                    console.log('[E.I.O DEBUG] Estrutura seguindo - primeiro usuário:', JSON.stringify(data.users[0], null, 2));
                }

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
            } else {
                hasNext = false;
            }

            // Delay entre requisições para evitar rate limit
            if (hasNext) await randomDelay(1000, 2000);

        } catch (error) {
            addConsoleLog('error', `❌ Erro ao carregar seguindo: ${error.message}`);
            hasNext = false;
        }
    }

    addConsoleLog('success', `✅ Total: ${allFollowing.length} seguindo carregados!`);
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
 * ═══════════════════════════════════════════════════════════
 * API DIRETA DO INSTAGRAM - FOLLOW SEM ABRIR PÁGINA
 * ═══════════════════════════════════════════════════════════
 */
async function apiFollow(userId) {
    try {
        const csrfToken = getCsrfToken();
        const response = await fetch(`https://www.instagram.com/api/v1/friendships/create/${userId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-IG-WWW-Claim': '0',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `user_id=${userId}&container_module=profile&nav_chain=`,
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok && (data.status === 'ok' || data.friendship_status)) {
            return { success: true, data };
        } else {
            return { success: false, status: response.status, message: data.message || 'Error' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * API DIRETA DO INSTAGRAM - UNFOLLOW SEM ABRIR PÁGINA
 */
async function apiUnfollow(userId) {
    try {
        const csrfToken = getCsrfToken();
        const response = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${userId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-IG-WWW-Claim': '0',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `user_id=${userId}&container_module=profile`,
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok && data.status === 'ok') {
            return { success: true, data };
        } else {
            return { success: false, status: response.status, message: data.message || 'Error' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * API DIRETA DO INSTAGRAM - LIKE SEM CLICAR
 */
async function apiLike(mediaId) {
    try {
        const csrfToken = getCsrfToken();
        const response = await fetch(`https://www.instagram.com/api/v1/web/likes/${mediaId}/like/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
                'X-IG-App-ID': config.api.xIgAppId,
                'X-ASBD-ID': config.api.xAsbdId,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `media_id=${mediaId}`,
            credentials: 'include'
        });

        const data = await response.json();
        return { success: data.status === 'ok', data };
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
                addConsoleLog('success', `✅ ID obtido: ${userId}`);
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

        // Header section
        const header = document.querySelector('header section');
        if (header) {
            // Full Name
            const nameEl = header.querySelector('span[style*="font-weight"]') || header.querySelector('h2');
            if (nameEl) info.fullName = nameEl.textContent.trim();

            // Avatar
            const avatarEl = document.querySelector('header img');
            if (avatarEl) info.avatar = avatarEl.src;

            // Stats (posts, followers, following)
            const statsEls = document.querySelectorAll('header section ul li');
            if (statsEls.length >= 3) {
                info.posts = parseCount(statsEls[0].textContent);
                info.followers = parseCount(statsEls[1].textContent);
                info.following = parseCount(statsEls[2].textContent);

                if (info.followers && info.following) {
                    info.ratio = parseFloat((info.followers / info.following).toFixed(2));
                }
            }

            // Bio
            const bioSection = header.querySelector('div > span');
            if (bioSection) info.bio = bioSection.textContent.trim();

            // Verified badge
            info.isVerified = !!header.querySelector('svg[aria-label="Verified"]');

            // Private account
            info.isPrivate = !!document.querySelector('h2:contains("This Account is Private")') ||
                document.body.innerText.includes('Esta conta é privada');

            // Follow button state
            const followBtn = header.querySelector('button');
            if (followBtn) {
                const btnText = followBtn.textContent.toLowerCase();
                info.followedByMe = btnText.includes('seguindo') || btnText.includes('following');
            }

            // Follows me (mutual)
            const followsText = document.body.innerText;
            info.followsMe = followsText.includes('Segue você') || followsText.includes('Follows you');

            // External URL
            const linkEl = header.querySelector('a[href*="l.instagram.com"]');
            if (linkEl) info.externalUrl = linkEl.href;

            // Business category
            const categoryEl = header.querySelector('div[style*="color: rgb(142, 142, 142)"]');
            if (categoryEl) info.businessCategory = categoryEl.textContent.trim();
        }
    } catch (e) {
        console.error('Error getting profile info:', e);
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

    // Localizar o Container de Scroll
    let scrollContainer = null;
    const dialog = document.querySelector('div[role="dialog"]');

    if (dialog) {
        addConsoleLog('info', 'Janela detectada...');
        const allDivs = dialog.querySelectorAll('div');
        for (const div of allDivs) {
            if (div.scrollHeight > div.clientHeight + 5) {
                const style = window.getComputedStyle(div);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    scrollContainer = div;
                    break;
                }
            }
        }
    }

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

    let lastLeadCount = 0;
    let idleCount = 0;

    for (let scrollStep = 0; scrollStep < 100; scrollStep++) {
        const items = scrollContainer.querySelectorAll('div[role="button"], li, div._aacl');
        let newFound = 0;

        for (const item of items) {
            const link = item.querySelector('a[href^="/"]');
            if (!link) continue;

            const href = link.getAttribute('href');
            const username = href.replace(/\//g, '');

            if (!username || ['explore', 'reels', 'direct', 'stories', 'p', 'about', 'legal', 'help', 'terms', 'privacy'].includes(username)) continue;

            const cleanUsername = `@${username}`;
            if (leads.find(l => l.username === cleanUsername)) continue;

            // Enviar progresso a cada 10 novos perfis para não sobrecarregar
            if (leads.length % 10 === 0) {
                chrome.runtime.sendMessage({
                    action: 'extraction_progress',
                    count: leads.length,
                    type: extractType
                }).catch(() => { }); // Ignorar se o popup estiver fechado
            }

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

            // APLICAR FILTROS
            if (extractType === 'followers') {
                // Se o objetivo é ganhar novos seguidores, ignorar quem já sigo ou quem já me segue
                if (isFollowing || isRequested || followsMe) {
                    continue;
                }
            } else if (extractType === 'following') {
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

            newFound++;
            if (leads.length >= limit) break;
        }

        if (leads.length >= limit) break;

        // SCROLL MAIS AGRESSIVO
        if (scrollContainer) {
            scrollContainer.scrollTop += 800;
            // Ás vezes o Instagram carrega placeholders, esperar mais
            await randomDelay(800, 1500);

            if (newFound === 0) {
                idleCount++;
                // Tente scrolar um pouco para cima e para baixo para destravar
                if (idleCount > 5) {
                    scrollContainer.scrollTop -= 200;
                    await randomDelay(500, 1000);
                    scrollContainer.scrollTop += 500;
                }
            } else {
                idleCount = 0;
            }
        }

        if (idleCount > 15) {
            addConsoleLog('warning', `⚠️ Parando scroll: Sem novos itens por 15 tentativas. (Total: ${leads.length})`);
            break;
        }
    }

    addConsoleLog('success', `✅ Extração finalizada: ${leads.length} contas coletadas.`);
    return leads;
}

/**
 * Executar ações no Instagram
 */
async function executeInstagramAction(payload) {
    const { type, target } = payload;

    const actionFunctions = {
        'follow': executeFollow,
        'unfollow': executeUnfollow,
        'like': executeLike,
        'comment': executeComment,
        'dm': executeDM,
        'viewStory': executeViewStory
    };

    const actionFn = actionFunctions[type];
    if (actionFn) {
        try {
            const result = await actionFn(target, payload);
            return { success: true, meta: { target, time: new Date().toISOString(), ...result } };
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

        addConsoleLog('info', `📡 ID obtido: ${userId}. Executando follow...`);

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

        addConsoleLog('info', `📡 ID obtido: ${userId}. Executando unfollow...`);

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

    // Fallback: Clique no botão do DOM
    const likeBtn = document.querySelector('svg[aria-label="Curtir"], svg[aria-label="Like"]')?.closest('button');
    if (likeBtn) {
        likeBtn.click();
        addConsoleLog('success', `❤️ Curtiu via DOM (clique)`);
        return { success: true, action: 'liked', method: 'dom' };
    }

    return { success: false, action: 'like_not_found' };
}

async function executeComment(target, payload) {
    const commentBox = document.querySelector('textarea[aria-label*="comentário"]');
    if (commentBox && payload.comment) {
        commentBox.focus();
        commentBox.value = payload.comment;
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));
        await randomDelay(300, 500);
        const postBtn = document.querySelector('button[type="submit"]');
        if (postBtn) postBtn.click();
        addConsoleLog('success', `💬 Comentou: "${payload.comment.substring(0, 20)}..."`);
        return { action: 'commented' };
    }
    return { action: 'comment_failed' };
}

/**
 * Envia Direct Message (DM) para um usuário
 * Funciona navegando para a página de mensagens e enviando
 */
async function executeDM(target, payload) {
    const cleanTarget = target?.replace('@', '');
    const message = payload?.message || payload?.text || '';

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

    // Se não encontrou botão, tentar Enter
    messageInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await randomDelay(500, 800);

    addConsoleLog('success', `✅ DM enviada para @${target} (via Enter)`);
    return { success: true, action: 'dm_sent', target };
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
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        // Para textarea/input normal
        element.value = '';
        for (const char of text) {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await randomDelay(30, 100); // Delay entre cada letra
        }
    } else if (element.getAttribute('contenteditable')) {
        // Para contenteditable (usado no Instagram moderno)
        element.textContent = '';
        for (const char of text) {
            element.textContent += char;
            element.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                inputType: 'insertText',
                data: char
            }));
            await randomDelay(30, 100);
        }
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
        case 'execute_extraction':
            runExtractionFlow(message.payload).then(sendResponse);
            return true;

        case 'execute':
            executeInstagramAction(message.payload).then(sendResponse);
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
                const scrollContainer = dialog.querySelector('div[style*="overflow"]') ||
                    dialog.querySelector('div._aano');

                if (scrollContainer) {
                    hasModal = true;
                    // Tentar detectar o tipo
                    if (window.location.href.includes('/followers')) {
                        modalType = 'followers';
                    } else if (window.location.href.includes('/following')) {
                        modalType = 'following';
                    }
                }
            }

            sendResponse({ hasModal, modalType });
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
console.log('E.I.O Content Script v2.0 Ready!');

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
            version: '2.3.0'
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

    items.forEach(link => {
        try {
            const href = link.getAttribute('href');
            if (!href || href === '/') return;

            const username = href.replace(/\//g, '');
            if (!username || processedUsernames.has(username)) return;

            // Extrair informações do item
            const container = link.closest('div[role="button"]') ||
                link.closest('li') ||
                link.parentElement?.parentElement;

            if (!container) return;

            // Pegar a foto de perfil
            const img = container.querySelector('img');
            const profilePic = img?.src || '';

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
                followers: 0,
                following: 0,
                posts: 0,
                bio: '',
                contact: ''
            });
        } catch (e) {
            console.log('Erro ao processar item:', e);
        }
    });

    console.log(`E.I.O: Extraídas ${accounts.length} contas`);
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

console.log('E.I.O Content Script v3.4.0 - Auto popup dismiss enabled!');

