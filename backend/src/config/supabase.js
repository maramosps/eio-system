const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Verificar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: Variáveis de ambiente do Supabase não configuradas!');
    console.error('');
    console.error('Configure no arquivo .env:');
    console.error('  SUPABASE_URL=https://xxxxx.supabase.co');
    console.error('  SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    console.error('');
    console.error('Veja SUPABASE_SETUP.md para instruções completas');
    console.error('');
    process.exit(1);
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
