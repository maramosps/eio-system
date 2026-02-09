/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O GLOBAL CONNECTION v4.4.24
 * 🔥 DIRECT STORAGE INTEGRATION - ÚNICA FONTE DA VERDADE
 * ═══════════════════════════════════════════════════════════
 */

console.log("%c🌐 [GLOBAL] Iniciando Protocolo v4.4.24...", "color: #6246ea; font-weight: bold; font-size: 14px;");

function setSystemOnline(id) {
    if (!id) return;
    console.log("%c✅ [SYSTEM] Status Confirmado: ONLINE (ID: " + id + ")", "color: #39FF14; font-weight: bold; font-size: 14px;");

    localStorage.setItem("eio_extension_id", id);
    localStorage.setItem("eio_extension_version", "4.4.24");
    localStorage.setItem("eio_extension_connected", "true");
    localStorage.setItem("eio_last_connected", Date.now().toString());

    // ═══════════════════════════════════════════════════════════
    // FORÇA BRUTA - Atualiza TODOS os indicadores na tela
    // ═══════════════════════════════════════════════════════════
    const badges = document.querySelectorAll('.status-badge, #extension-status-badge, .eio-sync-status, [data-extension-status]');
    badges.forEach(b => {
        b.className = 'status-badge online eio-sync-status';
        b.innerHTML = `
            <span class="eio-sync-dot" style="background: #39FF14; box-shadow: 0 0 10px #39FF14, 0 0 20px #39FF14; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>
            <span style="color: #39FF14; font-weight: 600;">ONLINE (v4.4.24)</span>
        `;
        b.style.background = 'rgba(57, 255, 20, 0.1)';
        b.style.borderColor = 'rgba(57, 255, 20, 0.3)';
        b.style.boxShadow = "0 0 15px rgba(57, 255, 20, 0.3)";
    });

    const texts = document.querySelectorAll('#extension-status-text, .extension-status-text, [data-extension-text]');
    texts.forEach(t => {
        t.innerText = 'Conectado (v4.4.24)';
        t.style.color = '#39FF14';
    });

    // Disparar evento para outros scripts
    window.dispatchEvent(new CustomEvent('eio:extension:connected', {
        detail: { extensionId: id, version: '4.4.24', timestamp: Date.now() }
    }));

    // Sincroniza Token
    syncAuthToken();
}

// ═══════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DE TOKEN
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
// 1. CHECAGEM IMEDIATA (Leitura do Storage - A bridge já escreveu!)
// ═══════════════════════════════════════════════════════════
const storedId = localStorage.getItem("eio_extension_id");
if (storedId) {
    console.log("%c💉 [GLOBAL] ID PRÉ-CARREGADO DETECTADO!", "color: #39FF14; font-weight: bold;");
    setSystemOnline(storedId);
}

// ═══════════════════════════════════════════════════════════
// 2. ESCUTA EVENTO EIO_ID_WRITTEN (Injeção Direta da Bridge)
// ═══════════════════════════════════════════════════════════
window.addEventListener('EIO_ID_WRITTEN', (e) => {
    console.log("%c💉 [GLOBAL] Evento EIO_ID_WRITTEN recebido!", "color: #39FF14;");
    if (e.detail && e.detail.id) setSystemOnline(e.detail.id);
});

// ═══════════════════════════════════════════════════════════
// 3. ESCUTA HANDSHAKE VIA POSTMESSAGE (Backup)
// ═══════════════════════════════════════════════════════════
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'EIO_HANDSHAKE_INIT') {
        setSystemOnline(data.id);
    }
    if (data.type === 'EIO_TOKEN_SAVED') {
        console.log('%c✅ [GLOBAL] Token sincronizado!', 'color: #39FF14; font-weight: bold;');
        localStorage.setItem('eio_auth_synced', 'true');
    }
    if (data.type === 'EIO_PONG') {
        setSystemOnline(data.id);
    }
});

// ═══════════════════════════════════════════════════════════
// 4. PING DE REDUNDÂNCIA (Garante que UI fica atualizada)
// ═══════════════════════════════════════════════════════════
setInterval(() => {
    const currentId = localStorage.getItem("eio_extension_id");
    if (currentId) {
        // Re-aplica status a cada 2 segundos para evitar piscadas
        const badges = document.querySelectorAll('.status-badge, #extension-status-badge, .eio-sync-status');
        badges.forEach(b => {
            if (!b.classList.contains('online')) {
                setSystemOnline(currentId);
            }
        });
    }
}, 2000);

// ═══════════════════════════════════════════════════════════
// EXPORTAR FUNÇÕES GLOBAIS
// ═══════════════════════════════════════════════════════════
window.EIO_GLOBAL = {
    version: '4.4.24',
    setSystemOnline: setSystemOnline,
    syncAuthToken: syncAuthToken,
    isConnected: () => !!localStorage.getItem('eio_extension_id'),
    getExtensionId: () => localStorage.getItem('eio_extension_id')
};

console.log("%c🚀 [GLOBAL v4.4.24] Protocolo Ativo - Única Fonte da Verdade!", "background: #39FF14; color: #000; font-size: 12px; padding: 4px 8px; border-radius: 4px;");
