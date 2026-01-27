/**
 * Engine Core: Decisor Central (Refatorado V3 - Scheduler Integration)
 * Agora retorna o objeto padronizado com actionId e suporte a agendamento real.
 */

const { checkLimits, GLOBAL_DM_LIMIT } = require('../strategies/limits');
const { checkSecurity, RISK_LEVELS } = require('../strategies/security');
const { logAction } = require('../services/logs');
const { scheduleAction } = require('../services/scheduler');
const Flow = require('../strategies/flow');

async function checkAction(userId, plan, currentStats, actionType, metadata) {
    if (!userId) throw new Error('UserId is required');

    const { targetUsername, currentFlowStep } = metadata || {};
    let nextStep = actionType;
    let scheduleId = null;

    // 1. Limites
    const limitCheck = await checkLimits(plan, currentStats, actionType);
    if (!limitCheck.allowed) {
        await logAction(userId, actionType, limitCheck);
        return buildResponse(false, limitCheck.blockDuration || 0, null, null, limitCheck.reason, limitCheck.riskLevel || 'HIGH');
    }

    // 2. Fluxo
    let profileState = null;
    if (targetUsername) {
        profileState = await Flow.getProfileState(userId, targetUsername);
        if (profileState) {
            nextStep = Flow.determineNextAction(profileState.current_step || 'follow', profileState.actions_count || 0);
        } else {
            nextStep = 'follow';
        }

        // Validação de Sequência (Exceto DM Welcome e Switch)
        if (actionType !== nextStep && actionType !== 'dm_welcome' && actionType !== 'switch_profile') {
            const isFirst = !profileState && actionType === 'follow';
            if (!isFirst) {
                return buildResponse(false, 60000, nextStep, null, `Fluxo Inconsistente. Esperado: ${nextStep}`, 'HIGH');
            }
        }
    }

    // 3. Segurança (Delay)
    const lastDelay = profileState?.last_delay_ms || 0;
    const securityCheck = await checkSecurity(actionType, metadata?.settings, lastDelay);

    if (!securityCheck.allowed) {
        return buildResponse(false, 0, null, null, securityCheck.reason, 'CRITICAL');
    }

    // 4. Scheduler (DMs de Boas-vindas = Server Side Schedule)
    let resumeAt = null;
    let requiresAck = true;

    if (actionType === 'dm_welcome') {
        const welcomeDelay = securityCheck.delay;

        // AGENDAMENTO REAL NO SERVER
        const executeTime = new Date(Date.now() + welcomeDelay).toISOString();
        const schedResult = await scheduleAction(userId, actionType, targetUsername, executeTime, { message: metadata?.message });

        if (schedResult.success) {
            scheduleId = schedResult.scheduleId;
            resumeAt = executeTime;
            securityCheck.delay = 0; // Ação já tratada, frontend pode liberar a thread
            requiresAck = false; // Não precisa confirmar "Agora", pois foi agendado
        } else {
            return buildResponse(false, 0, null, null, 'Falha ao agendar ação', 'HIGH');
        }
    }

    // 5. Retorno Padronizado
    return {
        allowed: true,
        actionId: scheduleId || 'instant-exec', // Se agendado, retorna ID do agendamento
        nextAction: nextStep,
        delayMs: securityCheck.delay,
        scheduleAt: resumeAt,
        requiresAck: requiresAck,
        riskLevel: securityCheck.riskLevel,
        reason: 'Authorized via API Engine Protocol V3'
    };
}

function buildResponse(allowed, delay, next, schedule, reason, risk) {
    return {
        allowed,
        actionId: null,
        nextAction: next,
        delayMs: delay,
        scheduleAt: schedule,
        requiresAck: false,
        riskLevel: risk,
        reason
    };
}

module.exports = {
    checkAction
};
