/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O BRIDGE SCRIPT v4.4.19
 * Ponte de Conexão + Sincronização de Autenticação
 * 
 * Este script é injetado pelo content_scripts no Dashboard
 * para informar o ID dinâmico da extensão instalada via ZIP
 * E receber o Token de autenticação do usuário.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const EXTENSION_ID = chrome.runtime.id;
    const VERSION = '4.4.19';

    console.log('[E.I.O Bridge] 🌉 Iniciando ponte de conexão v4.4.19...');
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
    // 2. LISTENER PRINCIPAL - Receber mensagens do Dashboard
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('message', (event) => {
        // Ignorar mensagens de outras origens
        if (event.source !== window) return;

        const data = event.data;
        if (!data || !data.type) return;

        // ───────────────────────────────────────────────────────
        // PING/PONG - Heartbeat do Dashboard
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_DASHBOARD_PING') {
            console.log('[E.I.O Bridge] 📡 Ping recebido do Dashboard, respondendo...');

            window.postMessage({
                type: 'EIO_EXTENSION_PONG',
                extensionId: EXTENSION_ID,
                version: VERSION,
                status: 'connected',
                timestamp: Date.now()
            }, '*');
        }

        // ───────────────────────────────────────────────────────
        // AUTH_SYNC - Receber Token do Dashboard e salvar na extensão
        // ───────────────────────────────────────────────────────
        if (data.type === 'EIO_AUTH_SYNC') {
            console.log('[E.I.O Bridge] 🔐 AUTH_SYNC recebido do Dashboard!');
            console.log('[E.I.O Bridge] User ID:', data.userId);
            console.log('[E.I.O Bridge] Token presente:', !!data.token);

            // Enviar para o background script salvar no chrome.storage
            chrome.runtime.sendMessage({
                action: 'SYNC_AUTH',
                userId: data.userId,
                token: data.token,
                email: data.email || null,
                timestamp: Date.now()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[E.I.O Bridge] ❌ Erro ao sincronizar auth:', chrome.runtime.lastError.message);
                    return;
                }
                console.log('[E.I.O Bridge] ✅ Auth sincronizado com sucesso!', response);

                // Confirmar de volta para o Dashboard
                window.postMessage({
                    type: 'EIO_AUTH_SYNC_CONFIRMED',
                    success: true,
                    timestamp: Date.now()
                }, '*');
            });
        }

        // ───────────────────────────────────────────────────────
        // COMMAND - Redirecionar comandos para o background script
        // ───────────────────────────────────────────────────────
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
        extensionId: EXTENSION_ID,
        version: VERSION,
        timestamp: Date.now()
    }).catch(() => {
        // Ignorar erro se background não responder
    });

    console.log('[E.I.O Bridge] 🚀 Ponte de conexão v4.4.19 ativa!');
})();
