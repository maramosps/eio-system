/*
═══════════════════════════════════════════════════════════
  E.I.O - USER MODEL
  Modelo de usuário
═══════════════════════════════════════════════════════════
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true // Pode ser null para login com Google
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instagram_handle: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    whatsapp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    role: {
        type: DataTypes.ENUM('client', 'admin'),
        defaultValue: 'client',
        allowNull: false
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;
