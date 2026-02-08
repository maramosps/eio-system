/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O GLOBAL CONNECTION v4.4.23
 * Núcleo de Conexão Universal - Compartilhado por TODAS as páginas
 * 
 * Este script é o "cérebro" de comunicação que conecta:
 * - Dashboard, Analytics, CRM, Settings, Admin, etc.
 * - Extensão via Bridge/Handshake
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const VERSION = '4.4.23';
    let isConnected = false;

    console.log('%c🌐 [GLOBAL CONNECTION] Iniciando Protocolo de Conexão Universal v' + VERSION,
        'background: #6246ea; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;');

    // ═══════════════════════════════════════════════════════════
    // FUNÇÃO PARA ATIVAR UI EM QUALQUER PÁGINA
    // ═══════════════════════════════════════════════════════════
    function setSystemOnline(id, version) {
        if (isConnected) return; // Evita múltiplas atualizações
        isConnected = true;

        console.log('%c✅ [GLOBAL] Sistema Conectado! ID: ' + id,
            'color: #39FF14; font-weight: bold; font-size: 14px;');

        localStorage.setItem('eio_extension_id', id);
        localStorage.setItem('eio_extension_version', version || VERSION);
        localStorage.setItem('eio_extension_connected', 'true');
        localStorage.setItem('eio_last_connected', Date.now().toString());

        // ═══════════════════════════════════════════════════════════
        // ATUALIZA TODOS OS INDICADORES DE STATUS NA TELA
        // ═══════════════════════════════════════════════════════════

        // Status Badge (padrão em várias páginas)
        const badges = document.querySelectorAll('.status-badge, #extension-status-badge, .eio-sync-status, [data-extension-status]');
        badges.forEach(badge => {
            badge.className = 'status-badge online eio-sync-status';
            badge.style.background = 'rgba(57, 255, 20, 0.1)';
            badge.style.borderColor = 'rgba(57, 255, 20, 0.3)';
            badge.style.boxShadow = '0 0 15px rgba(57, 255, 20, 0.2)';
            badge.innerHTML = `
                <span class="eio-sync-dot" style="background: #39FF14; box-shadow: 0 0 10px #39FF14, 0 0 20px #39FF14; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>
                <span style="color: #39FF14; font-weight: 600;">ONLINE (v${version || VERSION})</span>
            `;
        });

        // Texto de status
        const texts = document.querySelectorAll('#extension-status-text, .extension-status-text, [data-extension-text]');
        texts.forEach(text => {
            text.innerText = 'Conectado (v' + (version || VERSION) + ')';
            text.style.color = '#39FF14';
        });

        // Connection Indicator genérico
        const indicators = document.querySelectorAll('.connection-indicator, .ext-indicator');
        indicators.forEach(ind => {
            ind.classList.add('connected');
            ind.classList.remove('disconnected', 'offline');
        });

        // Disparar evento customizado para outros scripts
        window.dispatchEvent(new CustomEvent('eio:extension:connected', {
            detail: {
                extensionId: id,
                version: version || VERSION,
                timestamp: Date.now()
            }
        }));

        console.log('%c🌐 [GLOBAL] UI atualizada em todas as páginas!', 'color: #6246ea;');
    }

    // ═══════════════════════════════════════════════════════════
    // LISTENER UNIVERSAL - OUVE A BRIDGE
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('message', (event) => {
        // Apenas mensagens da própria janela
        if (event.source !== window) return;

        const data = event.data;
        if (!data || !data.type) return;

        // ───────────────────────────────────────────────────────
        // EIO_HANDSHAKE_INIT - Extensão se apresentando
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_HANDSHAKE_INIT') {
            console.log('%c🌉 [GLOBAL] Handshake recebido da extensão!', 'color: #39FF14;');
            setSystemOnline(data.id, data.version);

            // Sincroniza Token imediatamente
            syncAuthToken();
        }

        // ───────────────────────────────────────────────────────
        // EIO_TOKEN_SAVED - Extensão confirmou salvamento
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_TOKEN_SAVED') {
            console.log('%c✅ [GLOBAL] Token sincronizado com extensão!', 'color: #39FF14; font-weight: bold;');
            localStorage.setItem('eio_auth_synced', 'true');
            localStorage.setItem('eio_auth_synced_at', Date.now().toString());
        }

        // ───────────────────────────────────────────────────────
        // EIO_PONG - Resposta ao heartbeat
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_PONG') {
            setSystemOnline(data.id, data.version);
        }
    });

    // ═══════════════════════════════════════════════════════════
    // SINCRONIZAÇÃO DE TOKEN
    // ═══════════════════════════════════════════════════════════
    function syncAuthToken() {
        // Tentar buscar sessão do Supabase
        let session = {};
        try {
            const sbSession = localStorage.getItem('sb-user-session');
            session = JSON.parse(sbSession || '{}');
        } catch (e) { }

        // Fallback para tokens do E.I.O
        const token = session.access_token ||
            localStorage.getItem('eio_token') ||
            localStorage.getItem('accessToken');

        let userId, userEmail;
        try {
            userId = session.user?.id ||
                JSON.parse(localStorage.getItem('eio_user') || '{}').id ||
                JSON.parse(localStorage.getItem('user') || '{}').id;
            userEmail = session.user?.email ||
                JSON.parse(localStorage.getItem('eio_user') || '{}').email ||
                JSON.parse(localStorage.getItem('user') || '{}').email;
        } catch (e) { }

        if (token && userId) {
            console.log('%c🔐 [GLOBAL] Enviando Token para extensão...', 'color: #6246ea;');
            window.postMessage({
                type: 'EIO_SEND_TOKEN',
                token: token,
                userId: userId,
                email: userEmail || null,
                timestamp: Date.now()
            }, '*');
        } else {
            console.warn('[GLOBAL] ⚠️ Usuário não autenticado, token não enviado');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // RADAR ATIVO (POLLING) - GARANTE CONEXÃO
    // ═══════════════════════════════════════════════════════════
    let pollCount = 0;
    const MAX_POLLS = 20; // 20 x 1.5s = 30 segundos máximo

    const pollingInterval = setInterval(() => {
        const extensionId = localStorage.getItem('eio_extension_id');

        if (!extensionId && pollCount < MAX_POLLS) {
            pollCount++;
            console.log('%c📡 [GLOBAL] Procurando extensão... (' + pollCount + '/' + MAX_POLLS + ')', 'color: #888;');
            window.postMessage({ type: 'EIO_PING_EXTENSION', timestamp: Date.now() }, '*');
        } else if (extensionId) {
            console.log('%c✅ [GLOBAL] Extensão já conectada, parando polling', 'color: #39FF14;');
            clearInterval(pollingInterval);
        } else {
            console.log('%c⚠️ [GLOBAL] Extensão não encontrada após ' + MAX_POLLS + ' tentativas', 'color: #ff6b6b;');
            clearInterval(pollingInterval);

            // Mostrar status offline
            const badges = document.querySelectorAll('.status-badge, #extension-status-badge, .eio-sync-status');
            badges.forEach(badge => {
                badge.className = 'status-badge offline';
                badge.style.background = 'rgba(255, 107, 107, 0.1)';
                badge.style.borderColor = 'rgba(255, 107, 107, 0.3)';
                badge.innerHTML = `
                    <span style="color: #ff6b6b; font-weight: 600;">OFFLINE - Instale a Extensão</span>
                `;
            });
        }
    }, 1500);

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR CONEXÃO EXISTENTE AO CARREGAR
    // ═══════════════════════════════════════════════════════════
    const existingId = localStorage.getItem('eio_extension_id');
    const lastConnected = parseInt(localStorage.getItem('eio_last_connected') || '0');
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    // Se conectou há menos de 5 minutos, assumir ainda conectado
    if (existingId && lastConnected > fiveMinutesAgo) {
        console.log('%c🔄 [GLOBAL] Conexão recente detectada, restaurando UI...', 'color: #6246ea;');
        setSystemOnline(existingId, localStorage.getItem('eio_extension_version'));
    } else {
        // Limpar status antigo para forçar reconexão
        localStorage.removeItem('eio_extension_id');
        localStorage.removeItem('eio_extension_connected');
    }

    // ═══════════════════════════════════════════════════════════
    // EXPORTAR FUNÇÕES GLOBAIS
    // ═══════════════════════════════════════════════════════════
    window.EIO_GLOBAL = {
        version: VERSION,
        setSystemOnline: setSystemOnline,
        syncAuthToken: syncAuthToken,
        isConnected: () => isConnected,
        getExtensionId: () => localStorage.getItem('eio_extension_id')
    };

    console.log('%c🚀 [GLOBAL CONNECTION] Protocolo Universal v' + VERSION + ' ativo!',
        'background: #39FF14; color: #000; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
})();
