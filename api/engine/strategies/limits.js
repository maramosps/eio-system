/**
 * Engine Strategy: Limites de Plano
 * Controla se o usuário pode realizar a ação baseado no seu plano atual.
 */

const PLAN_LIMITS = {
    free: { daily: 50, aggressive: false },
    pro: { daily: 500, aggressive: true },
    trial: { daily: 200, aggressive: true }
};

async function checkLimits(userPlan, currentStats) {
    const limits = PLAN_LIMITS[userPlan?.toLowerCase()] || PLAN_LIMITS.free;
    const dailyCount = currentStats?.dailyCount || 0;

    if (dailyCount >= limits.daily) {
        return {
            allowed: false,
            reason: `Limite diário do plano atingido (${dailyCount}/${limits.daily})`,
            riskLevel: 'LOW'
        };
    }

    return { allowed: true };
}

module.exports = {
    checkLimits,
    PLAN_LIMITS
};
