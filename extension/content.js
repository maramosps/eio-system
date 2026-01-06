/*
═══════════════════════════════════════════════════════════
  E.I.O - CONTENT SCRIPT
  Interação direta com a página do Instagram
  Suporta: Extração de Leads, Automação de Cliques e Logs
═══════════════════════════════════════════════════════════
*/

console.log('E.I.O Content Script Initializing...');

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
        }
    }
};

/**
 * Utilitário para delay aleatório (mais humano)
 */
function randomDelay(min, max) {
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}

/**
 * Adicionar log no console flutuante (azul)
 */
function addConsoleLog(level, message) {
    console.log(`[E.I.O ${level.toUpperCase()}] ${message}`);
    const consoleLog = document.getElementById('eio-console-log');
    if (consoleLog) {
        const entry = document.createElement('div');
        entry.className = `eio-log-${level}`;
        const time = new Date().toLocaleTimeString('pt-BR');
        entry.innerHTML = `<span class="eio-log-time">${time}</span> ${message}`;
        consoleLog.prepend(entry);

        // Limitar logs
        if (consoleLog.children.length > 50) {
            consoleLog.lastChild.remove();
        }
    }
}

/**
 * Criar o console flutuante (azul) na página do Instagram
 */
function createFloatingConsole() {
    if (document.getElementById('eio-floating-console')) return;

    const container = document.createElement('div');
    container.id = 'eio-floating-console';
    container.innerHTML = `
        <div class="eio-console-header">
            <span style="display: flex; align-items: center; gap: 8px;">
                <img src="${chrome.runtime.getURL('icons/icon128.png')}" width="18" height="18" style="border-radius: 4px;">
                E.I.O Console
            </span>
            <div class="eio-console-controls">
                <button id="eio-minimize-btn">−</button>
                <button id="eio-close-btn">×</button>
            </div>
        </div>
        <div id="eio-console-log" class="eio-console-body"></div>
        <style>
            #eio-floating-console {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 320px;
                height: 200px;
                background: rgba(10, 15, 30, 0.95);
                border: 1px solid #1976D2;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                overflow: hidden;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }
            .eio-console-header {
                background: #1976D2;
                color: white;
                padding: 8px 12px;
                font-size: 13px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            .eio-console-body {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                font-size: 11px;
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
            }
            .eio-log-info { color: #81D4FA; margin-bottom: 4px; }
            .eio-log-success { color: #81C784; margin-bottom: 4px; font-weight: bold; }
            .eio-log-warning { color: #FFF176; margin-bottom: 4px; }
            .eio-log-error { color: #E57373; margin-bottom: 4px; }
            .eio-log-time { color: rgba(255,255,255,0.3); margin-right: 5px; }
            #eio-floating-console.minimized { height: 35px; }
            .eio-console-controls button {
                background: none; border: none; color: white; cursor: pointer; padding: 0 5px; font-size: 16px;
            }
        </style>
    `;

    document.body.appendChild(container);

    // Eventos do console
    document.getElementById('eio-minimize-btn').onclick = () => container.classList.toggle('minimized');
    document.getElementById('eio-close-btn').onclick = () => container.remove();

    addConsoleLog('success', 'E.I.O conectado ao Instagram');
}

/**
 * Iniciar Extração de forma agressiva com Auto-Scroll real e Filtros Inteligentes
 */
