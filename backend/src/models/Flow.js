/*
═══════════════════════════════════════════════════════════
  E.I.O - FLOW MODEL
  Modelo de fluxo de automação
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
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    config: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    status: {
        type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'failed'),
        defaultValue: 'draft',
        allowNull: false
    },
    schedule: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Agendamento do fluxo (horários, dias da semana, etc)'
    },
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

module.exports = Flow;
