// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - CONFIG
// Configuração centralizada da API
// ═══════════════════════════════════════════════════════════

// Detectar ambiente automaticamente
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// URL da API baseada no ambiente
const API_BASE_URL = isProduction
    ? '/api/v1'
    : 'http://localhost:3000/api/v1';

// URL do WebSocket
const WS_URL = isProduction
    ? 'https://eio-system.vercel.app'
    : 'http://localhost:3000';

// Exportar configurações
window.EIO_CONFIG = {
    API_BASE_URL,
    WS_URL,
    isProduction
};

console.log('🔧 E.I.O Config:', window.EIO_CONFIG);
