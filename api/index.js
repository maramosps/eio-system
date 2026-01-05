const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Supabase Client
let supabase = null;
try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
} catch (e) {
    console.error('Erro ao criar cliente Supabase:', e);
}

const jwtSecret = process.env.JWT_SECRET || 'eio-secret-key-2026';

// Rota handler
module.exports = async (req, res) => {
    const { method, query } = req;

    // Reconstruir a URL completa a partir do query param 'path'
    const pathFromQuery = query?.path || '';
    const path = `/api/${pathFromQuery}`.replace(/\/+$/, ''); // Remove trailing slashes

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Health Check
        if (path === '/api/health' || path === '/api' || pathFromQuery === 'health') {
            return res.json({
                status: 'OK',
                message: 'E.I.O System API está rodando',
                timestamp: new Date().toISOString(),
                supabaseConfigured: !!supabase,
                path: path,
                pathFromQuery: pathFromQuery
            });
        }

        // Register
        if ((path === '/api/v1/auth/register' || pathFromQuery === 'v1/auth/register') && method === 'POST') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            const { name, email, password } = req.body || {};

            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
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
                    password_hash: hashedPassword,
                    created_at: new Date().toISOString(),
                    is_active: true
                }])
                .select()
                .single();

            if (error) {
                return res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
            }

            // Criar assinatura trial
            await supabase.from('subscriptions').insert([{
                user_id: newUser.id,
                plan: 'trial',
                status: 'active',
                expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            }]);

            return res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                user: { id: newUser.id, name: newUser.name, email: newUser.email }
            });
        }

        // Login
        if ((path === '/api/v1/auth/login' || pathFromQuery === 'v1/auth/login') && method === 'POST') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            const { email, password } = req.body || {};

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
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            // Gerar token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                jwtSecret,
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                token,
                user: { id: user.id, name: user.name, email: user.email }
            });
        }

        // Extension Login
        if ((path === '/api/v1/auth/extension-login' || pathFromQuery === 'v1/auth/extension-login') && method === 'POST') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            const { email, password } = req.body || {};

            if (!email || !password) {
                return res.status(400).json({ message: 'Email e senha são obrigatórios' });
            }

            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (!user) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .single();

            const trialStartDate = new Date(user.created_at);
            const trialEndDate = new Date(trialStartDate);
            trialEndDate.setDate(trialEndDate.getDate() + 5);

            const now = new Date();
            const isTrialActive = now < trialEndDate;
            const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                jwtSecret,
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                token,
                user: { id: user.id, name: user.name, email: user.email },
                subscription: subscription ? {
                    status: subscription.status,
                    plan: subscription.plan,
                    expiresAt: subscription.expires_at
                } : null,
                isTrialActive,
                isPaid,
                daysRemaining: isTrialActive ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0
            });
        }

        // License Validate
        if ((path === '/api/v1/license/validate' || pathFromQuery === 'v1/license/validate') && method === 'POST') {
            const { email } = req.body || {};

            if (!email || !supabase) {
                return res.status(400).json({ success: false, message: 'Email é obrigatório' });
            }

            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            }

            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .single();

            const trialEndDate = new Date(user.created_at);
            trialEndDate.setDate(trialEndDate.getDate() + 5);

            const now = new Date();
            const isTrialActive = now < trialEndDate;
            const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

            return res.json({
                success: true,
                isValid: isTrialActive || isPaid,
                isTrialActive,
                isPaid,
                daysRemaining: isTrialActive ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0
            });
        }

        // Not found
        return res.status(404).json({ message: 'Rota não encontrada', path: path, pathFromQuery: pathFromQuery });

    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ message: 'Erro interno', error: error.message });
    }
};
