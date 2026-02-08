/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O BRIDGE SCRIPT v4.4.23
 * Ponte de Injeção - Conexão Persistente (Ping/Pong)
 * 
 * A extensão SE INJETA no Dashboard (não o contrário).
 * Resolve o problema de ID dinâmico em instalações via ZIP.
 * Responde a chamados do Dashboard para evitar race conditions.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const extensionId = chrome.runtime.id;
    const VERSION = '4.4.23';

    console.log('%c[E.I.O BRIDGE v4.4.23] Tentando injetar ID: ' + extensionId, 'background: #222; color: #bada55; font-size: 12px; padding: 4px 8px;');
    console.log('%c[E.I.O BRIDGE] 🌉 Versão: ' + VERSION, 'color: #6246ea; font-weight: bold;');

    // ═══════════════════════════════════════════════════════════
    // 1. HANDSHAKE - Função para enviar ID ao Dashboard
    // ═══════════════════════════════════════════════════════════
    function sendHandshake() {
        window.postMessage({
            type: 'EIO_HANDSHAKE_INIT',
            id: extensionId,
            version: VERSION,
            timestamp: Date.now()
        }, '*');
        console.log('%c[E.I.O BRIDGE] ✅ Handshake enviado!', 'color: #39FF14;');
    }

    // ═══════════════════════════════════════════════════════════
    // 2. ENVIAR COM DELAY PARA GARANTIR QUE DOM EXISTE
    // ═══════════════════════════════════════════════════════════

    // Enviar imediatamente
    sendHandshake();

    // Enviar após 500ms (para garantir que scripts do Dashboard carregaram)
    setTimeout(sendHandshake, 500);

    // Enviar após 1 segundo (redundância máxima)
    setTimeout(sendHandshake, 1000);

    // Enviar após 2 segundos (caso o DOM demore)
    setTimeout(sendHandshake, 2000);

    // Enviar quando DOM carregar (redundância)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendHandshake);
    }

    // Enviar periodicamente para manter conexão (a cada 5 segundos)
    setInterval(sendHandshake, 5000);

    // ═══════════════════════════════════════════════════════════
    // 3. RESPONDER A PINGS DO DASHBOARD (Polling System)
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('message', (event) => {
        // Ignorar mensagens de outras origens
        if (event.source !== window) return;

        const data = event.data;
        if (!data || !data.type) return;

        // ───────────────────────────────────────────────────────
        // EIO_PING_EXTENSION - Dashboard perguntando "Quem está aí?"
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_PING_EXTENSION') {
            console.log('%c[E.I.O BRIDGE] 📡 Respondendo ao Ping do Dashboard', 'color: #6246ea;');
            sendHandshake();
        }

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
        // EIO_PING - Dashboard pedindo status (heartbeat)
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
    // 4. NOTIFICAR BACKGROUND QUE BRIDGE ESTÁ ATIVO
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

    console.log('%c[E.I.O BRIDGE] 🚀 Bridge v4.4.23 ativa - Sistema de Conexão Persistente!', 'color: #39FF14; font-weight: bold; font-size: 12px;');
})();
