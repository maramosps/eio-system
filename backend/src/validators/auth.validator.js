/*
═══════════════════════════════════════════════════════════
  E.I.O - AUTH VALIDATORS
  Schemas de validação para autenticação
═══════════════════════════════════════════════════════════
*/

const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Email inválido',
            'any.required': 'Email é obrigatório'
        }),

    password: Joi.string()
        .min(8)
        .required()
        .messages({
            'string.min': 'Senha deve ter no mínimo 8 caracteres',
            'any.required': 'Senha é obrigatória'
        }),

    name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Nome deve ter no mínimo 2 caracteres',
            'string.max': 'Nome deve ter no máximo 100 caracteres'
        })
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Email inválido',
            'any.required': 'Email é obrigatório'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Senha é obrigatória'
        })
});

module.exports = {
    registerSchema,
    loginSchema
};
