/*
═══════════════════════════════════════════════════════════
  E.I.O - SUBSCRIPTION MODEL
  Modelo de assinatura
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Subscription = sequelize.define('Subscription', {
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
    stripe_customer_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stripe_subscription_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mercadopago_customer_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mercadopago_subscription_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    plan: {
        type: DataTypes.STRING,
        defaultValue: 'professional',
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'paused', 'canceled', 'past_due', 'trialing'),
        defaultValue: 'active',
        allowNull: false
    },
    current_period_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    current_period_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    trial_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Subscription;
