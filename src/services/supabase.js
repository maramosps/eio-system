/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O SYSTEM - SUPABASE CLIENT CENTRALIZADO
 * ═══════════════════════════════════════════════════════════
 * 
 * Este é o ÚNICO ponto de inicialização do Supabase no sistema.
 * Todos os outros arquivos devem importar daqui.
 * 
 * Exporta:
 *   - supabaseAdmin: Cliente com SERVICE_KEY (operações privilegiadas)
 *   - supabaseClient: Cliente com ANON_KEY (operações públicas/RLS)
 *   - checkConnection: Função para verificar saúde da conexão
 */

const { createClient } = require('@supabase/supabase-js');

// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE AMBIENTE
// ═══════════════════════════════════════════════════════════

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Variáveis obrigatórias
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// ═══════════════════════════════════════════════════════════
// VALIDAÇÃO DE CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════

function validateConfig() {
    const missing = [];

    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
    if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

    if (missing.length > 0) {
        const message = `❌ [Supabase] Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}`;

        if (IS_PRODUCTION) {
            console.error(message);
            console.error('   Configure as variáveis no Vercel Dashboard ou no arquivo .env');
            throw new Error(message);
        } else {
            console.warn(message);
            console.warn('   ⚠️ Modo desenvolvimento: Sistema pode não funcionar corretamente');
            console.warn('   💡 Copie .env.example para .env e preencha os valores');
        }
    }

    return missing.length === 0;
}

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO DOS CLIENTES
// ═══════════════════════════════════════════════════════════

let supabaseAdmin = null;
let supabaseClient = null;

const isConfigValid = validateConfig();

if (isConfigValid) {
    // Cliente Admin (SERVICE_KEY) - Para operações privilegiadas no backend
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Cliente Público (ANON_KEY) - Para operações com RLS
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: false
        }
    });

    console.log('✅ [Supabase] Clientes inicializados com sucesso');
    console.log(`   📍 URL: ${SUPABASE_URL.substring(0, 30)}...`);
    console.log(`   🔑 Admin: SERVICE_KEY configurada`);
    console.log(`   🔓 Client: ANON_KEY configurada`);
}

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE UTILIDADE
// ═══════════════════════════════════════════════════════════

/**
 * Verifica a saúde da conexão com o Supabase
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function checkConnection() {
    if (!supabaseAdmin) {
        return { ok: false, message: 'Cliente Supabase não inicializado' };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            return { ok: false, message: `Erro na query: ${error.message}` };
        }

        return { ok: true, message: 'Conexão OK' };
    } catch (err) {
        return { ok: false, message: `Exceção: ${err.message}` };
    }
}

/**
 * Retorna informações de configuração (sem expor chaves)
 * @returns {object}
 */
function getConfigInfo() {
    return {
        url: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NÃO CONFIGURADO',
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
        hasAnonKey: !!SUPABASE_ANON_KEY,
        isProduction: IS_PRODUCTION,
        isInitialized: !!supabaseAdmin
    };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
    supabaseAdmin,
    supabaseClient,
    checkConnection,
    getConfigInfo,
    // Alias para compatibilidade com código existente
    supabase: supabaseAdmin
};
