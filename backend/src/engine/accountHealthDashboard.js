/*
══════════════════════════════════════════════
  E.I.O – ACCOUNT HEALTH DASHBOARD
  API lógica de visibilidade e controle
  
  📌 ISSO JÁ PERMITE:
  
  ✅ Frontend React / Next / Vue
  ✅ Painel admin
  ✅ Alertas
  ✅ Monitoramento em tempo real
  ✅ Produto SaaS vendável

══════════════════════════════════════════════
*/

const { Account, Execution, Flow } = require('../models');
const { Op } = require('sequelize');

/**
 * Obter status de saúde completo de uma conta
 */
async function getAccountHealth(accountId) {
    const account = await Account.findByPk(accountId, {
        include: [
            {
                model: Execution,
                as: 'executions',
                limit: 5,
                order: [['started_at', 'DESC']]
            }
        ]
    });

    if (!account) return null;

    const lastExecution = account.executions?.[0];

    return {
        instagram: account.instagram_username,
        health_score: account.health_score,
        is_active: account.is_active,
        is_blocked: account.is_blocked || false,
        ai_limits: account.ai_limits,
        limits_config: account.limits_config,
        last_activity: account.last_activity_at,
        cooldown_until: account.cooldown_until,
        cooldown_reason: account.cooldown_reason,
        stats: account.stats,
        today_stats: account.today_stats,
        last_execution: lastExecution
            ? {
                id: lastExecution.id,
                status: lastExecution.status,
                stats: lastExecution.stats,
                started_at: lastExecution.started_at,
                completed_at: lastExecution.completed_at,
                duration: lastExecution.duration_seconds
            }
            : null,
        risk_level: getRiskLevel(account.health_score),
        risk_color: getRiskColor(account.health_score),
        recommendations: getRecommendations(account)
    };
}

/**
 * Obter nível de risco baseado no health score
 */
function getRiskLevel(healthScore) {
    if (healthScore > 80) return 'LOW';
    if (healthScore > 60) return 'MEDIUM';
    if (healthScore > 40) return 'HIGH';
    return 'CRITICAL';
}

/**
 * Obter cor do risco para UI
 */
function getRiskColor(healthScore) {
    if (healthScore > 80) return '#25D366'; // Verde
    if (healthScore > 60) return '#FFA000'; // Amarelo
    if (healthScore > 40) return '#FF6B6B'; // Vermelho claro
    return '#D32F2F'; // Vermelho escuro
}

/**
 * Gerar recomendações baseadas no estado da conta
 */
function getRecommendations(account) {
    const recommendations = [];

    if (account.health_score < 40) {
        recommendations.push({
            type: 'critical',
            message: 'Conta com saúde crítica! Pare todas as automações por 24h.',
            action: 'pause_all'
        });
    } else if (account.health_score < 60) {
        recommendations.push({
            type: 'warning',
            message: 'Reduza a intensidade das automações em 50%.',
            action: 'reduce_limits'
        });
    }

    if (account.is_blocked) {
        recommendations.push({
            type: 'critical',
            message: 'Conta está bloqueada pelo Instagram. Não execute nenhuma ação.',
            action: 'wait'
        });
    }

    if (account.cooldown_until && new Date() < new Date(account.cooldown_until)) {
        const minutesLeft = Math.ceil((new Date(account.cooldown_until) - new Date()) / 60000);
        recommendations.push({
            type: 'info',
            message: `Conta em cooldown. Aguarde ${minutesLeft} minutos.`,
            action: 'wait'
        });
    }

    const todayStats = account.today_stats || {};
    const limits = account.limits_config || {};

    if (todayStats.follows >= (limits.max_follows_per_day || 200) * 0.9) {
        recommendations.push({
            type: 'warning',
            message: 'Limite diário de follows quase atingido.',
            action: 'wait_tomorrow'
        });
    }

    if (recommendations.length === 0) {
        recommendations.push({
            type: 'success',
            message: 'Conta saudável e pronta para automação.',
            action: 'continue'
        });
    }

    return recommendations;
}

/**
 * Obter dashboard de todas as contas de um usuário
 */
async function getUserAccountsDashboard(userId) {
    const accounts = await Account.findAll({
        where: { user_id: userId },
        include: [
            {
                model: Execution,
                as: 'executions',
                limit: 1,
                order: [['started_at', 'DESC']],
                required: false
            }
        ]
    });

    return accounts.map(account => ({
        id: account.id,
        instagram: account.instagram_username,
        health_score: account.health_score,
        is_active: account.is_active,
        risk_level: getRiskLevel(account.health_score),
        risk_color: getRiskColor(account.health_score),
        last_activity: account.last_activity_at,
        today_actions: sumTodayActions(account.today_stats),
        status: getAccountStatus(account)
    }));
}

/**
 * Somar ações do dia
 */
function sumTodayActions(stats) {
    if (!stats) return 0;
    return (stats.follows || 0) +
        (stats.likes || 0) +
        (stats.comments || 0) +
        (stats.unfollows || 0);
}

/**
 * Obter status resumido da conta
 */
function getAccountStatus(account) {
    if (account.is_blocked) return 'blocked';
    if (!account.is_active) return 'inactive';
    if (account.cooldown_until && new Date() < new Date(account.cooldown_until)) return 'cooldown';
    if (account.health_score < 40) return 'critical';
    if (account.health_score < 60) return 'warning';
    return 'healthy';
}

/**
 * Obter histórico de saúde de uma conta
 */
async function getHealthHistory(accountId, days = 7) {
    const account = await Account.findByPk(accountId);
    if (!account) return null;

    // Retornar histórico salvo no account ou gerar baseado em execuções
    const history = account.health_history || [];

    // Filtrar por período
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return history.filter(h => new Date(h.date) >= cutoff);
}

/**
 * Obter estatísticas agregadas para dashboard admin
 */
async function getAdminStats() {
    const totalAccounts = await Account.count();
    const activeAccounts = await Account.count({ where: { is_active: true } });
    const criticalAccounts = await Account.count({
        where: { health_score: { [Op.lt]: 40 }, is_active: true }
    });
    const blockedAccounts = await Account.count({ where: { is_blocked: true } });

    const avgHealthScore = await Account.findOne({
        attributes: [[Account.sequelize.fn('AVG', Account.sequelize.col('health_score')), 'avg']],
        where: { is_active: true }
    });

    const todayExecutions = await Execution.count({
        where: {
            started_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
    });

    return {
        total_accounts: totalAccounts,
        active_accounts: activeAccounts,
        critical_accounts: criticalAccounts,
        blocked_accounts: blockedAccounts,
        avg_health_score: Math.round(avgHealthScore?.dataValues?.avg || 0),
        today_executions: todayExecutions,
        system_status: criticalAccounts > 0 ? 'warning' : 'healthy'
    };
}

module.exports = {
    getAccountHealth,
    getUserAccountsDashboard,
    getHealthHistory,
    getAdminStats,
    getRiskLevel,
    getRiskColor,
    getRecommendations
};
