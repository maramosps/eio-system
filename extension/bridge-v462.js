/**
 * E.I.O BRIDGE v4.4.26 - ACTIVE HANDSHAKE PROTOCOL
 * Garante conexão bidirecional imediata Dashboard <-> Extensão
 */
const eid = chrome.runtime.id;
const VERSION = '4.6.2';

console.log(`%c[BRIDGE v${VERSION}] 🚀 Inicializando Ponte...`, "color: #39FF14; font-weight: bold;");

// 1. GRAVAÇÃO FÍSICA NO LOCALSTORAGE (FALBACK)
try {
    localStorage.setItem("eio_extension_id", eid);
    localStorage.setItem("eio_extension_version", VERSION);
    localStorage.setItem("eio_extension_connected", "true");
    localStorage.setItem("eio_last_sync", new Date().toISOString());
} catch (e) {
    console.warn("[BRIDGE] Falha ao escrever no localStorage (Sandbox?):", e);
}

// 2. DISPARO DE MENSAGEM DIRETA (CSP SAFE - NO INJECTION)
window.postMessage({
    type: 'EIO_EXTENSION_READY',
    detail: {
        id: eid,
        version: VERSION
    }
}, '*');

/* COMPATIBILIDADE LEGADA */
window.postMessage({
    type: 'EIO_HANDSHAKE_INIT',
    id: eid,
    version: VERSION
}, '*');

console.log(`%c[E.I.O EXTENSION v${VERSION}] 🟢 Detectada e Ativa via PostMessage!`, "color: #39FF14; font-weight: bold;");

// 3. LISTENERS DE MENSAGENS (DASHBOARD -> EXTENSÃO)
window.addEventListener("message", (event) => {
    // Apenas mensagens confiáveis da própria janela
    if (event.source !== window) return;

    // A. Recebimento de Token (Login no Dashboard)
    if (event.data?.type === "EIO_SEND_TOKEN" && event.data?.token) {
        console.log("%c[BRIDGE] 🔐 Recebendo Token de Autenticação...", "color: #00C8FF;");
        chrome.runtime.sendMessage({
            type: "SAVE_AUTH",
            payload: {
                userId: event.data.userId,
                token: event.data.token,
                email: event.data.email
            }
        }, (response) => {
            if (!chrome.runtime.lastError) {
                window.postMessage({ type: 'EIO_TOKEN_SAVED', success: true }, '*');
                console.log("%c[BRIDGE] ✅ Token sincronizado com Extensão!", "color: #39FF14; font-weight: bold;");
            }
        });
    }

    // B. Solicitação de Status (Ping do Dashboard - FORMATO ANTIGO)
    if (event.data?.type === "EIO_PING_EXTENSION") {
        console.log("[BRIDGE] 📡 Ping recebido do Dashboard, respondendo...");
        // Resposta imediata local
        window.postMessage({ type: 'EIO_PONG_EXTENSION', id: eid, version: VERSION }, '*');

        // Verifica status real no Background
        chrome.runtime.sendMessage({ type: 'EIO_HEARTBEAT_PING' }, (response) => {
            if (response) {
                window.postMessage({
                    type: 'EIO_STATUS_UPDATE',
                    payload: response
                }, '*');
            }
        });
    }

    // C. Solicitação de Status (Ping do Explorador de Leads - FORMATO NOVO)
    if (event.data?.type === "EIO_PING") {
        console.log("[BRIDGE] 📡 EIO_PING recebido (Explorador de Leads), respondendo EIO_PONG...");
        window.postMessage({ type: 'EIO_PONG', id: eid, extensionId: eid, version: VERSION }, '*');
    }
});

// 4. NOTIFICA O BACKGROUND QUE ESTAMOS EM UMA PÁGINA CONECTADA
chrome.runtime.sendMessage({
    type: 'bridge_connected',
    origin: window.location.origin,
    extensionId: eid
});

