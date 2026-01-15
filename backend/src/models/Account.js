/*
═══════════════════════════════════════════════════════════
  E.I.O - ACCOUNT MODEL (REFATORADO)
  Modelo de conta Instagram - Centro da arquitetura
  
  🏗️ ARQUITETURA:
  User → Account (saúde + limites + risco) → Flow → Execution
  
  ✅ Health Score funcional
  ✅ IA Adaptativa com limites dinâmicos
  ✅ Preparação para redução de bloqueios
  ✅ SaaS-ready
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Account = sequelize.define('Account', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    instagram_username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Username do Instagram (sem @)'
    },
    encrypted_credentials: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Credenciais criptografadas (opcional para automação avançada)'
    },

    // ═══════════════════════════════════════════════════════════
    // 🏥 HEALTH SCORE - Saúde da conta (0-100)
    // ═══════════════════════════════════════════════════════════
    health_score: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        validate: { min: 0, max: 100 },
        comment: 'Saúde da conta: 100=perfeita, <40=risco, <20=pausar'
    },
    health_history: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Histórico de variações de saúde [{date, score, reason}]'
    },

    // ═══════════════════════════════════════════════════════════
    // 🤖 IA LIMITS - Limites adaptativos por IA
    // ═══════════════════════════════════════════════════════════
    ai_limits: {
        type: DataTypes.JSONB,
        defaultValue: {
            follow: { min: 10, max: 20, daily_max: 200 },
            like: { min: 40, max: 80, daily_max: 300 },
            comment: { min: 3, max: 7, daily_max: 50 },
            unfollow: { min: 15, max: 30, daily_max: 500 },
            story: { min: 20, max: 40, daily_max: 100 },
            dm: { min: 5, max: 10, daily_max: 30 },
            pause_after_block: 1800,      // 30 min após bloqueio
            pause_after_warning: 900,     // 15 min após warning
            recovery_hours: 24            // horas para recuperar health
        },
        comment: 'Limites calculados pela IA com base no health_score'
    },

    // ═══════════════════════════════════════════════════════════
    // ⚙️ USER LIMITS - Limites definidos pelo usuário
    // ═══════════════════════════════════════════════════════════
    limits_config: {
        type: DataTypes.JSONB,
        defaultValue: {
            max_follows_per_day: 200,
            max_likes_per_day: 300,
            max_comments_per_day: 50,
            max_unfollows_per_day: 500,
            max_stories_per_day: 100,
            max_dms_per_day: 30,
            min_delay_seconds: 30,
            max_delay_seconds: 120,
            active_hours: [9, 22],        // horário ativo
            active_days: [1, 2, 3, 4, 5, 6, 0]  // dias ativos (0=domingo)
        },
        comment: 'Limites personalizados pelo usuário'
    },

    // ═══════════════════════════════════════════════════════════
    // 📊 STATS - Estatísticas acumuladas da conta
    // ═══════════════════════════════════════════════════════════
    stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            total_follows: 0,
            total_likes: 0,
            total_comments: 0,
            total_unfollows: 0,
            total_stories: 0,
            total_dms: 0,
            total_blocks: 0,
            total_warnings: 0,
            last_block_at: null,
            last_warning_at: null,
            success_rate: 100
        },
        comment: 'Estatísticas totais da conta'
    },

    // ═══════════════════════════════════════════════════════════
    // 📅 TODAY STATS - Estatísticas do dia (resetam meia-noite)
    // ═══════════════════════════════════════════════════════════
    today_stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            follows: 0,
            likes: 0,
            comments: 0,
            unfollows: 0,
            stories: 0,
            dms: 0,
            blocks: 0,
            last_reset: null
        },
        comment: 'Stats do dia atual - resetam à meia-noite'
    },

    // ═══════════════════════════════════════════════════════════
    // 🚦 STATUS & CONTROL
    // ═══════════════════════════════════════════════════════════
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Conta ativa para automação'
    },
    is_blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Conta bloqueada (detectado pelo Instagram)'
    },
    cooldown_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Conta em cooldown até esta data'
    },
    cooldown_reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Motivo do cooldown'
    },
    last_activity_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última atividade realizada'
    },
    last_check_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última verificação de saúde'
    },

    // ═══════════════════════════════════════════════════════════
    // 📆 TIMESTAMPS
    // ═══════════════════════════════════════════════════════════
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'accounts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // ═══════════════════════════════════════════════════════════
    // 🔧 INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════
    instanceMethods: {}
});

// ═══════════════════════════════════════════════════════════
// 🧠 PROTOTYPE METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Verificar se a conta está saudável para operar
 */
