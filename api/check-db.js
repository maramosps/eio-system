const path = require('path');
// Force load from root .env
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

const { checkConnection, getStatus, getConfigInfo } = require('./services/supabase');

async function run() {
    console.log('\n--- DIAGNOSTICO DE AMBIENTE ---');
    // Debug raw process.env to be absolutely sure
    console.log('SUPABASE_URL (in process.env):', process.env.SUPABASE_URL ? 'DEFINED' : 'MISSING');
    console.log('SUPABASE_URL (length):', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0);

    console.log('\n--- DIAGNOSTICO DO SERVICE ---');
    console.log('Service Config:', getConfigInfo());
    console.log('Service Status:', getStatus());

    console.log('\n--- TESTE DE CONEXÃO (LIBRARY) ---');
    const result = await checkConnection();
    console.log('Resultado do Teste:', result);

    if (result.ok) {
        console.log('\n✅ SUCESSO! Conexão com Supabase estabelecida via Library.');
        // Allow graceful exit
    } else {
        console.error('\n❌ FALHA: Não foi possível conectar via Library.');
        console.error('Erro:', result.message);
        process.exit(1);
    }
}

run();
