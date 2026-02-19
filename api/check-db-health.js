const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    try {
        // Inicializa o cliente Supabase sem lançar erros se as variáveis estiverem vazias (o próprio cliente lida ou lança erro na execução)
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            return res.status(500).json({
                status: '❌ Erro de Configuração',
                error: 'Variáveis de ambiente indefinidas',
                hint: 'Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no Vercel.'
            });
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        // Tenta fazer uma query simples
        const { data, error } = await supabase.from('action_logs').select('id').limit(1);

        if (error) {
            return res.status(500).json({
                status: '❌ Erro de Conexão',
                error: error.message,
                hint: 'Verifique se as chaves no painel da Vercel estão corretas.'
            });
        }

        return res.status(200).json({ status: '✅ Banco de Dados Online', sample: data });
    } catch (err) {
        return res.status(500).json({ status: '❌ Erro Crítico', error: err.message });
    }
};
