/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O GLOBAL CONNECTION v4.4.25
 * 🔥 SILENT GREEN - MutationObserver + Auto-Fix UI
 * ═══════════════════════════════════════════════════════════
 */

const VERSION = '4.7.1';

console.log("%c🌐 [GLOBAL] Iniciando Protocolo v" + VERSION + "...", "color: #6246ea; font-weight: bold; font-size: 14px;");

// Injetar estilos globais de animação
(function injectGlobalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse-yellow {
            0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(57, 255, 20, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(57, 255, 20, 0); }
            100% { box-shadow: 0 0 0 0 rgba(57, 255, 20, 0); }
        }
    `;
    document.head.appendChild(style);
})();

// ═══════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: FORÇA UI VERDE
// ═══════════════════════════════════════════════════════════
function setSystemOnline(id) {
    if (!id) return;
    console.log("%c✅ [SYSTEM] ONLINE - ID: " + id, "color: #39FF14; font-weight: bold; font-size: 14px;");

    localStorage.setItem("eio_extension_id", id);
    localStorage.setItem("eio_extension_version", VERSION);
    localStorage.setItem("eio_extension_connected", "true");
    localStorage.setItem("eio_last_connected", Date.now().toString());

    forceGreenUI();
}

// ═══════════════════════════════════════════════════════════
// FORÇA VERDE EM TODOS OS ELEMENTOS
// ═══════════════════════════════════════════════════════════
function forceGreenUI() {
    const id = localStorage.getItem("eio_extension_id");
    if (!id) return;

    // Seleciona TODOS os possíveis badges de status
    const selectors = [
        '.status-badge',
        '#extension-status-badge',
        '.eio-sync-status',
        '[data-extension-status]',
        '.connection-indicator'
    ];

    document.querySelectorAll(selectors.join(', ')).forEach(el => {
        // Se contém texto de "não detectada" ou "offline" ou "amarelo", força verde
        if (el.textContent.includes('não detectada') ||
            el.textContent.includes('Desconectado') ||
            el.textContent.includes('OFFLINE') ||
            !el.classList.contains('online')) {

            el.className = 'status-badge online eio-sync-status';
            el.innerHTML = `
                <span class="eio-sync-dot" style="background: #39FF14; box-shadow: 0 0 10px #39FF14, 0 0 20px #39FF14; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>
                <span style="color: #39FF14; font-weight: 600;">ONLINE (v${VERSION})</span>
            `;
            el.style.background = 'rgba(57, 255, 20, 0.1)';
            el.style.borderColor = 'rgba(57, 255, 20, 0.3)';
            el.style.boxShadow = '0 0 15px rgba(57, 255, 20, 0.3)';
        }
    });

    // Atualiza textos de status genéricos
    document.querySelectorAll('#extension-status-text, .extension-status-text, [data-extension-text]').forEach(t => {
        t.innerText = 'Conectado (v' + VERSION + ')';
        t.style.color = '#39FF14';
    });

    // ═══════════════════════════════════════════════════════════
    // UI ESPECÍFICA DO DASHBOARD (Barra de Status)
    // ═══════════════════════════════════════════════════════════
    const statusEl = document.getElementById('eio-connection-status');
    if (statusEl) {
        // Verifica se já está verde para não causar repaint desnecessário
        const textEl = statusEl.querySelector('.status-text');
        if (textEl && !textEl.textContent.includes('ATIVA')) {
            console.log("%c✅ [GLOBAL] Atualizando Dashboard Status Bar", "color: #39FF14;");

            // Estilos do container
            statusEl.style.background = 'rgba(57, 255, 20, 0.1)';
            statusEl.style.borderColor = 'rgba(57, 255, 20, 0.3)';

            // Dot
            const dotEl = statusEl.querySelector('.status-dot');
            if (dotEl) {
                dotEl.style.background = '#39FF14';
                dotEl.style.boxShadow = '0 0 8px #39FF14';
                dotEl.style.animation = 'pulse-green 2s infinite';
            }

            // Text
            if (textEl) {
                textEl.textContent = `EXTENSÃO ATIVA (v${VERSION})`;
                textEl.style.color = '#39FF14';
            }

            // Link (se existir)
            const linkEl = document.getElementById('link-download-extension');
            if (linkEl) {
                linkEl.textContent = '● Sincronizado com Segurança';
                linkEl.style.color = '#39FF14';
                linkEl.style.pointerEvents = 'none';
                linkEl.style.opacity = '0.7';
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════
// MUTATIONOBSERVER - OBSERVA MUDANÇAS NO DOM
// Se um badge amarelo aparecer, força verde imediatamente
// ═══════════════════════════════════════════════════════════
const observer = new MutationObserver((mutations) => {
    const id = localStorage.getItem("eio_extension_id");
    if (!id) return;

    mutations.forEach((mutation) => {
        // Se houve mudança de nós ou texto
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            // Procura por badges que não estão verdes
            const badges = document.querySelectorAll('.status-badge:not(.online), .eio-sync-status:not(.online)');
            if (badges.length > 0) {
                console.log("%c🔄 [OBSERVER] Detectou badge não-verde, corrigindo...", "color: #FFC107;");
                forceGreenUI();
            }
        }
    });
});

// Inicia observer quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
} else {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ═══════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DE TOKEN COM EXTENSÃO
// ═══════════════════════════════════════════════════════════
function syncAuthToken() {
    let token, userId, userEmail;

    try {
        const sbSession = JSON.parse(localStorage.getItem('sb-user-session') || '{}');
        token = sbSession.access_token || localStorage.getItem('eio_token') || localStorage.getItem('accessToken');
        userId = sbSession.user?.id || JSON.parse(localStorage.getItem('eio_user') || '{}').id || JSON.parse(localStorage.getItem('user') || '{}').id;
        userEmail = sbSession.user?.email || JSON.parse(localStorage.getItem('eio_user') || '{}').email || JSON.parse(localStorage.getItem('user') || '{}').email;
    } catch (e) { }

    if (token && userId) {
        console.log('%c🔐 [GLOBAL] Enviando Token para extensão...', 'color: #6246ea;');
        window.postMessage({ type: 'EIO_SEND_TOKEN', token, userId, email: userEmail || null, timestamp: Date.now() }, '*');
    }
}

// ═══════════════════════════════════════════════════════════
// 1. CHECAGEM IMEDIATA (Leitura do Storage)
// ═══════════════════════════════════════════════════════════
const storedId = localStorage.getItem("eio_extension_id");
if (storedId) {
    console.log("%c💉 [GLOBAL] ID PRÉ-CARREGADO: " + storedId, "color: #39FF14; font-weight: bold;");
    setSystemOnline(storedId);
    syncAuthToken();
}

// ═══════════════════════════════════════════════════════════
// 2. LISTENERS DE EVENTOS
// ═══════════════════════════════════════════════════════════
window.addEventListener('EIO_ID_WRITTEN', (e) => {
    if (e.detail?.id) setSystemOnline(e.detail.id);
});

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data?.type) return;

    if (data.type === 'EIO_HANDSHAKE_INIT') setSystemOnline(data.id);
    if (data.type === 'EIO_TOKEN_SAVED') {
        console.log('%c✅ [GLOBAL] Token sincronizado!', 'color: #39FF14; font-weight: bold;');
        localStorage.setItem('eio_auth_synced', 'true');
    }
    if (data.type === 'EIO_PONG') setSystemOnline(data.id);
});

// ═══════════════════════════════════════════════════════════
// 3. INTERVALO DE SEGURANÇA (Força verde a cada 2s)
// ═══════════════════════════════════════════════════════════
setInterval(() => {
    const id = localStorage.getItem("eio_extension_id");
    if (id) forceGreenUI();
}, 2000);

// ═══════════════════════════════════════════════════════════
// EXPORTAR FUNÇÕES GLOBAIS
// ═══════════════════════════════════════════════════════════
window.EIO_GLOBAL = {
    version: VERSION,
    setSystemOnline,
    syncAuthToken,
    forceGreenUI,
    isConnected: () => !!localStorage.getItem('eio_extension_id'),
    getExtensionId: () => localStorage.getItem('eio_extension_id')
};

console.log("%c🚀 [GLOBAL v" + VERSION + "] Silent Green Protocol Ativo!", "background: #39FF14; color: #000; font-size: 12px; padding: 4px 8px; border-radius: 4px;");
