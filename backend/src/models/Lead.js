/*
═══════════════════════════════════════════════════════════
  E.I.O - LEAD MODEL (REFATORADO)
  Modelo de leads extraídos/processados
  
  🏗️ ARQUITETURA:
  Execution → Lead (leads extraídos por execução)
  Account → Lead (leads pertencem a uma conta)
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Lead = sequelize.define('Lead', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },

    // ═══════════════════════════════════════════════════════════
    // 🔗 RELACIONAMENTOS
    // ═══════════════════════════════════════════════════════════
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    account_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'accounts',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Conta que extraiu este lead'
    },
    execution_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'executions',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Execução que extraiu este lead'
    },

    // ═══════════════════════════════════════════════════════════
    // 👤 DADOS DO LEAD
    // ═══════════════════════════════════════════════════════════
    instagram_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID único do Instagram'
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Username do Instagram (sem @)'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nome completo'
    },
    avatar: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL do avatar'
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Bio do perfil'
    },

    // ═══════════════════════════════════════════════════════════
    // 📊 MÉTRICAS DO PERFIL
    // ═══════════════════════════════════════════════════════════
    followers_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    following_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    posts_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_private: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_business: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },

    // ═══════════════════════════════════════════════════════════
    // 🏷️ QUALIFICAÇÃO
    // ═══════════════════════════════════════════════════════════
    status: {
        type: DataTypes.ENUM('new', 'hot', 'warm', 'cold', 'contacted', 'qualified', 'converted', 'lost'),
        defaultValue: 'new',
        comment: 'Status do lead no funil'
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
        comment: 'Score de qualificação (0-100)'
    },
    source: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Origem: hashtag, followers, following, location'
    },
    source_detail: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Detalhes: nome da hashtag, perfil, etc'
    },
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        comment: 'Tags para organização'
    },

    // ═══════════════════════════════════════════════════════════
    // 📝 INTERAÇÕES
    // ═══════════════════════════════════════════════════════════
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas manuais'
    },
    last_interaction: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Última interação {type, date, success}'
    },
    interactions: {
        type: DataTypes.JSONB,
        defaultValue: {
            followed: false,
            followed_at: null,
            liked: 0,
            commented: 0,
            dm_sent: false,
            dm_replied: false
        },
        comment: 'Histórico de interações'
    },
    timeline: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Timeline de eventos [{date, event, details}]'
    },

    // ═══════════════════════════════════════════════════════════
    // 📆 TIMESTAMPS
    // ═══════════════════════════════════════════════════════════
    extracted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Quando foi extraído'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'leads',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['username'] },
        { fields: ['status'] },
        { fields: ['account_id'] }
    ]
});

// ═══════════════════════════════════════════════════════════
// 🧠 PROTOTYPE METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Adicionar evento à timeline
 */
Lead.prototype.addTimelineEvent = async function (event, details = {}) {
    const timeline = this.timeline || [];
    timeline.push({
        date: new Date().toISOString(),
        event: event,
        details: details
    });

    // Manter só últimos 50 eventos
    if (timeline.length > 50) timeline.shift();

    this.timeline = timeline;
    this.changed('timeline', true);
    await this.save();
};

/**
 * Registrar interação
 */
Lead.prototype.recordInteraction = async function (type, success = true) {
    const interactions = this.interactions || {};

    switch (type) {
        case 'follow':
            interactions.followed = true;
            interactions.followed_at = new Date().toISOString();
            break;
        case 'like':
            interactions.liked = (interactions.liked || 0) + 1;
            break;
        case 'comment':
            interactions.commented = (interactions.commented || 0) + 1;
            break;
        case 'dm':
            interactions.dm_sent = true;
            break;
    }

    this.interactions = interactions;
    this.last_interaction = {
        type: type,
        date: new Date().toISOString(),
        success: success
    };

    this.changed('interactions', true);
    await this.save();

    // Adicionar à timeline
    await this.addTimelineEvent(`${type}_${success ? 'success' : 'failed'}`, { type });
};

/**
 * Calcular score automaticamente
 */
Lead.prototype.calculateScore = async function () {
    let score = 0;

    // Baseado em métricas
    if (this.followers_count >= 1000 && this.followers_count <= 50000) score += 20;
    if (this.posts_count >= 10) score += 10;
    if (!this.is_private) score += 10;
    if (this.is_business) score += 15;
    if (this.bio && this.bio.length > 20) score += 10;

    // Baseado em interações
    const interactions = this.interactions || {};
    if (interactions.followed) score += 10;
    if (interactions.liked > 0) score += interactions.liked * 2;
    if (interactions.commented > 0) score += interactions.commented * 5;
    if (interactions.dm_replied) score += 20;

    this.score = Math.min(100, score);

    // Atualizar status baseado no score
    if (this.score >= 70) this.status = 'hot';
    else if (this.score >= 40) this.status = 'warm';
    else if (this.score >= 20) this.status = 'cold';

    await this.save();
    return this.score;
};

module.exports = Lead;
