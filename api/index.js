const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'eio-secret-key-2026';

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'E.I.O System API está rodando',
        timestamp: new Date().toISOString(),
        supabaseConfigured: !!supabase,
        env: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            hasJwt: !!jwtSecret
        }
    });
});

// Register
app.post('/api/v1/auth/register', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ message: 'Banco de dados não configurado' });
        }

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
        }

        // Verificar se email já existe
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                password: hashedPassword,
                created_at: new Date().toISOString(),
                is_active: true
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar usuário:', error);
            return res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
        }

        // Criar assinatura de trial
        await supabase
            .from('subscriptions')
            .insert([{
                user_id: newUser.id,
                plan: 'trial',
                status: 'active',
                expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            }]);

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ message: 'Banco de dados não configurado' });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Gerar token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
});

// Extension Login
app.post('/api/v1/auth/extension-login', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ message: 'Banco de dados não configurado' });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Buscar assinatura
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Calcular período de teste
        const trialStartDate = new Date(user.created_at);
        const trialDays = 5;
        const trialEndDate = new Date(trialStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const now = new Date();
        const isTrialActive = now < trialEndDate;
        const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

        // Gerar token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            subscription: subscription ? {
                status: subscription.status,
                plan: subscription.plan,
                expiresAt: subscription.expires_at
            } : null,
            isTrialActive,
            isPaid,
            daysRemaining: isTrialActive ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0
        });

    } catch (error) {
        console.error('Erro no login da extensão:', error);
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
});

// License Validate
app.post('/api/v1/license/validate', async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email é obrigatório'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                message: 'Banco de dados não configurado'
            });
        }

        // Buscar usuário
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Buscar assinatura
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Calcular período de teste
        const trialStartDate = new Date(user.created_at);
        const trialEndDate = new Date(trialStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + 5);

        const now = new Date();
        const isTrialActive = now < trialEndDate;
        const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

        res.json({
            success: true,
            isValid: isTrialActive || isPaid,
            isTrialActive,
            isPaid,
            daysRemaining: isTrialActive ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0
        });

    } catch (error) {
        console.error('Erro na validação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro no servidor'
        });
    }
});

// Catch all
app.all('*', (req, res) => {
    res.status(404).json({
        message: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

module.exports = app;
