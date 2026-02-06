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

// ═══════════════════════════════════════════════════════════
// CARREGAMENTO ROBUSTO DO DOTENV (Multi-path para Vercel/Monorepo)
// ═══════════════════════════════════════════════════════════
const path = require('path');

// Tentativa 1: Path relativo ao arquivo atual (src/services/ -> raiz)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Tentativa 2: Fallback para raiz do processo (Vercel)
if (!process.env.SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
}

// Tentativa 3: Fallback para pasta api (estrutura Vercel)
if (!process.env.SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
}

// Log para debug (remover depois)
console.log('[Supabase] .env load attempted from:', __dirname);
console.log('[Supabase] SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);

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
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ [E.I.O Supabase] ERRO CRÍTICO DE CONFIGURAÇÃO');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(`   Variáveis faltando: ${missing.join(', ')}`);
        console.error('');
        console.error('   📋 COMO RESOLVER:');
        console.error('   1. Acesse: https://vercel.com/seu-projeto/settings/environment-variables');
        console.error('   2. Adicione cada variável listada acima');
        console.error('   3. Faça redeploy do projeto');
        console.error('');
        console.error('   📖 Guia completo: docs/DEPLOY_GUIA.md');
        console.error('═══════════════════════════════════════════════════════════');

        if (IS_PRODUCTION) {
            // Em produção, NÃO lança erro - permite que o health check mostre o problema
            console.error('   ⚠️ Sistema em modo degradado - funcionalidades limitadas');
        } else {
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
