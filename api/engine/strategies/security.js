/**
 * Engine Strategy: Segurança e Anti-Ban (Versão Rígida V2)
 * Implementa delays randômicos não repetitivos e proteção máxima.
 */

// Delays permitidos (intervalos rigorosos)
const DELAY_RANGES = {
    'follow': [120000, 180000],  // 2-3 min
    'like': [45000, 120000],     // 45-120s
    'view_story': [60000, 180000], // >= 60s
    'like_story': [60000, 180000], // 60-180s
    'comment': [60000, 180000],    // 60-180s
    'switch_profile': [120000, 180000], // 2-3 min
    'dm_welcome': [900000, 1500000] // 15-25 min
};

const RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

function getRandomDelay(min, max) {
    if (!min || !max) return 60000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function checkSecurity(actionType, settings, lastDelayMs) {
    const range = DELAY_RANGES[actionType] || [60000, 120000];
    let newDelay = getRandomDelay(range[0], range[1]);

    // Garantir que delay não seja idêntico ao anterior (variação forçada)
    if (lastDelayMs && Math.abs(newDelay - lastDelayMs) < 5000) {
        newDelay += 7000; // Shift de 7s se for muito parecido
    }

    // Validação de risco
    let risk = RISK_LEVELS.LOW;

    // Fail-safe: Se delay calculado for menor que o minimo permitido
    if (newDelay < range[0]) {
        return {
            allowed: false,
            reason: 'Security Violation: Delay too short',
            riskLevel: RISK_LEVELS.HIGH
        };
    }

    return {
        allowed: true,
        delay: newDelay,
        riskLevel: risk,
        warning: null
    };
}

module.exports = {
    checkSecurity,
    RISK_LEVELS,
    DELAY_RANGES
};
