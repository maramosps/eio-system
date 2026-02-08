/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O BRIDGE SCRIPT v4.4.18
 * Ponte de Conexão entre Extensão e Dashboard
 * 
 * Este script é injetado pelo content_scripts no Dashboard
 * para informar o ID dinâmico da extensão instalada via ZIP.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const EXTENSION_ID = chrome.runtime.id;
    const VERSION = '4.4.18';

    console.log('[E.I.O Bridge] 🌉 Iniciando ponte de conexão...');
    console.log('[E.I.O Bridge] Extension ID:', EXTENSION_ID);

    // ═══════════════════════════════════════════════════════════
    // 1. HANDSHAKE INICIAL - Enviar ID para a página
    // ═══════════════════════════════════════════════════════════
    function sendHandshake() {
        window.postMessage({
            type: 'EIO_EXTENSION_HANDSHAKE',
            extensionId: EXTENSION_ID,
            version: VERSION,
            timestamp: Date.now()
        }, '*');
        console.log('[E.I.O Bridge] ✅ Handshake enviado para o Dashboard');
    }

    // Enviar imediatamente
    sendHandshake();

    // Enviar novamente quando DOM estiver pronto (redundância)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendHandshake);
    }

    // Enviar periodicamente para garantir conexão (a cada 5 segundos)
    setInterval(sendHandshake, 5000);

    // ═══════════════════════════════════════════════════════════
    // 2. RESPONDER A PINGS DO DASHBOARD
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('message', (event) => {
        // Ignorar mensagens de outras origens ou da própria extensão
        if (event.source !== window) return;

        const data = event.data;

        if (data.type === 'EIO_DASHBOARD_PING') {
            console.log('[E.I.O Bridge] 📡 Ping recebido do Dashboard, respondendo...');

            // Responder com pong
            window.postMessage({
                type: 'EIO_EXTENSION_PONG',
                extensionId: EXTENSION_ID,
                version: VERSION,
                status: 'connected',
                timestamp: Date.now()
            }, '*');
        }

        // Redirecionar comandos para o background script
        if (data.type === 'EIO_COMMAND' && data.command) {
            console.log('[E.I.O Bridge] 📨 Comando recebido:', data.command);

            chrome.runtime.sendMessage({
                action: data.command,
                payload: data.payload || {}
            }, (response) => {
                window.postMessage({
                    type: 'EIO_COMMAND_RESPONSE',
                    command: data.command,
                    response: response,
                    timestamp: Date.now()
                }, '*');
            });
        }
    });

    // ═══════════════════════════════════════════════════════════
    // 3. NOTIFICAR BACKGROUND QUE BRIDGE ESTÁ ATIVO
    // ═══════════════════════════════════════════════════════════
    chrome.runtime.sendMessage({
        action: 'bridge_connected',
        origin: window.location.origin,
        timestamp: Date.now()
    }).catch(() => {
        // Ignorar erro se background não responder
    });

    console.log('[E.I.O Bridge] 🚀 Ponte de conexão ativa!');
})();
