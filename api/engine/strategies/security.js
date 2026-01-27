/**
 * Engine Strategy: Segurança e Anti-Ban
 * Controla pausas inteligentes e riscos de bloqueio.
 */

// Intervalos mínimos em milissegundos
const BASE_DELAYS = {
    like: 45000,       // 45s
    follow: 60000,     // 60s
    comment: 120000    // 2 min
};

const RISK_LEVELS = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3
};

async function checkSecurity(actionType, settings, accountHealth) {
    const minDelay = BASE_DELAYS[actionType] || 30000;

    // Calcula delay dinâmico
    let finalDelay = minDelay;
    let risk = RISK_LEVELS.LOW;

    // Se a saúde da conta estiver baixa, aumentar o delay
    if (accountHealth?.strikes > 0) {
        finalDelay *= (1.5 * accountHealth.strikes);
        risk = RISK_LEVELS.MEDIUM;
    }

    // Se estiver em modo agressivo (configuração do usuário)
    if (settings?.aggressiveMode) {
        finalDelay *= 0.8; // Reduz sleep em 20%
        risk = RISK_LEVELS.HIGH;
    }

    // Adiciona uma variação randômica de 15% para parecer humano
    const variance = Math.floor(Math.random() * (finalDelay * 0.15));
    finalDelay += variance;

    return {
        delay: Math.ceil(finalDelay),
        riskLevel: risk,
        warning: risk >= RISK_LEVELS.HIGH ? 'Modo agressivo pode gerar bloqueios' : null
    };
}

module.exports = {
    checkSecurity,
    RISK_LEVELS
};
