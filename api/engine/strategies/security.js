/**
 * Engine Strategy: Segurança e Anti-Ban (Versão Auditada V3)
 * Implementa distribuição não-linear e evita padrões detectáveis.
 */

// Intervalos base (Min, Max)
const DELAY_RANGES = {
    'follow': [135000, 195000],  // Aumentado. Evita 120s cravado.
    'like': [47000, 93000],      // Quebrado. Evita 45/60/90s.
    'view_story': [65000, 145000],
    'like_story': [72000, 158000],
    'comment': [85000, 210000],
    'switch_profile': [145000, 250000],
    'dm_welcome': [950000, 1600000] // ~16-26 min
};

const RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Gera um delay com distribuição "mais humana" (Beta distribution simplificada)
 * Evita extremos e favorece o meio do range, mas com cauda longa.
 */
function getHumanizedDelay(min, max) {
    if (!min || !max) return 60000;

    // Box-Muller transform for normal distribution approximation
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    // Translate to 0 -> 1 range (approx)
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0) num = Math.random(); // Fallback to uniform if outlier

    // Scale to range
    let delay = Math.floor(min + (max - min) * num);

    // Adicionar jitter final de +/- 3%
    const jitter = Math.floor(delay * 0.03 * (Math.random() - 0.5));
    return delay + jitter;
}

async function checkSecurity(actionType, settings, lastDelayMs) {
    const range = DELAY_RANGES[actionType] || [65000, 130000];
    let newDelay = getHumanizedDelay(range[0], range[1]);

    // Anti-Pattern: Evitar números "redondos" (ex: 60000, 120000)
    if (newDelay % 10000 === 0) newDelay += 1234;
    if (newDelay % 5000 === 0) newDelay += 789;

    // Anti-Repetição: Evitar sequências idênticas ou muito próximas
    if (lastDelayMs) {
        const diff = Math.abs(newDelay - lastDelayMs);
        if (diff < 8000) {
            newDelay += (Math.random() > 0.5 ? 9500 : -9500);
            // Garantir que ainda está dentro do range mínimo aceitável
            if (newDelay < range[0]) newDelay = range[0] + 2000;
        }
    }

    // Fail-safe final
    if (newDelay < 30000) newDelay = 30000;

    return {
        allowed: true,
        delay: newDelay,
        riskLevel: RISK_LEVELS.LOW,
        warning: null
    };
}

module.exports = {
    checkSecurity,
    RISK_LEVELS,
    DELAY_RANGES
};
