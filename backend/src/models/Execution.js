/*
═══════════════════════════════════════════════════════════
  E.I.O - EXECUTION MODEL (REFATORADO)
  Modelo de execução - Runtime humano e consciente
  
  🏗️ ARQUITETURA:
  Flow → Execution (runtime humano) → Logs / Leads
  
  ✅ Ligada à Account E ao Flow
  ✅ Status granulares (waiting, cooldown, blocked)
  ✅ Stats detalhados por tipo de ação
  ✅ Controle de próxima ação
  ✅ Execução consciente
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Execution = sequelize.define('Execution', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // ═══════════════════════════════════════════════════════════
    // 🔗 RELACIONAMENTOS
    // ═══════════════════════════════════════════════════════════
    flow_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'flows',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Flow que originou esta execução'
    },
    account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'accounts',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Account que está executando'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'User dono (para queries)'
    },

    // ═══════════════════════════════════════════════════════════
    // 🚦 STATUS GRANULAR
    // ═══════════════════════════════════════════════════════════
    status: {
        type: DataTypes.ENUM(
            'pending',      // Aguardando início
            'running',      // Em execução
            'waiting',      // Aguardando delay entre ações
            'cooldown',     // Em pausa por cooldown
            'paused',       // Pausado pelo usuário
            'completed',    // Concluído com sucesso
            'failed',       // Falhou
            'blocked',      // Bloqueado pelo Instagram
            'canceled'      // Cancelado
        ),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Status atual da execução'
    },

    // ═══════════════════════════════════════════════════════════
    // 📊 STATS DETALHADOS (por tipo de ação)
    // ═══════════════════════════════════════════════════════════
    stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            follow: { attempted: 0, success: 0, failed: 0, blocked: 0 },
            like: { attempted: 0, success: 0, failed: 0, blocked: 0 },
            comment: { attempted: 0, success: 0, failed: 0, blocked: 0 },
            unfollow: { attempted: 0, success: 0, failed: 0, blocked: 0 },
            story: { attempted: 0, success: 0, failed: 0, blocked: 0 },
            dm: { attempted: 0, success: 0, failed: 0, blocked: 0 },
            // Totais
            total_attempted: 0,
            total_success: 0,
            total_failed: 0,
            total_blocked: 0,
            // Perfis processados
            profiles_processed: 0,
            profiles_skipped: 0
        },
        comment: 'Estatísticas detalhadas por tipo de ação'
    },

    // ═══════════════════════════════════════════════════════════
    // 📋 QUEUE & PROGRESS
    // ═══════════════════════════════════════════════════════════
    queue: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Fila de ações pendentes [{type, target, ...}]'
    },
    current_action: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Ação sendo executada atualmente'
    },
    progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
        comment: 'Progresso em porcentagem (0-100)'
    },

    // ═══════════════════════════════════════════════════════════
    // ⏰ CONTROLE DE TEMPO (Humano)
    // ═══════════════════════════════════════════════════════════
    last_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Quando a última ação foi executada'
    },
    next_action_after: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Quando a próxima ação pode ser executada'
    },
    cooldown_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Em cooldown até esta data'
    },
    cooldown_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Motivo do cooldown'
    },

    // ═══════════════════════════════════════════════════════════
    // ⚠️ ERROS & BLOQUEIOS
    // ═══════════════════════════════════════════════════════════
    error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro (se houver)'
    },
    error_stack: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Stack trace do erro'
    },
    block_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Tipo de bloqueio detectado (action_block, temp_ban, etc)'
    },

    // ═══════════════════════════════════════════════════════════
    // 📆 TIMESTAMPS
    // ═══════════════════════════════════════════════════════════
    started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Quando a execução iniciou'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Quando a execução terminou'
    },
    duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duração total em segundos'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'executions',
    timestamps: true,
    createdAt: 'started_at',
    updatedAt: 'updated_at'
});

// ═══════════════════════════════════════════════════════════
// 🧠 PROTOTYPE METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Registrar ação executada
 */
Execution.prototype.recordAction = async function (actionType, success, blocked = false) {
    const stats = this.stats;

    // Atualizar stats do tipo específico
    if (stats[actionType]) {
        stats[actionType].attempted++;
        if (success) {
            stats[actionType].success++;
        } else if (blocked) {
            stats[actionType].blocked++;
        } else {
            stats[actionType].failed++;
        }
    }

    // Atualizar totais
    stats.total_attempted++;
    if (success) stats.total_success++;
    else if (blocked) stats.total_blocked++;
    else stats.total_failed++;

    this.stats = stats;
    this.last_action_at = new Date();
    this.changed('stats', true);

    await this.save();
};

/**
 * Definir próxima ação com delay humanizado
 */
Execution.prototype.setNextAction = async function (delaySeconds) {
    this.next_action_after = new Date(Date.now() + (delaySeconds * 1000));
    this.status = 'waiting';
    await this.save();
};

/**
 * Entrar em cooldown
 */
Execution.prototype.enterCooldown = async function (durationSeconds, reason) {
    this.cooldown_until = new Date(Date.now() + (durationSeconds * 1000));
    this.cooldown_reason = reason;
    this.status = 'cooldown';
    await this.save();
};

/**
 * Marcar como bloqueado
 */
Execution.prototype.markBlocked = async function (blockType, errorMessage) {
    this.status = 'blocked';
    this.block_type = blockType;
    this.error = errorMessage;
    this.completed_at = new Date();
    this.duration_seconds = Math.floor(
        (this.completed_at - new Date(this.started_at)) / 1000
    );
    await this.save();
};

/**
 * Completar execução
 */
Execution.prototype.complete = async function (success = true) {
    this.status = success ? 'completed' : 'failed';
    this.completed_at = new Date();
    this.duration_seconds = Math.floor(
        (this.completed_at - new Date(this.started_at)) / 1000
    );
    this.progress = 100;
    await this.save();
};

/**
 * Verificar se pode executar próxima ação
 */
Execution.prototype.canExecuteNext = function () {
    // Verificar status
    if (!['running', 'waiting'].includes(this.status)) {
        return { can: false, reason: `Execution status is ${this.status}` };
    }

    // Verificar cooldown
    if (this.cooldown_until && new Date() < new Date(this.cooldown_until)) {
        return { can: false, reason: 'In cooldown' };
    }

    // Verificar delay entre ações
    if (this.next_action_after && new Date() < new Date(this.next_action_after)) {
        return { can: false, reason: 'Waiting for delay', waitMs: new Date(this.next_action_after) - new Date() };
    }

    return { can: true };
};

/**
 * Atualizar progresso
 */
Execution.prototype.updateProgress = async function () {
    const queue = this.queue || [];
    const totalActions = queue.length + this.stats.total_attempted;

    if (totalActions > 0) {
        this.progress = Math.round((this.stats.total_attempted / totalActions) * 100);
    }

    await this.save();
};

module.exports = Execution;
