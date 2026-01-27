/**
 * Engine Core: Decisor Central (Refatorado - Protocolo Rígido)
 * Orquestra Limites, Segurança, Fluxo e Agentes.
 */

const { checkLimits, GLOBAL_DM_LIMIT } = require('../strategies/limits');
const { checkSecurity, RISK_LEVELS } = require('../strategies/security');
const { needsAgentIntervention } = require('../strategies/agents');
const { logAction } = require('../services/logs');

// Importar Flow Strategy (Novo)
const Flow = require('../strategies/flow');

async function checkAction(userId, plan, currentStats, actionType, metadata) {
    if (!userId) {
        throw new Error('UserId is required');
    }

    const { targetUsername, currentFlowStep, flowCount } = metadata || {};
    let nextStep = actionType; // Default (caso não tenha fluxo)

    // ----------------------------------------------------
    // 1. Verificar Limites Globais (Prioridade Máxima)
    // ----------------------------------------------------
    const limitCheck = await checkLimits(plan, currentStats, actionType);
    if (!limitCheck.allowed) {
        await logAction(userId, actionType, limitCheck);
        return {
            allowed: false,
            delay: limitCheck.blockDuration || 0,
            reason: limitCheck.reason,
            riskLevel: limitCheck.riskLevel || 'HIGH',
            nextAction: null
        };
    }

    // ----------------------------------------------------
    // 2. Orquestração de Fluxo (Profile State)
    // ----------------------------------------------------
    let profileState = null;
    if (targetUsername) {
        profileState = await Flow.getProfileState(userId, targetUsername);

        // Determinar Próximo Passo
        if (profileState) {
            nextStep = Flow.determineNextAction(
                profileState.current_step || 'follow',
                profileState.actions_count || 0,
                { maxLikes: 3, viewStories: true } // Config padrão
            );
        } else {
            // Primeiro contato -> sempre follow
            nextStep = 'follow';
        }

        // Se a ação solicitada não for a esperada pelo fluxo -> Bloquear (Inconsistência)
        // Exceção: DMs de boas-vindas que são assíncronas
        if (actionType !== nextStep && actionType !== 'dm_welcome' && actionType !== 'switch_profile') {
            // Permitir se for a primeira vez (profileState null) e a ação for follow
            const isFirstAction = !profileState && actionType === 'follow';

            if (!isFirstAction) {
                return {
                    allowed: false,
                    reason: `Fluxo Inconsistente. Esperado: ${nextStep}, Recebido: ${actionType}`,
                    riskLevel: 'HIGH',
                    nextAction: nextStep,
                    resumeAt: new Date(Date.now() + 60000).toISOString() // Tente novamente em 1 min
                };
            }
        }
    }

    // ----------------------------------------------------
    // 3. Segurança e Delays (Com Anti-Repetição)
    // ----------------------------------------------------
    const lastDelay = profileState?.last_delay_ms || 0;
    const securityCheck = await checkSecurity(actionType, metadata?.settings, lastDelay);

    if (!securityCheck.allowed) {
        return {
            allowed: false,
            reason: securityCheck.reason,
            riskLevel: 'CRITICAL',
            nextAction: null
        };
    }

    // ----------------------------------------------------
    // 4. Scheduler (DMs de Boas-vindas)
    // ----------------------------------------------------
    let resumeAt = null;
    if (actionType === 'dm_welcome') {
        const welcomeDelay = securityCheck.delay; // 15-25 min
        resumeAt = new Date(Date.now() + welcomeDelay).toISOString();
        securityCheck.delay = 0; // A ação é agendada, não "esperar agora"
    }

    // ----------------------------------------------------
    // 5. Agentes IA (Opcional)
    // ----------------------------------------------------
    const agentCheck = await needsAgentIntervention(actionType, metadata?.messageContent);

    // ----------------------------------------------------
    // 6. Atualizar Estado do Perfil (Persistência)
    // ----------------------------------------------------
    // ----------------------------------------------------
    // 6. Atualizar Estado do Perfil (Persistência)
    // REMOVIDO: A atualização agora DEVE ocorrer apenas pós-execução (ACK)
    // para evitar dessincronia em caso de falha na extensão.
    // ----------------------------------------------------

    // ----------------------------------------------------
    // 7. Resposta Final Padronizada
    // ----------------------------------------------------
    const finalDecision = {
        allowed: true,
        delay: securityCheck.delay,
        nextAction: nextStep, // O que fazer DEPOIS dessa ação
        reason: 'Authorized via API Engine Protocol',
        riskLevel: securityCheck.riskLevel,
        resumeAt: resumeAt,
        agentSuggestion: agentCheck.intervention ? agentCheck.agent : null
    };

    // Logging (Assíncrono)
    logAction(userId, actionType, finalDecision).catch(console.error);

    return finalDecision;
}

module.exports = {
    checkAction
};
