/*
═══════════════════════════════════════════════════════════
  E.I.O - VALIDATOR MIDDLEWARE
  Middleware de validação de dados
═══════════════════════════════════════════════════════════
*/

const Joi = require('joi');

/**
 * Middleware de validação
 * @param {Joi.Schema} schema - Schema de validação Joi
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation Error',
                message: 'Dados inválidos fornecidos',
                details: errors
            });
        }

        // Substituir body pelos dados validados e sanitizados
        req.body = value;
        next();
    };
}

module.exports = {
    validate
};
