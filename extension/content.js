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

/**
 * Executar follow DIRETAMENTE NA LISTA (sem navegar para cada perfil)
 * Muito mais rápido e eficiente!
 */
async function executeFollow(target) {
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
                        addConsoleLog('success', `✅ Seguiu @${cleanTarget}`);
                        return { success: true, action: 'followed', username: cleanTarget };
                    }
                    // Verificar em inglês também
                    if (btnText === 'follow') {
                        btn.click();
                        await randomDelay(500, 800);
                        addConsoleLog('success', `✅ Seguiu @${cleanTarget}`);
                        return { success: true, action: 'followed', username: cleanTarget };
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
        addConsoleLog('success', `✅ Seguiu ${target || 'perfil atual'}`);
        return { success: true, action: 'followed' };
    }
    return { success: true, action: 'already_following' };
}

/**
 * Executar unfollow DIRETAMENTE NA LISTA (sem navegar para cada perfil)
 * Muito mais rápido e eficiente!
 */
async function executeUnfollow(target) {
    const cleanTarget = target?.replace('@', '').toLowerCase();

    // Primeiro, verificar se estamos na lista de "Seguindo"
    const dialog = document.querySelector('div[role="dialog"]');

    if (dialog) {
        // Estamos em uma lista (modal de seguindo/seguidores)
        // Procurar o usuário específico na lista
        const allItems = dialog.querySelectorAll('div[role="button"], li, div._aacl');

        for (const item of allItems) {
            const link = item.querySelector('a[href^="/"]');
            if (!link) continue;

            const href = link.getAttribute('href');
            const username = href?.replace(/\//g, '').toLowerCase();

            // Encontrou o usuário alvo?
            if (username === cleanTarget) {
                // Procurar o botão "Seguindo" ao lado deste usuário
                const buttons = item.querySelectorAll('button');

                for (const btn of buttons) {
                    const btnText = btn.textContent.toLowerCase();
                    if (btnText.includes('seguindo') || btnText.includes('following') || btnText.includes('requested')) {
                        // Clicar no botão "Seguindo"
                        btn.click();
                        await randomDelay(500, 800);

                        // Aguardar e clicar no botão de confirmação "Deixar de seguir"
                        await randomDelay(300, 500);

                        // O Instagram abre um menu/modal de confirmação
                        const confirmButtons = document.querySelectorAll('button');
                        for (const confirmBtn of confirmButtons) {
                            const text = confirmBtn.textContent.toLowerCase();
                            if (text.includes('deixar de seguir') || text.includes('unfollow')) {
                                confirmBtn.click();
                                await randomDelay(300, 500);
                                addConsoleLog('success', `✅ Deixou de seguir @${cleanTarget}`);
                                return { action: 'unfollowed', username: cleanTarget };
                            }
                        }

                        // Fallback: procurar no dialog que aparece
                        const dialogs = document.querySelectorAll('div[role="dialog"]');
                        for (const dlg of dialogs) {
                            const dlgButtons = dlg.querySelectorAll('button');
                            for (const dlgBtn of dlgButtons) {
                                const text = dlgBtn.textContent.toLowerCase();
                                if (text.includes('deixar de seguir') || text.includes('unfollow')) {
                                    dlgBtn.click();
                                    await randomDelay(300, 500);
                                    addConsoleLog('success', `✅ Deixou de seguir @${cleanTarget}`);
                                    return { action: 'unfollowed', username: cleanTarget };
                                }
                            }
                        }

                        addConsoleLog('warning', `⚠️ Clicou em Seguindo mas não encontrou confirmação para @${cleanTarget}`);
                        return { action: 'confirm_not_found' };
                    }
                }

                addConsoleLog('warning', `⚠️ Botão "Seguindo" não encontrado para @${cleanTarget}`);
                return { action: 'button_not_found' };
            }
        }

        addConsoleLog('warning', `⚠️ Usuário @${cleanTarget} não encontrado na lista visível`);
        return { action: 'user_not_in_list' };
    }

    // Fallback: se não estamos em uma lista, tentar o método antigo (página do perfil)
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

console.log('E.I.O Content Script v2.3.0 - Dashboard communication enabled!');
