/*
═══════════════════════════════════════════════════════════
  E.I.O - ACCOUNT MODEL
  Modelo de conta do Instagram vinculada
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
        allowNull: false
    },
    encrypted_credentials: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Credenciais criptografadas do Instagram'
    },
    health_score: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        validate: {
            min: 0,
            max: 100
        },
        comment: 'Saúde da conta (0-100)'
    },
    limits_config: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Limites personalizados pelo usuário'
    },
    ai_limits: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Limites calculados pela IA'
    },
    last_activity: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
    tableName: 'accounts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Account;