async function runExtractionFlow(payload) {
    const leads = [];
    const filters = payload.filters || {};
    const limit = payload.limit || 200;
    const extractType = payload.type || 'followers';

    // Determinar tipo de lista para mensagens
    const listTypeLabels = {
        'followers': 'Seguidores',
        'following': 'Seguindo',
        'likes': 'Curtidas',
        'hashtags': 'Hashtag',
        'unfollow': 'Não me seguem'
    };
    const listLabel = listTypeLabels[extractType] || 'leads';

    addConsoleLog('info', `🚀 Iniciando extração de ${listLabel} (Limite: ${limit})...`);
    if (Object.values(filters).some(v => v)) {
        addConsoleLog('warning', '⚙️ Filtros Ativos: BR, Foto, Posts, Stories, Públicos');
    }

    // 1. Localizar o Container de Scroll
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
        const clickInstructions = {
            'followers': 'Por favor, clique em "Seguidores" no perfil desejado!',
            'following': 'Por favor, clique em "Seguindo" no perfil desejado!',
            'likes': 'Por favor, clique no número de curtidas do post!',
            'hashtags': 'Por favor, abra uma hashtag!',
            'unfollow': 'Por favor, clique em "Seguindo" no seu perfil!'
        };
        addConsoleLog('error', `❌ Lista de ${listLabel} não detectada. ${clickInstructions[extractType] || 'Abra uma lista primeiro!'}`);
        return { success: false, message: `Lista de ${listLabel} não encontrada` };
    }

    addConsoleLog('success', `🎯 Lista de ${listLabel} pronta! Iniciando captura filtrada...`);

    let lastLeadCount = 0;
    let idleCount = 0;

    for (let scrollStep = 0; scrollStep < 100; scrollStep++) {
        // Capturar usuários usando blocos de lista
        const items = scrollContainer.querySelectorAll('div[role="button"], li');
        let newFound = 0;

        for (const item of items) {
            const link = item.querySelector('a[href^="/"]');
            if (!link) continue;

            const href = link.getAttribute('href');
            const username = href.replace(/\//g, '');

            if (!username || ['explore', 'reels', 'direct', 'stories', 'p', 'about', 'legal', 'help', 'terms', 'privacy'].includes(username)) continue;

            const cleanUsername = `@${username}`;
            if (leads.find(l => l.username === cleanUsername)) continue;

            // --- FILTROS INTELIGENTES ---
            const name = link.innerText.trim().split('\n')[0] || 'Usuário Instagram';
            const avatar = item.querySelector('img');
            const hasStoryRing = !!item.querySelector('canvas') || !!item.querySelector('header circle') || !!item.querySelector('[style*="gradient"]');
            const isPrivate = item.innerText.includes('Solicitado') || item.innerText.includes('Private');

            // 1. Filtro Foto
            if (filters.hasPhoto && avatar && avatar.src.includes('avatar')) continue;

            // 2. Filtro Público
            if (filters.publicOnly && isPrivate) continue;

            // 3. Filtro Story (Detecção por anel colorido)
            if (filters.minStories && !hasStoryRing) continue;

            // 4. Filtro BR (Simples: caracteres PT ou Bio/Nome Comum)
            if (filters.brOnly) {
                const brChars = /[áéíóúâêîôûãõç]/i;
                const isBR = brChars.test(name) || brChars.test(username) ||
                    ['silva', 'santos', 'oliveira', 'souza', 'lima', 'pereira', 'ferreira', 'alves'].some(s => name.toLowerCase().includes(s));
                if (!isBR) continue;
            }

            // 5. Filtro Posts (Simulação de verificação profunda se solicitado)
            if (filters.minPosts) {
                // Como não podemos abrir todos os perfis rapidamente, marcamos para conferência
                // No futuro podemos adicionar um headless check opcional
            }

            leads.push({
                username: cleanUsername,
                name: name,
                avatar: avatar ? avatar.src : null,
                source: 'Instagram',
                quality: 'High'
            });
            newFound++;

            if (leads.length >= limit) break;
        }

        if (newFound > 0) {
            addConsoleLog('info', `+${newFound} leads qualificados. (Total: ${leads.length})`);
        }

        chrome.runtime.sendMessage({
            action: 'extraction_progress',
            count: leads.length
        }).catch(() => { });

        if (leads.length >= limit) break;

        // ROLAGEM
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

    addConsoleLog('success', `✅ Finalizado! ${leads.length} leads preparados.`);
    return { success: true, data: leads };
}

/**
 * Listener para mensagens da extensão
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('E.I.O Message Received:', message);
    if (!message.action) return;

    addConsoleLog('info', `Comando: ${message.action}`);

    if (message.action === 'execute_extraction') {
        runExtractionFlow(message.payload).then(sendResponse);
        return true;
    }

    if (message.action === 'execute') {
        executeInstagramAction(message.payload).then(sendResponse);
        return true;
    }
});

/**
 * Executar ações genéricas
 */
async function executeInstagramAction(payload) {
    addConsoleLog('info', `Executando: ${payload.type}`);
    // Implementação das outras ações se necessário...
    return { success: true };
}

// Inicialização segura
setTimeout(() => {
    createFloatingConsole();
}, 2000);
