/*
═══════════════════════════════════════════════════════════
  E.I.O - DATABASE CONNECTION
  Conexão com PostgreSQL usando Sequelize
═══════════════════════════════════════════════════════════
*/

const { Sequelize } = require('sequelize');

// Configuração SSL para Supabase (obrigatório para conexões remotas)
const sslConfig = {
    require: true,
    rejectUnauthorized: false
};

// Se tiver DATABASE_URL, usa connection string completa (recomendado para Supabase)
// Caso contrário, monta conexão manualmente
const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
            ssl: sslConfig
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'eio_db',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            dialectOptions: {
                ssl: sslConfig
            },
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            define: {
                timestamps: true,
                underscored: true,
                freezeTableName: true
            }
        }
    );

async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully');

        // Sync models (development only)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: false });
            console.log('✓ Database models synchronized');
        }

        return sequelize;
    } catch (error) {
        console.error('✗ Unable to connect to database:', error);
        throw error;
    }
}

async function closeDatabase() {
    await sequelize.close();
    console.log('✓ Database connection closed');
}

module.exports = {
    sequelize,
    initializeDatabase,
    closeDatabase
};
