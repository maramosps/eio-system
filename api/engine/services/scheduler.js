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

/**
 * Busca e bloqueia tarefas pendentes para execução (Dispatcher)
 */
async function getAndLockPendingActions(userId, limit = 1) {
    if (!supabase) return [];

    const now = new Date().toISOString();

    // 1. Buscar tarefas candidatas (Execute After <= Now AND Status = Pending)
    const { data: candidates, error: fetchError } = await supabase
        .from('scheduled_actions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lte('execute_after', now)
        .limit(limit);

    if (fetchError || !candidates || candidates.length === 0) {
        return [];
    }

    // 2. Tentar bloquear (Optimistic Locking via status update)
    // Para cada candidato, tentar mudar status para 'in_progress'
    const lockedTasks = [];

    for (const task of candidates) {
        const { data: updated, error: updateError } = await supabase
            .from('scheduled_actions')
            .update({ status: 'in_progress', updated_at: now })
            .eq('id', task.id)
            .eq('status', 'pending') // Garante que ninguém pegou antes
            .select()
            .single();

        if (updated && !updateError) {
            lockedTasks.push(updated);
        }
    }

    return lockedTasks;
}

module.exports = {
    scheduleAction,
    getAndLockPendingActions
};
