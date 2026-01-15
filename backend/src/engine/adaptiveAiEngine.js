/*
══════════════════════════════════════════════
  E.I.O – ADAPTIVE AI ENGINE
  Sistema de IA que aprende e ajusta limites
  automaticamente baseado no comportamento real
══════════════════════════════════════════════

  📌 O QUE ESSA IA FAZ NA PRÁTICA:
  
  ✅ Aprende limite real por conta
  ✅ Diminui agressividade após bloqueio
  ✅ Aumenta lentamente se estiver saudável
  ✅ Não precisa ML pesado
  ✅ Totalmente explicável e controlável

══════════════════════════════════════════════
*/

/**
 * Adapta os limites da conta baseado no resultado da execução
 * 
 * @param {Account} account - Instância da conta
 * @param {Execution} execution - Instância da execução concluída
 */
async function adaptLimits(account, execution) {
    const stats = execution.stats;
    let totalBlocked = 0;
    let totalSuccess = 0;

    // Calcular totais de bloqueios e sucessos
    Object.values(stats).forEach(s => {
        if (typeof s === 'object' && s !== null) {
            totalBlocked += s.blocked || 0;
            totalSuccess += s.success || 0;
        }
    });

    // Taxa de bloqueio
    const blockRate = totalBlocked / Math.max(totalSuccess + totalBlocked, 1);

    // Garantir que ai_limits existe
    if (!account.ai_limits) {
        account.ai_limits = {
            follow: { min: 10, max: 20 },
            like: { min: 40, max: 80 },
            comment: { min: 3, max: 7 },
            pause_after_block: 1800
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 🔻 CONTA SOFRENDO (muitos bloqueios)
    // Reduzir agressividade para proteger a conta
    // ═══════════════════════════════════════════════════════════
    if (blockRate > 0.2) {
        console.log(`[AI] ⚠️ Alta taxa de bloqueio (${(blockRate * 100).toFixed(1)}%) - Reduzindo limites`);

        // Reduzir limites de follow
        if (account.ai_limits.follow) {
            if (typeof account.ai_limits.follow === 'object') {
                account.ai_limits.follow.max = Math.max(account.ai_limits.follow.max - 3, 5);
            } else if (Array.isArray(account.ai_limits.follow)) {
                account.ai_limits.follow[1] = Math.max(account.ai_limits.follow[1] - 3, 5);
            }
        }

        // Reduzir limites de like
        if (account.ai_limits.like) {
            if (typeof account.ai_limits.like === 'object') {
                account.ai_limits.like.max = Math.max(account.ai_limits.like.max - 10, 20);
            } else if (Array.isArray(account.ai_limits.like)) {
                account.ai_limits.like[1] = Math.max(account.ai_limits.like[1] - 10, 20);
            }
        }

        // Aumentar tempo de pausa após bloqueio
        account.ai_limits.pause_after_block = Math.min(
            (account.ai_limits.pause_after_block || 1800) + 300,
            7200 // máximo 2 horas
        );
    }

    // ═══════════════════════════════════════════════════════════
    // 🔺 CONTA SAUDÁVEL (poucos bloqueios)
    // Aumentar gradualmente os limites
    // ═══════════════════════════════════════════════════════════
    if (blockRate < 0.05 && account.health_score > 80) {
        console.log(`[AI] ✅ Conta saudável (${account.health_score}%) - Aumentando limites`);

        // Aumentar limites de follow
        if (account.ai_limits.follow) {
            if (typeof account.ai_limits.follow === 'object') {
                account.ai_limits.follow.max = Math.min(account.ai_limits.follow.max + 1, 30);
            } else if (Array.isArray(account.ai_limits.follow)) {
                account.ai_limits.follow[1] = Math.min(account.ai_limits.follow[1] + 1, 30);
            }
        }

        // Aumentar limites de like
        if (account.ai_limits.like) {
            if (typeof account.ai_limits.like === 'object') {
                account.ai_limits.like.max = Math.min(account.ai_limits.like.max + 5, 150);
            } else if (Array.isArray(account.ai_limits.like)) {
                account.ai_limits.like[1] = Math.min(account.ai_limits.like[1] + 5, 150);
            }
        }

        // Reduzir tempo de pausa (conta confiável)
        account.ai_limits.pause_after_block = Math.max(
            (account.ai_limits.pause_after_block || 1800) - 60,
            900 // mínimo 15 minutos
        );
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 REGISTRAR AJUSTE
    // ═══════════════════════════════════════════════════════════
    account.ai_limits.updated_at = new Date();
    account.ai_limits.last_block_rate = blockRate;
    account.ai_limits.last_total_actions = totalSuccess + totalBlocked;

    // Marcar JSONB como modificado para Sequelize detectar
    account.changed('ai_limits', true);

    await account.save();

    console.log(`[AI] Limites atualizados para @${account.instagram_username}:`, account.ai_limits);
}

/**
 * Recalcula limites baseado no histórico completo
 * (para uso em jobs noturnos / recálculo periódico)
 */
async function recalculateLimitsFromHistory(account, executions) {
    let totalBlocks = 0;
    let totalActions = 0;

    executions.forEach(exec => {
        if (exec.stats) {
            Object.values(exec.stats).forEach(s => {
                if (typeof s === 'object' && s !== null) {
                    totalBlocks += s.blocked || 0;
                    totalActions += (s.success || 0) + (s.blocked || 0) + (s.failed || 0);
                }
            });
        }
    });

    const overallBlockRate = totalBlocks / Math.max(totalActions, 1);

    // Ajuste baseado no histórico geral
    if (overallBlockRate > 0.1) {
        // Conta problemática - ser conservador
        account.ai_limits.follow.max = 15;
        account.ai_limits.like.max = 50;
        account.ai_limits.pause_after_block = 3600;
    } else if (overallBlockRate < 0.02) {
        // Conta excelente - pode ser mais agressivo
        account.ai_limits.follow.max = 25;
        account.ai_limits.like.max = 100;
        account.ai_limits.pause_after_block = 1200;
    }

    account.changed('ai_limits', true);
    await account.save();

    return {
        overallBlockRate,
        totalActions,
        newLimits: account.ai_limits
    };
}

module.exports = {
    adaptLimits,
    recalculateLimitsFromHistory
};
