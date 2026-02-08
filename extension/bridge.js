/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O BRIDGE SCRIPT v4.4.20
 * Ponte de Injeção - Conexão Inversa
 * 
 * A extensão SE INJETA no Dashboard (não o contrário).
 * Resolve o problema de ID dinâmico em instalações via ZIP.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const extensionId = chrome.runtime.id;
    const VERSION = '4.4.20';

    console.log('%c[E.I.O BRIDGE] 🌉 Injetando ID: ' + extensionId, 'color: #39FF14; font-weight: bold; font-size: 14px;');
    console.log('%c[E.I.O BRIDGE] Versão: ' + VERSION, 'color: #6246ea; font-weight: bold;');

    // ═══════════════════════════════════════════════════════════
    // 1. HANDSHAKE INICIAL - Avisa o Dashboard quem eu sou
    // ═══════════════════════════════════════════════════════════
    function sendHandshake() {
        window.postMessage({
            type: 'EIO_HANDSHAKE_INIT',
            id: extensionId,
            version: VERSION,
            timestamp: Date.now()
        }, '*');
    }

    // Enviar imediatamente
    sendHandshake();

    // Enviar quando DOM carregar (redundância)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendHandshake);
    } else {
        // DOM já carregado, enviar de novo após pequeno delay
        setTimeout(sendHandshake, 100);
    }

    // Enviar periodicamente para garantir conexão (a cada 3 segundos)
    setInterval(sendHandshake, 3000);

    // ═══════════════════════════════════════════════════════════
    // 2. LISTENER - Escuta o Dashboard mandar o Token de volta
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('message', (event) => {
        // Ignorar mensagens de outras origens
        if (event.source !== window) return;

        const data = event.data;
        if (!data || !data.type) return;

        // ───────────────────────────────────────────────────────
        // EIO_SEND_TOKEN - Dashboard enviando Token para salvar
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_SEND_TOKEN' && data.token) {
            console.log('%c[E.I.O BRIDGE] 🔐 Recebendo Token do Dashboard...', 'color: #39FF14;');
            console.log('[E.I.O BRIDGE] User ID:', data.userId);

            chrome.runtime.sendMessage({
                type: 'SAVE_AUTH',
                action: 'SAVE_AUTH',
                payload: {
                    userId: data.userId,
                    token: data.token,
                    email: data.email || null
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[E.I.O BRIDGE] ❌ Erro:', chrome.runtime.lastError.message);
                    return;
                }
                console.log('%c[E.I.O BRIDGE] ✅ Token salvo com sucesso!', 'color: #39FF14; font-weight: bold;');

                // Confirmar para o Dashboard
                window.postMessage({
                    type: 'EIO_TOKEN_SAVED',
                    success: true,
                    timestamp: Date.now()
                }, '*');
            });
        }

        // ───────────────────────────────────────────────────────
        // EIO_PING - Dashboard pedindo status
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_PING') {
            window.postMessage({
                type: 'EIO_PONG',
                id: extensionId,
                version: VERSION,
                status: 'connected',
                timestamp: Date.now()
            }, '*');
        }
    });

    // ═══════════════════════════════════════════════════════════
    // 3. NOTIFICAR BACKGROUND QUE BRIDGE ESTÁ ATIVO
    // ═══════════════════════════════════════════════════════════
    chrome.runtime.sendMessage({
        action: 'bridge_connected',
        type: 'bridge_connected',
        origin: window.location.origin,
        extensionId: extensionId,
        version: VERSION,
        timestamp: Date.now()
    }).catch(() => {
        // Ignorar erro se background não responder imediatamente
    });

    console.log('%c[E.I.O BRIDGE] 🚀 Bridge v4.4.20 ativa e pronta!', 'color: #39FF14; font-weight: bold; font-size: 12px;');
})();
