/*
═══════════════════════════════════════════════════════════
  E.I.O - FLOW MODEL (REFATORADO)
  Modelo de fluxo de automação - Estratégia
  
  🏗️ ARQUITETURA:
  Account → Flow (estratégia) → Execution (runtime)
  
  ✅ Ligado à Account (não mais direto ao User)
  ✅ Humanização configurável
  ✅ Agendamento inteligente
  ✅ Cooldown por flow
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Flow = sequelize.define('Flow', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // ═══════════════════════════════════════════════════════════
    // 🔗 RELACIONAMENTOS
    // ═══════════════════════════════════════════════════════════
    account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'accounts',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Flow pertence a uma Account (não User)'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Referência ao usuário dono (para queries fáceis)'
    },

    // ═══════════════════════════════════════════════════════════
    // 📝 IDENTIFICAÇÃO
    // ═══════════════════════════════════════════════════════════
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nome do fluxo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição do objetivo do fluxo'
    },

    // ═══════════════════════════════════════════════════════════
    // ⚙️ CONFIGURAÇÃO DO FLUXO
    // ═══════════════════════════════════════════════════════════
    config: {
        type: DataTypes.JSONB,
        defaultValue: {
            // Ações a executar
            actions: ['like', 'follow'],

            // Target/Fonte
            source: {
                type: 'hashtag',        // hashtag, followers, following, location
                value: null,
                filters: {
                    min_followers: 100,
                    max_followers: 50000,
                    min_posts: 5,
                    has_bio: true,
                    is_business: null,
                    skip_private: true
                }
            },

            // Delays humanizados
            delays: {
                min: 30,               // segundos mínimo entre ações
                max: 120,              // segundos máximo entre ações
                batch_pause: 300       // pausa após lote de ações
            },

            // Configurações de humanização
            humanization: {
                enabled: true,
                random_skip: 0.15,     // 15% chance de pular uma ação
                circadian_mode: true,  // respeitar horários biológicos
                micro_pauses: true,    // pausas aleatórias curtas
                typing_simulation: true, // simular digitação em comentários
                scroll_behavior: true  // simular scroll natural
            },

            // Limites do fluxo (override do account)
            limits: {
                max_actions_per_run: 50,
                max_actions_per_hour: 30,
                stop_on_block: true,
                retry_on_error: 3
            }
        },
        comment: 'Configuração completa do fluxo'
    },

    // ═══════════════════════════════════════════════════════════
    // 🚦 STATUS
    // ═══════════════════════════════════════════════════════════
    status: {
        type: DataTypes.ENUM('draft', 'active', 'paused', 'archived', 'completed', 'failed'),
        defaultValue: 'draft',
        allowNull: false,
        comment: 'Status atual do fluxo'
    },

    // ═══════════════════════════════════════════════════════════
    // 📅 AGENDAMENTO
    // ═══════════════════════════════════════════════════════════
    schedule: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: false,
            days: [1, 2, 3, 4, 5],    // Seg-Sex
            hours: {
                start: 9,              // 9h
                end: 22                // 22h
            },
            timezone: 'America/Sao_Paulo',
            max_runs_per_day: 3
        },
        comment: 'Agendamento do fluxo'
    },

    // ═══════════════════════════════════════════════════════════
    // 📊 ESTATÍSTICAS DO FLOW
    // ═══════════════════════════════════════════════════════════
    stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            total_runs: 0,
            total_actions: 0,
            total_follows: 0,
            total_likes: 0,
            total_comments: 0,
            total_errors: 0,
            success_rate: 100,
            last_run_duration: null
        },
        comment: 'Estatísticas acumuladas do fluxo'
    },

    // ═══════════════════════════════════════════════════════════
    // ⏰ CONTROLE DE TEMPO
    // ═══════════════════════════════════════════════════════════
    last_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que o fluxo foi executado'
    },
    next_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Próxima execução agendada'
    },
    cooldown_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Flow em cooldown até esta data'
    },
    cooldown_reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Motivo do cooldown'
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
    tableName: 'flows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// ═══════════════════════════════════════════════════════════
// 🧠 PROTOTYPE METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Verificar se pode executar agora
 */
Flow.prototype.canRunNow = function () {
    // Verificar status
    if (this.status !== 'active') {
        return { can: false, reason: `Flow status is ${this.status}` };
    }

    // Verificar cooldown
    if (this.cooldown_until && new Date() < new Date(this.cooldown_until)) {
        return { can: false, reason: 'Flow in cooldown' };
    }

    // Verificar agendamento
    if (this.schedule?.enabled) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        if (!this.schedule.days?.includes(day)) {
            return { can: false, reason: 'Not scheduled for today' };
        }

        if (hour < this.schedule.hours?.start || hour >= this.schedule.hours?.end) {
            return { can: false, reason: 'Outside scheduled hours' };
        }
    }

    return { can: true };
};

/**
 * Calcular delay humanizado
 */
Flow.prototype.getHumanDelay = function () {
    const delays = this.config?.delays || { min: 30, max: 120 };
    const base = Math.random() * (delays.max - delays.min) + delays.min;

    // Adicionar variação extra para humanização
    if (this.config?.humanization?.micro_pauses) {
        const extraPause = Math.random() < 0.1 ? Math.random() * 30 : 0;
        return Math.floor(base + extraPause);
    }

    return Math.floor(base);
};

/**
 * Decidir se deve pular ação (humanização)
 */
Flow.prototype.shouldSkipAction = function () {
    if (!this.config?.humanization?.enabled) return false;

    const skipChance = this.config.humanization.random_skip || 0.15;
    return Math.random() < skipChance;
};

/**
 * Atualizar estatísticas após run
 */
Flow.prototype.updateStats = async function (runStats) {
    const stats = this.stats || {};

    stats.total_runs = (stats.total_runs || 0) + 1;
    stats.total_actions = (stats.total_actions || 0) + (runStats.actions || 0);
    stats.total_follows = (stats.total_follows || 0) + (runStats.follows || 0);
    stats.total_likes = (stats.total_likes || 0) + (runStats.likes || 0);
    stats.total_comments = (stats.total_comments || 0) + (runStats.comments || 0);
    stats.total_errors = (stats.total_errors || 0) + (runStats.errors || 0);
    stats.last_run_duration = runStats.duration || null;

    // Recalcular success rate
    if (stats.total_actions > 0) {
        stats.success_rate = Math.round(
            ((stats.total_actions - stats.total_errors) / stats.total_actions) * 100
        );
    }

    this.stats = stats;
    this.last_run_at = new Date();
    this.changed('stats', true);

    await this.save();
};

module.exports = Flow;
