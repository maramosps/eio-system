const { createClient } = require('@supabase/supabase-js');

// Verificar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: Variáveis de ambiente do Supabase não configuradas!');
    console.error('SUPABASE_URL:', supabaseUrl ? 'OK' : 'FALTANDO');
    console.error('SUPABASE_SERVICE_KEY:', supabaseKey ? 'OK' : 'FALTANDO');
    // Não usar process.exit() na Vercel - vai retornar erro 500 naturalmente
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    }
});

// Testar conexão
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            console.warn('⚠️ Aviso: Erro ao conectar com Supabase:', error.message);
            console.warn('   Verifique se as tabelas foram criadas (ver SUPABASE_SETUP.md)');
        } else {
            console.log('✅ Supabase conectado com sucesso');
        }
    } catch (err) {
        console.warn('⚠️ Aviso: Não foi possível testar conexão com Supabase');
    }
}

// Testar na inicialização
testConnection();

module.exports = supabase;
