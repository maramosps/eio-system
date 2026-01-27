/**
 * Engine Strategy: Limites de Plano
 * Controla se o usuário pode realizar a ação baseado no seu plano atual.
 */

const PLAN_LIMITS = {
    free: { daily: 50, aggressive: false },
    pro: { daily: 500, aggressive: true },
    trial: { daily: 200, aggressive: true }
};

// Global Safety Lock - Max DM/Day
const GLOBAL_DM_LIMIT = 50;

async function checkLimits(userPlan, currentStats, actionType) {
    const limits = PLAN_LIMITS[userPlan?.toLowerCase()] || PLAN_LIMITS.free;
    const dailyCount = currentStats?.dailyCount || 0;
    const dmCount = currentStats?.dmDailyCount || 0;

    // 1. Limite Geral Diário (ações totais)
    if (dailyCount >= limits.daily) {
        return {
            allowed: false,
            reason: `Limite diário do plano atingido (${dailyCount}/${limits.daily})`,
            riskLevel: 'LOW'
        };
    }

    // 2. Trava Global de DM (50/dia)
    if (actionType === 'dm_welcome' || actionType === 'dm') {
        if (dmCount >= GLOBAL_DM_LIMIT) {
            return {
                allowed: false,
                reason: `TRAVA DE SEGURANÇA GLOBAL: Limite máximo de 50 DMs/dia atingido.`,
                riskLevel: 'CRITICAL',
                blockDuration: 86400000 // 24h block
            };
        }
    }

    return { allowed: true };
}

module.exports = {
    checkLimits,
    PLAN_LIMITS,
    GLOBAL_DM_LIMIT
};
