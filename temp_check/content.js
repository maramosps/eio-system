/*
═══════════════════════════════════════════════════════════
  E.I.O - CONTENT SCRIPT (ADVANCED VERSION)
  Interação direta com a página do Instagram
  Suporta: Extração de Leads, Automação, Obtenção de Dados
═══════════════════════════════════════════════════════════
*/

console.log('E.I.O Content Script v2.0 Initializing...');

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
    }
};

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

            // Check follow status
            const followBtn = item.querySelector('button');
            let followedByMe = false;
            let followsMe = false;

            if (followBtn) {
                const btnText = followBtn.textContent.toLowerCase();
                followedByMe = btnText.includes('seguindo') || btnText.includes('following');
            }

            // Check "Follows you" text
            if (item.innerText.includes('Segue você') || item.innerText.includes('Follows you')) {
                followsMe = true;
            }

            // Apply filters
            if (filters.hasPhoto && !avatarSrc) continue;
            if (filters.publicOnly && isPrivate) continue;
            if (filters.brOnly) {
                const brChars = /[áéíóúâêîôûãõç]/i;
                const isBR = brChars.test(name) || brChars.test(username) ||
                    ['silva', 'santos', 'oliveira', 'souza', 'lima', 'pereira', 'ferreira', 'alves'].some(s => name.toLowerCase().includes(s));
                if (!isBR) continue;
            }

            leads.push({
                username: cleanUsername,
                fullName: name,
                avatar: avatarSrc,
                bio: '',
                posts: null,
                followers: null,
                following: null,
                ratio: null,
                mutual: followedByMe && followsMe,
                followedByMe: followedByMe,
                followsMe: followsMe,
                isPrivate: isPrivate,
                isVerified: isVerified,
                hasStory: hasStoryRing,
                source: extractType
            });
            newFound++;

            if (leads.length >= limit) break;
        }

        if (newFound > 0) {
            addConsoleLog('info', `+${newFound} leads. (Total: ${leads.length})`);
        }

        chrome.runtime.sendMessage({
            action: 'extraction_progress',
            count: leads.length
        }).catch(() => { });

        if (leads.length >= limit) break;

        // Scroll
        scrollContainer.scrollTop += 600;
        await randomDelay(1500, 2500);

        if (leads.length === lastLeadCount) {
            idleCount++;
            if (idleCount > 5) break;
            scrollContainer.scrollTop -= 100;
            await randomDelay(800, 1200);
            scrollContainer.scrollTop += 200;
        } else {
            idleCount = 0;
            lastLeadCount = leads.length;
        }
    }

    addConsoleLog('success', `✅ Finalizado! ${leads.length} leads extraídos.`);
    return { success: true, data: leads };
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

async function executeFollow(target) {
    const followBtn = document.querySelector('header button');
    if (followBtn && !followBtn.textContent.toLowerCase().includes('seguindo')) {
        followBtn.click();
        await randomDelay(500, 1000);
        addConsoleLog('success', `✅ Seguiu ${target || 'perfil atual'}`);
        return { action: 'followed' };
    }
    return { action: 'already_following' };
}

async function executeUnfollow(target) {
    const followBtn = document.querySelector('header button');
    if (followBtn && followBtn.textContent.toLowerCase().includes('seguindo')) {
        followBtn.click();
        await randomDelay(500, 1000);
        // Click confirm on dialog
        const confirmBtn = document.querySelector('button[tabindex="0"]');
        if (confirmBtn && confirmBtn.textContent.toLowerCase().includes('deixar')) {
            confirmBtn.click();
            await randomDelay(300, 500);
        }
        addConsoleLog('success', `✅ Deixou de seguir ${target || 'perfil atual'}`);
        return { action: 'unfollowed' };
    }
    return { action: 'not_following' };
}

async function executeLike(target) {
    const likeBtn = document.querySelector('svg[aria-label="Curtir"]')?.closest('button');
    if (likeBtn) {
        likeBtn.click();
        addConsoleLog('success', `❤️ Curtiu post`);
        return { action: 'liked' };
    }
    return { action: 'like_not_found' };
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

async function executeDM(target, payload) {
    addConsoleLog('info', `✉️ DM para ${target} (implementação pendente)`);
    return { action: 'dm_queued' };
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
