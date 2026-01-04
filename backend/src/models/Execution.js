/*
═══════════════════════════════════════════════════════════
  E.I.O - EXECUTION MODEL
  Modelo de execução de fluxo
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
    flow_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'flows',
            key: 'id'
        },
        onDelete: 'CASCADE'
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
    status: {
        type: DataTypes.ENUM('running', 'paused', 'completed', 'failed', 'canceled'),
        defaultValue: 'running',
        allowNull: false
    },
    stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            follows: 0,
            likes: 0,
            comments: 0,
            stories_liked: 0,
            unfollows: 0,
            errors: 0
        }
    },
    progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Progresso em porcentagem (0-100)'
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'executions',
    timestamps: false
});

module.exports = Execution;
