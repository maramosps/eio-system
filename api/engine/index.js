/**
 * Engine Entry Point - Serverless Function (Atualizado V3)
 * Retorna objeto padronizado V3.
 */
const { checkAction } = require('./core/decision');
const supabase = require('./config/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { userId, actionType, metadata } = req.body || {};

    try {
        let userPlan = 'free';
        let userStats = { dailyCount: 0 };

        if (supabase && userId) {
            const { data } = await supabase.from('subscriptions').select('plan').eq('user_id', userId).single();
            if (data) userPlan = data.plan;
        }

        const decision = await checkAction(userId, userPlan, userStats, actionType, metadata);

        return res.json({
            success: decision.allowed,
            ...decision
        });

    } catch (error) {
        console.error('[Engine API] Error:', error);
        return res.status(500).json({
            allowed: false,
            riskLevel: 'HIGH',
            reason: 'Internal Server Error'
        });
    }
};
