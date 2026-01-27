// Serviço de Logs
// Centraliza logs no Supabase para auditoria
const supabase = require('../config/supabase.js');

async function logAction(userId, actionType, result) {
    if (!supabase) return; // Se não tiver DB configurado

    try {
        await supabase
            .from('action_logs')
            .insert({
                user_id: userId,
                action_type: actionType,
                allowed: result.allowed,
                reason: result.reason || null,
                delay_ms: result.delay || 0,
                risk_level: result.riskLevel || 'LOW',
                created_at: new Date().toISOString()
            });
    } catch (e) {
        console.error('[Engine] Erro ao gravar log:', e);
    }
}

module.exports = {
    logAction
};
