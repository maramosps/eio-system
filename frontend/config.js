// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - CONFIG
// Configuração centralizada da API e Supabase
// ═══════════════════════════════════════════════════════════

// Detectar ambiente automaticamente
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// ═══════════════════════════════════════════════════════════
// 📡 API CONFIGURATION
// ═══════════════════════════════════════════════════════════

// URL da API baseada no ambiente
const API_BASE_URL = isProduction
    ? '/api/v1'
    : 'http://localhost:3000/api/v1';

// URL do WebSocket
const WS_URL = isProduction
    ? 'https://eio-system.vercel.app'
    : 'http://localhost:3000';

// ═══════════════════════════════════════════════════════════
// 🗄️ SUPABASE CONFIGURATION (Frontend/Client-side)
// ═══════════════════════════════════════════════════════════
// NOTA: A ANON_KEY é SEGURA para uso no frontend.
// O Supabase usa Row Level Security (RLS) para proteger os dados.
// Operações privilegiadas devem passar pela API backend.
// Em produção futura, considere injetar via build process.

const SUPABASE_URL = 'https://zupnyvnrmwoyqajecxmm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc0MTUsImV4cCI6MjA4MjQzMzQxNX0.j_kNf6oUjY65DXIdIVtDKOHlkktlZvzqHuo_SlEzUvY';

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT GLOBAL CONFIG
// ═══════════════════════════════════════════════════════════

window.EIO_CONFIG = {
    // API
    API_BASE_URL,
    WS_URL,
    isProduction,

    // Supabase (Client-side, protegido por RLS)
    SUPABASE_URL,
    SUPABASE_ANON_KEY,

    // Versão do sistema (sincronizada com manifest.json)
    VERSION: '4.4.5',

    // Limites padrão
    LIMITS: {
        MAX_FOLLOWS_PER_DAY: 200,
        MAX_UNFOLLOWS_PER_DAY: 500,
        MAX_LIKES_PER_DAY: 300,
        MAX_COMMENTS_PER_DAY: 50,
        MIN_DELAY_SECONDS: 30,
        MAX_DELAY_SECONDS: 120
    },

    // WhatsApp de suporte
    SUPPORT_WHATSAPP: '5521975312662',

    // Preços
    PRICES: {
        EXTRA_SLOT: 150.00
    }
};

console.log('🔧 E.I.O Config v' + window.EIO_CONFIG.VERSION + ':', window.EIO_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
