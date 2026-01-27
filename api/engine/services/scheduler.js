/**
 * Engine Scheduler Service
 * Gerencia o agendamento de ações futuras no Supabase.
 */

const supabase = require('../config/supabase');

async function scheduleAction(userId, actionType, targetUsername, executeAfterDate, payload = {}) {
    if (!supabase) return { success: false, error: 'DB not configured' };

    try {
        const { data, error } = await supabase
            .from('scheduled_actions')
            .insert({
                user_id: userId,
                target_username: targetUsername,
                action_type: actionType,
                payload: payload,
                execute_after: executeAfterDate,
                status: 'pending',
                retries: 0
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, scheduleId: data.id };
    } catch (err) {
        console.error('[Scheduler] Error:', err);
        return { success: false, error: err.message };
    }
}

async function getPendingActions() {
    if (!supabase) return [];

    // Buscar ações onde execute_after já passou e status é pendente
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('scheduled_actions')
        .select('*')
        .eq('status', 'pending')
        .lte('execute_after', now)
        .limit(50); // Processar em batches

    if (error) {
        console.error('[Scheduler] Fetch Error:', error);
        return [];
    }
    return data;
}

module.exports = {
    scheduleAction,
    getPendingActions
};
