/*
═══════════════════════════════════════════════════════════
  E.I.O - LOG MODEL
  Modelo de logs de ações
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Log = sequelize.define('Log', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    execution_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'executions',
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
    level: {
        type: DataTypes.ENUM('info', 'success', 'warning', 'error'),
        allowNull: false
    },
    action: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Tipo de ação: follow, like, comment, etc.'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    meta: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'logs',
    timestamps: false,
    indexes: [
        {
            fields: ['user_id', 'created_at']
        },
        {
            fields: ['execution_id']
        }
    ]
});

module.exports = Log;
