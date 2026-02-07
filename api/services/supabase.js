/**
 * ═══════════════════════════════════════════════════════════
 * E.I.O SYSTEM - SUPABASE CLIENT CENTRALIZADO (SAFE INIT)
 * ═══════════════════════════════════════════════════════════
 * 
 * Este é o ÚNICO ponto de inicialização do Supabase no sistema.
 * Todos os outros arquivos devem importar daqui.
 * 
 * PADRÃO SAFE INIT:
 * - NUNCA lança exceção na inicialização
 * - Permite servidor ligar mesmo sem chaves configuradas
 * - Rota /health pode diagnosticar problemas
 * 
 * Exporta:
 *   - supabase: Cliente principal (pode ser null se não configurado)
 *   - supabaseAdmin: Alias para supabase
 *   - supabaseClient: Cliente com ANON_KEY
 *   - getSupabase(): Função segura para obter cliente
 *   - getStatus(): Status de inicialização
 *   - checkConnection: Verificar saúde da conexão
 */

// ═══════════════════════════════════════════════════════════
// CARREGAMENTO ROBUSTO DO DOTENV (Multi-path para Vercel/Monorepo)
// ═══════════════════════════════════════════════════════════
const path = require('path');

// Tenta carregar de múltiplos paths (não lança erro se falhar)
try {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) { /* ignore */ }

if (!process.env.SUPABASE_URL) {
    try {
        require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
    } catch (e) { /* ignore */ }
}

if (!process.env.SUPABASE_URL) {
    try {
        require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
    } catch (e) { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════
// ESTADO DE INICIALIZAÇÃO (Safe State)
// ═══════════════════════════════════════════════════════════

const initStatus = {
    initialized: false,
    error: null,
    missingVars: [],
    timestamp: new Date().toISOString()
};

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
// VARIÁVEIS DOS CLIENTES (inicializadas como null)
// ═══════════════════════════════════════════════════════════

let supabaseAdmin = null;
let supabaseClient = null;

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO SEGURA (Safe Init - NUNCA lança exceção)
// ═══════════════════════════════════════════════════════════

function safeInitialize() {
    // Verificar variáveis obrigatórias
    if (!SUPABASE_URL) initStatus.missingVars.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) initStatus.missingVars.push('SUPABASE_SERVICE_KEY');
    if (!SUPABASE_ANON_KEY) initStatus.missingVars.push('SUPABASE_ANON_KEY');

    // Se faltar alguma variável, NÃO tenta criar cliente
    if (initStatus.missingVars.length > 0) {
        initStatus.error = `Variáveis de ambiente faltando: ${initStatus.missingVars.join(', ')}`;

        console.error('═══════════════════════════════════════════════════════════');
        console.error('⚠️ [E.I.O Supabase] INICIALIZAÇÃO EM MODO DEGRADADO');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(`   Variáveis faltando: ${initStatus.missingVars.join(', ')}`);
        console.error('');
        console.error('   📋 COMO RESOLVER:');
        console.error('   1. Acesse o Vercel Dashboard > Settings > Environment Variables');
        console.error('   2. Adicione cada variável listada acima');
        console.error('   3. Faça redeploy do projeto');
        console.error('');
        console.error('   📖 Guia: docs/DEPLOY_GUIA.md');
        console.error('   🔍 Diagnóstico: /api/health');
        console.error('═══════════════════════════════════════════════════════════');

        return false;
    }

    // Tentar criar clientes com try-catch (NUNCA lança para fora)
    try {
        const { createClient } = require('@supabase/supabase-js');

        // Cliente Admin (SERVICE_KEY)
        supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Cliente Público (ANON_KEY)
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: false
            }
        });

        initStatus.initialized = true;
        console.log('✅ [Supabase] Clientes inicializados com sucesso');
        console.log(`   📍 URL: ${SUPABASE_URL.substring(0, 30)}...`);

        return true;

    } catch (err) {
        // Captura QUALQUER erro de inicialização
        initStatus.error = `Erro ao criar cliente: ${err.message}`;
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ [E.I.O Supabase] ERRO NA CRIAÇÃO DO CLIENTE');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(`   Erro: ${err.message}`);
        console.error('   Verifique se as chaves estão corretas');
        console.error('═══════════════════════════════════════════════════════════');

        return false;
    }
}

// Executar inicialização segura
safeInitialize();

// ═══════════════════════════════════════════════════════════
// FUNÇÕES PÚBLICAS (Safe Access)
// ═══════════════════════════════════════════════════════════

/**
 * Retorna o cliente Supabase de forma segura
 * @returns {{ client: object|null, error: string|null }}
 */
function getSupabase() {
    if (supabaseAdmin) {
        return { client: supabaseAdmin, error: null };
    }
    return {
        client: null,
        error: initStatus.error || 'Cliente Supabase não inicializado'
    };
}

/**
 * Retorna o status de inicialização (para diagnóstico)
 * @returns {object}
 */
function getStatus() {
    return {
        initialized: initStatus.initialized,
        error: initStatus.error,
        missingVars: initStatus.missingVars,
        hasClient: !!supabaseAdmin,
        config: {
            url: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : null,
            hasServiceKey: !!SUPABASE_SERVICE_KEY,
            hasAnonKey: !!SUPABASE_ANON_KEY,
            nodeEnv: NODE_ENV
        }
    };
}

/**
 * Verifica a saúde da conexão com o Supabase
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function checkConnection() {
    if (!supabaseAdmin) {
        return {
            ok: false,
            message: initStatus.error || 'Cliente não inicializado'
        };
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
    // Clientes (podem ser null - verificar antes de usar)
    supabaseAdmin,
    supabaseClient,
    supabase: supabaseAdmin, // Alias para compatibilidade

    // Funções de acesso seguro
    getSupabase,
    getStatus,

    // Funções de utilidade
    checkConnection,
    getConfigInfo
};
