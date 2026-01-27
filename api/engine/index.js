/**
 * Engine Entry Point - Serverless Function
 * Recebe chamadas da extensão/dashboard para validar ações.
 *
 * Rota esperada: POST /api/engine
 * Body: { userId: string, actionType: string, metadata: object }
 * Retorna: { allowed: boolean, delay: number, reason?: string, riskLevel?: string }
 */
const { checkAction } = require('./core/decision');
const supabase = require('./config/supabase'); // Usar o mesmo client para validar sessão

module.exports = async (req, res) => {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { userId, actionType, metadata } = req.body || {};

    // 2. Validação Básica
    if (!userId || !actionType) {
        return res.status(400).json({
            allowed: false,
            reason: 'Missing required fields: userId or actionType',
            riskLevel: 'LOW'
        });
    }

    try {
        // 3. Buscar contexto do usuário (Plano e Stats)
        // Isso seria idealmente buscado do Supabase aqui, mas
        // para manter performance, vamos aceitar no body se confiável,
        // ou buscar rapidamente no DB se necessário.
        // Simulando busca rápida ou usando metadata para MVP:

        let userPlan = 'free';
        let userStats = { dailyCount: 0, health: { strikes: 0 } };

        if (supabase) {
            const { data: userData } = await supabase
                .from('subscriptions')
                .select('plan, status')
                .eq('user_id', userId)
                .single();

            if (userData) {
                userPlan = userData.plan || 'free';
            }
        }

        // 4. Executar Engine de Decisão
        const decision = await checkAction(userId, userPlan, userStats, actionType, metadata);

        return res.json({
            success: true,
            allowed: decision.allowed,
            delay: decision.delay || 0,
            riskLevel: decision.riskLevel || 'LOW',
            warning: decision.warning || null,
            agentSuggestion: decision.agentSuggestion || null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Engine API] Error:', error);
        return res.status(500).json({
            allowed: false,
            reason: 'Internal Server Error',
            riskLevel: 'HIGH' // Fail-safe: Block action on error
        });
    }
};
