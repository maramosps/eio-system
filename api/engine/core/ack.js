/**
 * Engine Core: Processador de Confirmação (ACK)
 * Atualiza o estado do fluxo SOMENTE após confirmação de sucesso.
 */

const Flow = require('../strategies/flow');
const { logAction } = require('../services/logs');

async function processAck(userId, actionType, success, metadata, errorMessage) {
    if (!userId || !actionType) {
        throw new Error('UserId and ActionType are required for ACK');
    }

    const targetUsername = metadata?.targetUsername || metadata?.username;
    const usedDelay = metadata?.usedDelay;

    // Log da Tentativa de Execução
    await logAction(userId, actionType, {
        allowed: success,
        reason: success ? 'Action Executed Successfully' : `Execution Failed: ${errorMessage}`,
        riskLevel: success ? 'LOW' : 'MEDIUM'
    });

    if (!success) {
        // Se falhou, NÃO avança o fluxo.
        // O frontend deve tentar novamente a mesma ação ou pular se for erro crítico.
        return {
            status: 'error_recorded',
            shouldRetry: true, // Frontend decide se tenta de novo
            nextAction: actionType // Mantém a mesma ação pendente
        };
    }

    // Se SUCESSO, avança o estado no banco
    if (targetUsername) {
        const profileState = await Flow.getProfileState(userId, targetUsername);

        // Incrementar contador ou resetar se for nova etapa
        // Se a ação confirmada é a mesma do passo atual, incrementa count
        // Se for diferente (ex: mudou de passo), reseta count para 1
        // Lógica simplificada: Se sucesso, apenas registra o que foi feito. 
        // A decisão de qual PROXIMO passo é tomada no /decision.

        const currentCount = (profileState?.current_step === actionType) ? (profileState.actions_count || 0) + 1 : 1;

        await Flow.updateProfileState(userId, targetUsername, {
            current_step: actionType, // Define onde paramos
            actions_count: currentCount,
            last_action_type: actionType,
            last_delay_ms: usedDelay || 0,
            last_success_at: new Date().toISOString()
        });

        // Calcular próximo passo antecipadamente para retorno rápido
        const nextStep = Flow.determineNextAction(actionType, currentCount, { maxLikes: 3, viewStories: true });

        return {
            status: 'state_updated',
            nextAction: nextStep
        };
    }

    // Tratamento de Tarefas Agendadas (Scheduler)
    const taskId = metadata?.taskId || metadata?.actionId;
    if (taskId && Flow.updateTaskStatus) {
        // Nota: Flow.updateTaskStatus não existe, precisamos importar supabase ou criar service
        // Melhor usar service direto
        const supabase = require('../config/supabase');
        if (supabase) {
            await supabase.from('scheduled_actions')
                .update({
                    status: success ? 'executed' : 'failed',
                    updated_at: new Date().toISOString(),
                    // Se falhou, talvez incrementar retries? Por enquanto simples.
                })
                .eq('id', taskId);
        }
    }

    return { status: 'acknowledged' };
}

module.exports = {
    processAck
};
