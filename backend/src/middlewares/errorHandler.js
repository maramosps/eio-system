/*
═══════════════════════════════════════════════════════════
  E.I.O - ERROR HANDLER MIDDLEWARE
  Middleware global de tratamento de erros
═══════════════════════════════════════════════════════════
*/

const winston = require('winston');

const logger = winston.createLogger({
    level: 'error',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log' })
    ]
});

/**
 * Middleware de tratamento de erros
 */
function errorHandler(err, req, res, next) {
    // Log do erro
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Erro de validação (Sequelize)
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Dados inválidos fornecidos',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }

    // Erro de chave única (duplicate)
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: 'Conflict',
            message: 'Registro já existe',
            field: err.errors[0]?.path
        });
    }

    // Erro de não encontrado (Sequelize)
    if (err.name === 'SequelizeEmptyResultError') {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Recurso não encontrado'
        });
    }

    // Erro de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token expirado'
        });
    }

    // Erro genérico
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: err.name || 'Error',
        message: process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Ocorreu um erro interno no servidor'
            : message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

/**
 * Classe de erro customizado
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    errorHandler,
    AppError
};
