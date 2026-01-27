/**
 * Engine Core: Decisor Central
 * Orquestra as verificações de Limites, Segurança e Agentes.
 */

const { checkLimits } = require('../strategies/limits');
const { checkSecurity } = require('../strategies/security');
const { needsAgentIntervention } = require('../strategies/agents');
const { logAction } = require('../services/logs');

async function checkAction(userId, plan, currentStats, actionType, metadata) {
    if (!userId) {
        throw new Error('UserId is required');
    }

    // 1. Verificar Limites do Plano
    const limitCheck = await checkLimits(plan, currentStats);
    if (!limitCheck.allowed) {
        await logAction(userId, actionType, limitCheck); // Log blocked action
        return limitCheck;
    }

    // 2. Análise de Segurança & Risco
    const securityCheck = await checkSecurity(actionType, metadata?.settings, currentStats?.health);

    // 3. Intervenção de Agentes IA (Opcional)
    const agentCheck = await needsAgentIntervention(actionType, metadata?.messageContent);
    if (agentCheck.intervention) {
        securityCheck.agentSuggestion = agentCheck;
    }

    const decision = {
        allowed: true,
        delay: securityCheck.delay,
        riskLevel: securityCheck.riskLevel,
        warning: securityCheck.warning || null,
        agentIntervention: agentCheck.intervention ? agentCheck.agent : null
    };

    // 4. Registrar toda decisão tomada
    // await logAction(userId, actionType, decision); // Logging async to not block

    return decision;
}

module.exports = {
    checkAction
};
