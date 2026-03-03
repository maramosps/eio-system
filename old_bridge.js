/**
 * E.I.O BRIDGE v4.4.24 - DIRECT STORAGE INJECTION
 */
const extensionId = chrome.runtime.id;
console.log(`%c[BRIDGE v4.4.24] ID: ${extensionId}`, "color: #00ff00; font-weight: bold;");

// INJEÇÃO DIRETA NO STORAGE (INFALÍVEL)
const script = document.createElement('script');
script.textContent = `
    console.log("%c[DIRECT] Gravando ID v4.4.24...", "color: #39FF14; font-weight: bold;");
    localStorage.setItem("eio_extension_id", "${extensionId}");
    localStorage.setItem("eio_extension_version", "4.4.24");
    localStorage.setItem("eio_extension_connected", "true");
    localStorage.setItem("eio_last_connected", Date.now().toString());
    window.dispatchEvent(new CustomEvent('EIO_ID_WRITTEN', { detail: { id: "${extensionId}", version: "4.4.24" } }));
    window.postMessage({ type: 'EIO_HANDSHAKE_INIT', id: "${extensionId}", version: "4.4.24" }, '*');
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

// Listener para salvar Token
window.addEventListener("message", (event) => {
    if (event.data?.type === "EIO_SEND_TOKEN" && event.data?.token) {
        console.log("%c[BRIDGE] Recebendo Token...", "color: #39FF14;");
        chrome.runtime.sendMessage({
            type: "SAVE_AUTH",
            action: "SAVE_AUTH",
            payload: { userId: event.data.userId, token: event.data.token, email: event.data.email }
        }, (response) => {
            if (!chrome.runtime.lastError) {
                window.postMessage({ type: 'EIO_TOKEN_SAVED', success: true }, '*');
            }
        });
    }
    // Responder a pings
    if (event.data?.type === "EIO_PING_EXTENSION") {
        window.postMessage({ type: 'EIO_HANDSHAKE_INIT', id: extensionId, version: "4.4.24" }, '*');
    }
});

console.log("%c[BRIDGE v4.4.24] ✅ Direct Storage Injection Ativa!", "color: #39FF14; font-weight: bold;");
