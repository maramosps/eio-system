/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O BRIDGE SCRIPT v4.4.24
 * 🔥 DIRECT STORAGE INJECTION - SOLUÇÃO NUCLEAR
 * 
 * PROBLEMA: Race condition fazia o status piscar verde->vermelho
 * SOLUÇÃO: Injetar script diretamente na página para gravar no 
 *          localStorage ANTES de qualquer outro código executar
 * ═══════════════════════════════════════════════════════════
 */

const extensionId = chrome.runtime.id;
const VERSION = '4.4.24';

console.log(`%c[BRIDGE v4.4.24] 🚀 Extensão Ativa. ID: ${extensionId}`, "color: #00ff00; font-weight: bold; font-size: 14px;");

// ═══════════════════════════════════════════════════════════
// 🔥 TÉCNICA DE INJEÇÃO DIRETA (Escrita no Storage)
// Injeta um script inline na página para gravar o ID IMEDIATAMENTE
// Isso acontece ANTES de qualquer script do site carregar
// ═══════════════════════════════════════════════════════════
const injectScript = document.createElement('script');
injectScript.textContent = `
    (function() {
        try {
            console.log("%c[DIRECT-INJECT v4.4.24] 💉 Gravando ID da Extensão no Storage...", "color: #39FF14; font-weight: bold;");
            
            // ESCRITA IMEDIATA NO LOCALSTORAGE
            localStorage.setItem("eio_extension_id", "${extensionId}");
            localStorage.setItem("eio_extension_version", "${VERSION}");
            localStorage.setItem("eio_extension_connected", "true");
            localStorage.setItem("eio_last_connected", Date.now().toString());
            
            console.log("%c[DIRECT-INJECT] ✅ ID GRAVADO COM SUCESSO: ${extensionId}", "color: #39FF14; font-weight: bold; font-size: 14px;");
            
            // Dispara evento customizado para avisar o site que o ID foi gravado
            window.dispatchEvent(new CustomEvent('EIO_ID_WRITTEN', { 
                detail: { 
                    id: "${extensionId}",
                    version: "${VERSION}",
                    timestamp: Date.now()
                } 
            }));
            
            // Também envia via postMessage para compatibilidade
            window.postMessage({
                type: 'EIO_HANDSHAKE_INIT',
                id: "${extensionId}",
                version: "${VERSION}",
                source: 'direct-inject',
                timestamp: Date.now()
            }, '*');
            
        } catch (e) { 
            console.error("[DIRECT-INJECT] ❌ Falha na injeção direta", e); 
        }
    })();
`;

// Injetar o mais cedo possível
(document.head || document.documentElement).appendChild(injectScript);
injectScript.remove(); // Limpar após execução

console.log('%c[BRIDGE v4.4.24] 💉 Injeção direta executada!', 'color: #39FF14;');

// ═══════════════════════════════════════════════════════════
// HANDSHAKES DE REDUNDÂNCIA (Backup do sistema de postMessage)
// ═══════════════════════════════════════════════════════════
function sendHandshake() {
    window.postMessage({
        type: 'EIO_HANDSHAKE_INIT',
        id: extensionId,
        version: VERSION,
        source: 'bridge-handshake',
        timestamp: Date.now()
    }, '*');
}

// Handshakes com delay para garantir que scripts do site carregaram
setTimeout(sendHandshake, 100);
setTimeout(sendHandshake, 500);
setTimeout(sendHandshake, 1000);
setTimeout(sendHandshake, 2000);

// Handshake quando DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendHandshake);
} else {
    sendHandshake(); // DOM já carregou
}

// Handshake periódico para manter conexão viva (a cada 5 segundos)
setInterval(sendHandshake, 5000);

// ═══════════════════════════════════════════════════════════
// LISTENER PARA RECEBER TOKEN DO DASHBOARD
// ═══════════════════════════════════════════════════════════
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || !data.type) return;

    // ───────────────────────────────────────────────────────
    // EIO_PING_EXTENSION - Dashboard perguntando "Quem está aí?"
    // ───────────────────────────────────────────────────────
    if (data.type === 'EIO_PING_EXTENSION') {
        console.log('%c[BRIDGE] 📡 Respondendo ao Ping', 'color: #6246ea;');
        sendHandshake();
    }

    // ───────────────────────────────────────────────────────
    // EIO_SEND_TOKEN - Dashboard enviando Token para salvar
    // ───────────────────────────────────────────────────────
    if (data.type === 'EIO_SEND_TOKEN' && data.token) {
        console.log('%c[BRIDGE] 🔐 Recebendo Token do Dashboard...', 'color: #39FF14;');

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
                console.error('[BRIDGE] ❌ Erro ao salvar:', chrome.runtime.lastError.message);
                return;
            }
            console.log('%c[BRIDGE] ✅ Token salvo com sucesso!', 'color: #39FF14; font-weight: bold;');

            // Confirmar para o Dashboard
            window.postMessage({
                type: 'EIO_TOKEN_SAVED',
                success: true,
                timestamp: Date.now()
            }, '*');
        });
    }

    // ───────────────────────────────────────────────────────
    // EIO_PING - Heartbeat
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
// NOTIFICAR BACKGROUND QUE BRIDGE ESTÁ ATIVO
// ═══════════════════════════════════════════════════════════
chrome.runtime.sendMessage({
    action: 'bridge_connected',
    type: 'bridge_connected',
    origin: window.location.origin,
    extensionId: extensionId,
    version: VERSION,
    timestamp: Date.now()
}).catch(() => {
    // Ignorar se background não responder
});

console.log('%c[BRIDGE v4.4.24] 🚀 DIRECT STORAGE INJECTION ATIVA!', 'color: #39FF14; font-weight: bold; font-size: 14px;');