Account.prototype.isHealthy = function () {
    return this.health_score >= 40 && this.is_active && !this.is_blocked;
};

/**
 * Verificar se está em cooldown
 */
Account.prototype.isInCooldown = function () {
    if (!this.cooldown_until) return false;
    return new Date() < new Date(this.cooldown_until);
};

/**
 * Pode executar ação? (health + cooldown + limits)
 */
Account.prototype.canExecute = function (actionType) {
    if (!this.isHealthy()) return { can: false, reason: 'Account unhealthy' };
    if (this.isInCooldown()) return { can: false, reason: 'In cooldown' };

    // Verificar limite diário
    const todayStats = this.today_stats || {};
    const limits = this.limits_config || {};

    const limitMap = {
        follow: { stat: 'follows', limit: limits.max_follows_per_day },
        like: { stat: 'likes', limit: limits.max_likes_per_day },
        comment: { stat: 'comments', limit: limits.max_comments_per_day },
        unfollow: { stat: 'unfollows', limit: limits.max_unfollows_per_day }
    };

    const check = limitMap[actionType];
    if (check && todayStats[check.stat] >= check.limit) {
        return { can: false, reason: `Daily limit reached for ${actionType}` };
    }

    return { can: true };
};

/**
 * Reduzir health score (após bloqueio/warning)
 */
Account.prototype.reduceHealth = async function (amount, reason) {
    const newScore = Math.max(0, this.health_score - amount);
    const history = this.health_history || [];

    history.push({
        date: new Date().toISOString(),
        from: this.health_score,
        to: newScore,
        reason: reason
    });

    // Manter só últimos 50 registros
    if (history.length > 50) history.shift();

    this.health_score = newScore;
    this.health_history = history;

    // Se saúde muito baixa, ativar cooldown
    if (newScore < 20) {
        this.cooldown_until = new Date(Date.now() + 3600000); // 1h
        this.cooldown_reason = 'Critical health - auto cooldown';
    }

    await this.save();
    return newScore;
};

/**
 * Recuperar health score (passagem de tempo + bom comportamento)
 */
Account.prototype.recoverHealth = async function (amount = 5) {
    const newScore = Math.min(100, this.health_score + amount);

    this.health_score = newScore;
    this.last_check_at = new Date();

    // Limpar cooldown se estiver saudável
    if (newScore >= 60 && this.isInCooldown()) {
        this.cooldown_until = null;
        this.cooldown_reason = null;
    }

    await this.save();
    return newScore;
};

/**
 * Incrementar stat do dia
 */
Account.prototype.incrementTodayStat = async function (statType) {
    const stats = this.today_stats || {};
    const now = new Date();

    // Reset se é um novo dia
    if (stats.last_reset) {
        const lastReset = new Date(stats.last_reset);
        if (lastReset.toDateString() !== now.toDateString()) {
            // Novo dia - resetar
            this.today_stats = {
                follows: 0, likes: 0, comments: 0,
                unfollows: 0, stories: 0, dms: 0, blocks: 0,
                last_reset: now.toISOString()
            };
        }
    } else {
        this.today_stats.last_reset = now.toISOString();
    }

    if (this.today_stats[statType] !== undefined) {
        this.today_stats[statType]++;
    }

    this.last_activity_at = now;
    this.changed('today_stats', true); // Força Sequelize detectar mudança em JSONB
    await this.save();
};

module.exports = Account;
