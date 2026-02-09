/**
 * E.I.O BRIDGE v4.4.24 - DIRECT STORAGE INJECTION + DEBUG MODE
 */
const eid = chrome.runtime.id;

// GRAVAÇÃO FÍSICA NO LOCALSTORAGE (INFALÍVEL)
localStorage.setItem("eio_extension_id", eid);
localStorage.setItem("eio_extension_version", "4.4.24");
localStorage.setItem("eio_extension_connected", "true");
localStorage.setItem("eio_last_sync", new Date().toISOString());

console.log("%c[MS-DEBUG] EXTENSÃO DETECTADA: " + eid, "color: #39FF14; font-weight: bold; font-size: 14px;");
console.log("%c[BRIDGE v4.4.24] Storage gravado com sucesso!", "color: #00ff00; font-weight: bold;");

// 🚨 ALERTA VISUAL TEMPORÁRIO PARA O USUÁRIO (Bypass F12)
alert("✅ Extensão E.I.O v4.4.24 Detectada com Sucesso!\n\nID: " + eid + "\n\nO Dashboard deve ficar VERDE agora.");

// Injeta script na página para garantir que a UI atualize
const script = document.createElement('script');
script.textContent = `
    console.log("%c[DIRECT-INJECT v4.4.24] Atualizando UI...", "color: #39FF14; font-weight: bold;");
    localStorage.setItem("eio_extension_id", "${eid}");
    localStorage.setItem("eio_extension_version", "4.4.24");
    localStorage.setItem("eio_extension_connected", "true");
    window.dispatchEvent(new CustomEvent('EIO_ID_WRITTEN', { detail: { id: "${eid}", version: "4.4.24" } }));
    window.postMessage({ type: 'EIO_HANDSHAKE_INIT', id: "${eid}", version: "4.4.24" }, '*');
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
    if (event.data?.type === "EIO_PING_EXTENSION") {
        window.postMessage({ type: 'EIO_HANDSHAKE_INIT', id: eid, version: "4.4.24" }, '*');
    }
});

console.log("%c[BRIDGE v4.4.24] ✅ MODO DEBUG + DIRECT STORAGE ATIVO!", "color: #39FF14; font-weight: bold; font-size: 14px;");
