const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

/**
 * @route   POST /api/v1/license/validate
 * @desc    Validar licença ativa
 * @access  Private
 */
router.post('/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ isValid: false, message: 'Token não fornecido' });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'eio-secret-key-2026');

        // Buscar usuário
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .single();

        if (userError || !user) {
            return res.status(401).json({ isValid: false, message: 'Usuário não encontrado' });
        }

        // Buscar assinatura
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Verificar período de teste
        const trialDays = 5;
        const trialEndDate = new Date(user.created_at);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const now = new Date();
        const isTrialActive = now < trialEndDate;
        const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

        const isValid = isTrialActive || isPaid;

        res.json({
            isValid,
            isPaid,
            isTrialActive,
            daysRemaining: isTrialActive ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0,
            subscription: subscription ? {
                status: subscription.status,
                plan: subscription.plan,
                expiresAt: subscription.expires_at
            } : null
        });

    } catch (error) {
        console.error('Erro ao validar licença:', error);
        res.status(500).json({ isValid: false, message: 'Erro ao validar' });
    }
});

/**
 * @route   POST /api/v1/license/activate
 * @desc    Ativar licença após pagamento (Admin)
 * @access  Admin
 */
router.post('/activate', async (req, res) => {
    try {
        const { userId, plan, duration } = req.body;

        if (!userId || !plan) {
            return res.status(400).json({ message: 'userId e plan são obrigatórios' });
        }

        // Buscar ou criar assinatura
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (duration || 30));

        if (existingSub) {
            // Atualizar assinatura existente
            const { data: subscription, error } = await supabase
                .from('subscriptions')
                .update({
                    plan,
                    status: 'active',
                    expires_at: expiresAt.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar assinatura:', error);
                return res.status(500).json({ message: 'Erro ao ativar licença' });
            }

            res.json({
                success: true,
                message: 'Licença ativada com sucesso',
                subscription
            });
        } else {
            // Criar nova assinatura
            const { data: subscription, error } = await supabase
                .from('subscriptions')
                .insert([{
                    user_id: userId,
                    plan,
                    status: 'active',
                    expires_at: expiresAt.toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error('Erro ao criar assinatura:', error);
                return res.status(500).json({ message: 'Erro ao ativar licença' });
            }

            res.json({
                success: true,
                message: 'Licença ativada com sucesso',
                subscription
            });
        }

    } catch (error) {
        console.error('Erro ao ativar licença:', error);
        res.status(500).json({ message: 'Erro ao ativar licença' });
    }
});

module.exports = router;
