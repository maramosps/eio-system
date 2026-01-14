/*
═══════════════════════════════════════════════════════════
  E.I.O - USER CONTROLLER
  Controlador de usuário
═══════════════════════════════════════════════════════════
*/

const { User, Account, Subscription } = require('../models');

/**
 * Obter perfil do usuário
 */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash'] },
            include: [
                {
                    model: Subscription,
                    as: 'subscription'
                },
                {
                    model: Account,
                    as: 'accounts'
                }
            ]
        });

        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Atualizar perfil do usuário
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;

        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Usuário não encontrado'
            });
        }

        await user.update({ name });

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deletar conta do usuário
 */
exports.deleteAccount = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Usuário não encontrado'
            });
        }

        // TODO: Cancelar assinatura antes de deletar

        await user.destroy();

        res.json({
            success: true,
            message: 'Conta deletada com sucesso'
        });
    } catch (error) {
        next(error);
    }
};
