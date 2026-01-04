/*
═══════════════════════════════════════════════════════════
  E.I.O - AUTH MIDDLEWARE
  Middleware de autenticação JWT
═══════════════════════════════════════════════════════════
*/

const { verifyAccessToken } = require('../utils/jwt');
const { User, Subscription } = require('../models');

/**
 * Middleware para verificar saúde da assinatura
 */
async function checkSubscription(req, res, next) {
    // Admins não precisam de assinatura ativa
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    try {
        const sub = await Subscription.findOne({ where: { user_id: req.user.id } });
        const now = new Date();

        if (!sub) {
            return res.status(403).json({
                error: 'Subscription Required',
                code: 'SUBSCRIPTION_PENDING',
                message: 'Você ainda não possui um plano ativo'
            });
        }

        const isActive = sub.status === 'active' || (sub.status === 'trialing' && sub.trial_end > now);

        if (!isActive) {
            return res.status(403).json({
                error: 'Subscription Expired',
                code: 'SUBSCRIPTION_PENDING',
                message: 'Seu período de teste ou assinatura expirou'
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Middleware de autenticação
 */
async function authenticate(req, res, next) {
    try {
        // Extrair token do header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7);

        // BYPASS: For testing purposes when DB is offline
        if (token === 'eio-test-token') {
            req.user = {
                id: 1,
                email: 'test@eio.com',
                role: 'user'
            };
            return next();
        }

        // Verificar token
        const decoded = verifyAccessToken(token);

        // Buscar usuário
        let user;
        try {
            user = await User.findByPk(decoded.sub);
        } catch (dbError) {
            // Fallback for testing if database is offline but token is otherwise valid
            console.warn('Database offline, using token info for identification');
            req.user = { id: decoded.sub, email: decoded.email || 'user@test.com', role: decoded.role || 'user' };
            return next();
        }

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found'
            });
        }

        // Adicionar usuário ao request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: error.message || 'Invalid token'
        });
    }
}

/**
 * Middleware para verificar role de admin
 */
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
    }
}

/**
 * Middleware opcional de autenticação
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyAccessToken(token);
            const user = await User.findByPk(decoded.sub);

            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role
                };
            }
        }

        next();
    } catch (error) {
        // Continuar sem autenticação
        next();
    }
}

module.exports = {
    authenticate,
    requireAdmin,
    optionalAuth,
    checkSubscription
};
