const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Lead = sequelize.define('Lead', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('new', 'contacted', 'qualified', 'converted'),
        defaultValue: 'new'
    },
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    timeline: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'leads',
    timestamps: true,
    underscored: true
});

module.exports = Lead;
