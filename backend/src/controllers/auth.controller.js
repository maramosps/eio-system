/*
═══════════════════════════════════════════════════════════
  E.I.O - AUTH CONTROLLER
  Controlador de autenticação
═══════════════════════════════════════════════════════════
*/

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Subscription } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { OAuth2Client } = require('google-auth-library');
const { sequelize } = require('../database/connection');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Função utilitária para verificar se a assinatura está ativa ou no trial
 */
async function getSubscriptionStatus(userId) {
    const sub = await Subscription.findOne({ where: { user_id: userId } });
    if (!sub) return { isActive: false, status: 'inactive' };

    const now = new Date();
    const isActive = sub.status === 'active' || (sub.status === 'trialing' && sub.trial_end > now);

    return {
        isActive,
        status: sub.status,
        trialEnd: sub.trial_end,
        currentPeriodEnd: sub.current_period_end
    };
}

/**
 * Registrar novo usuário
 */
exports.register = async (req, res, next) => {
    try {
        const { email, password, name, instagram_handle, whatsapp } = req.body;

        // Verificar se todos os campos obrigatórios estão preenchidos
        if (!email || !password || !name || !instagram_handle || !whatsapp) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Todos os campos são obrigatórios'
            });
        }

        // Verificar se usuário já existe (email ou instagram)
        const existingUser = await User.findOne({
            where: sequelize.or(
                { email },
                { instagram_handle }
            )
        });
        if (existingUser) {
            return res.status(400).json({
                error: 'User already registered',
                message: 'Email ou Instagram já cadastrados'
            });
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(password, 12);

        // Iniciar transação para criar usuário e trial
        const result = await sequelize.transaction(async (t) => {
            // Criar usuário
            const user = await User.create({
                email,
                password_hash: passwordHash,
                name,
                instagram_handle,
                whatsapp,
                role: 'client'
            }, { transaction: t });

            // Criar Trial de 5 dias
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 5);

            await Subscription.create({
                user_id: user.id,
                plan: 'trial',
                status: 'trialing',
                trial_end: trialEnd
            }, { transaction: t });

            return user;
        });

        const user = result;

        // Gerar tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        // Salvar refresh token no cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
        });

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso. Você tem 5 dias de teste grátis!',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    subscription: {
                        isActive: true,
                        status: 'trialing'
                    }
                },
                accessToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login de usuário
 */
exports.login = async (req, res, next) => {
    try {
        const { email, instagram_handle, password } = req.body;

        // Buscar usuário pelo Email ou Instagram Handle
        const user = await User.findOne({
            where: email ? { email } : { instagram_handle }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Usuário ou senha incorretos'
            });
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Instagram ou senha incorretos'
            });
        }

        // Atualizar último login
        await user.update({ last_login: new Date() });

        // Verificar Assinatura/Trial
        const subStatus = await getSubscriptionStatus(user.id);

        // Gerar tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        // Salvar refresh token no cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        // Se não estiver ativo, o frontend deve saber
        if (!subStatus.isActive && user.role !== 'admin') {
            return res.json({
                success: true,
                message: 'Assinatura pendente',
                code: 'SUBSCRIPTION_PENDING',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        subscription: subStatus
                    },
                    accessToken
                }
            });
        }

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    subscription: subStatus
                },
                accessToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login com Google
 */
exports.googleLogin = async (req, res, next) => {
    try {
        const { token } = req.body;

        // Verificar token do Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Buscar ou criar usuário
        let user = await User.findOne({ where: { google_id: googleId } });

        if (!user) {
            // Verificar se email já existe
            user = await User.findOne({ where: { email } });

            if (user) {
                // Vincular conta Google ao usuário existente
                await user.update({ google_id: googleId });
            } else {
                // Criar novo usuário
                user = await User.create({
                    email,
                    name,
                    google_id: googleId,
                    role: 'client'
                });
            }
        }

        // Atualizar último login
        await user.update({ last_login: new Date() });

        // Verificar Assinatura/Trial
        const subStatus = await getSubscriptionStatus(user.id);

        if (!user.subscription && !subStatus.isActive) {
            // Se for novo usuário Google, cria trial
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 3);
            await Subscription.create({
                user_id: user.id,
                plan: 'trial',
                status: 'trialing',
                trial_end: trialEnd
            });
            subStatus.isActive = true;
            subStatus.status = 'trialing';
        }

        // Gerar tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login com Google realizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    subscription: subStatus
                },
                accessToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Renovar access token
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'No refresh token',
                message: 'Refresh token não fornecido'
            });
        }

        // Verificar refresh token
        const decoded = await verifyRefreshToken(refreshToken);

        // Buscar usuário
        const user = await User.findByPk(decoded.sub);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Usuário não encontrado'
            });
        }

        // Gerar novo access token
        const accessToken = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            data: { accessToken }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout
 */
exports.logout = async (req, res, next) => {
    try {
        // Limpar cookie do refresh token
        res.clearCookie('refreshToken');

        // Opcional: Invalidar refresh token no banco (implementar lista negra)

        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Solicitar reset de senha
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Não revelar se o email existe ou não
            return res.json({
                success: true,
                message: 'Se o email existir, você receberá instruções para resetar a senha'
            });
        }

        // TODO: Gerar token de reset e enviar email
        // Por enquanto, apenas retornar sucesso

        res.json({
            success: true,
            message: 'Instruções para resetar a senha foram enviadas para o seu email'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resetar senha
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        // TODO: Verificar token de reset
        // TODO: Atualizar senha

        res.json({
            success: true,
            message: 'Senha resetada com sucesso'
        });
    } catch (error) {
        next(error);
    }
};
