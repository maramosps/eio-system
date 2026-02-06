const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Supabase Client - Importação centralizada com Safe Init
const { supabase, getStatus } = require('../src/services/supabase');

const jwtSecret = process.env.JWT_SECRET || 'eio-secret-key-2026';

// Rota handler
module.exports = async (req, res) => {
    const { method, query } = req;

    // Reconstruir a URL completa a partir do query param 'path'
    const pathFromQuery = query?.path || '';
    const path = `/api/${pathFromQuery}`.replace(/\/+$/, ''); // Remove trailing slashes

    // CORS e Content-Type
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json'); // Sempre JSON

    if (method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // ═══════════════════════════════════════════════════════════
        // HEALTH CHECK PROFISSIONAL - Diagnóstico de Infraestrutura
        // ═══════════════════════════════════════════════════════════
        if (path === '/api/health' || path === '/api' || pathFromQuery === 'health') {
            // Obter status de inicialização do Supabase (Safe Init)
            const supabaseStatus = getStatus();

            // Verificação de variáveis de ambiente (sem expor valores)
            const envCheck = {
                SUPABASE_URL: supabaseStatus.config.url ? 'Configurado ✅' : 'Faltando ❌',
                SUPABASE_SERVICE_KEY: supabaseStatus.config.hasServiceKey ? 'Configurado ✅' : 'Faltando ❌',
                SUPABASE_ANON_KEY: supabaseStatus.config.hasAnonKey ? 'Configurado ✅' : 'Faltando ❌',
                JWT_SECRET: process.env.JWT_SECRET ? 'Configurado ✅' : 'Faltando ❌',
                NODE_ENV: supabaseStatus.config.nodeEnv || 'development'
            };

            // Usar status do Safe Init para determinar saúde
            const isHealthy = supabaseStatus.initialized && supabaseStatus.hasClient;
            const missingVars = supabaseStatus.missingVars || [];

            return res.status(isHealthy ? 200 : 503).json({
                status: isHealthy ? 'online' : 'degraded',
                message: isHealthy
                    ? 'E.I.O System API está pronta para produção'
                    : supabaseStatus.error || `${missingVars.length} variável(eis) de ambiente não configurada(s)`,
                version: '4.4.5',
                timestamp: new Date().toISOString(),
                env_check: envCheck,
                database: {
                    supabase_client: supabaseStatus.hasClient ? 'Inicializado ✅' : 'Não inicializado ❌',
                    initialized: supabaseStatus.initialized,
                    error: supabaseStatus.error,
                    missing_vars: missingVars
                },
                docs: {
                    deploy_guide: '/docs/DEPLOY_GUIA.md',
                    support: 'https://wa.me/5521975312662'
                }
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

            // 🚨 EMERGENCY BYPASS: Permitir login direto para o dono (devido a falha de chaves de serviço) 🚨
            if (email === 'maramosps@gmail.com') {
                console.log('⚠️ Emergency login bypass for:', email);
                const mockUserId = '92c27d1c-e160-4a3a-a577-032b6befce05'; // ID real do banco
                const token = jwt.sign(
                    { userId: mockUserId, email: email, role: 'admin' },
                    jwtSecret,
                    { expiresIn: '30d' }
                );
                return res.json({
                    success: true,
                    token,
                    user: { id: mockUserId, name: 'Admin', email: email, role: 'admin' }
                });
            }

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
                { userId: user.id, email: user.email, role: user.role || 'user' },
                jwtSecret,
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' }
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
                { userId: user.id, email: user.email, role: user.role || 'user' },
                jwtSecret,
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' },
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

        // ═══════════════════════════════════════════════════════════
        // NOVO: Extension Login por @ do Instagram
        // Verifica se o @ está cadastrado em algum usuário
        // ═══════════════════════════════════════════════════════════
        if ((path === '/api/v1/auth/instagram-login' || pathFromQuery === 'v1/auth/instagram-login') && method === 'POST') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            const { instagram_handle } = req.body || {};

            if (!instagram_handle) {
                return res.status(400).json({ message: '@ do Instagram é obrigatório' });
            }

            // Normalizar o handle (remover @ se existir, lowercase)
            const normalizedHandle = instagram_handle.replace('@', '').toLowerCase().trim();

            if (!normalizedHandle) {
                return res.status(400).json({ message: '@ do Instagram inválido' });
            }

            // Buscar se existe uma conta com este Instagram cadastrado
            const { data: account, error: accountError } = await supabase
                .from('instagram_accounts')
                .select('*, users(*)')
                .eq('instagram_handle', normalizedHandle)
                .single();

            if (accountError || !account) {
                // Tentar buscar na tabela users pelo campo instagram_handle
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('instagram_handle', normalizedHandle)
                    .single();

                if (userError || !user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Este @ do Instagram não está cadastrado no sistema. Entre em contato com o suporte ou cadastre-se pelo dashboard.',
                        code: 'INSTAGRAM_NOT_FOUND'
                    });
                }

                // Usuário encontrado pelo campo instagram_handle na tabela users
                const { data: subscription } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                const trialStartDate = new Date(user.created_at);
                const standardTrialEndDate = new Date(trialStartDate);
                standardTrialEndDate.setDate(standardTrialEndDate.getDate() + 5);

                const trialEndDate = (subscription && (subscription.expires_at || subscription.trial_end))
                    ? new Date(subscription.expires_at || subscription.trial_end)
                    : standardTrialEndDate;

                const now = new Date();
                const isTrialActive = now < trialEndDate;
                const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

                if (!isTrialActive && !isPaid) {
                    return res.status(403).json({
                        success: false,
                        message: 'Sua licença expirou. Renove sua assinatura para continuar usando.',
                        code: 'LICENSE_EXPIRED'
                    });
                }

                const token = jwt.sign(
                    { userId: user.id, email: user.email, instagram: normalizedHandle },
                    jwtSecret,
                    { expiresIn: '30d' }
                );

                return res.json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        instagram_handle: normalizedHandle
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
            }

            // Conta Instagram encontrada com usuário vinculado
            const user = account.users;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Conta Instagram não está vinculada a nenhum usuário.',
                    code: 'NO_USER_LINKED'
                });
            }

            // Verificar se a conta está ativa
            if (account.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Esta conta Instagram está desativada. Entre em contato com o suporte.',
                    code: 'ACCOUNT_DISABLED'
                });
            }

            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .single();

            const trialStartDate = new Date(user.created_at);
            const standardTrialEndDate = new Date(trialStartDate);
            standardTrialEndDate.setDate(standardTrialEndDate.getDate() + 5);

            const trialEndDate = (subscription && (subscription.expires_at || subscription.trial_end))
                ? new Date(subscription.expires_at || subscription.trial_end)
                : standardTrialEndDate;

            const now = new Date();
            const isTrialActive = now < trialEndDate;
            const isPaid = subscription && subscription.status === 'active' && subscription.plan !== 'trial';

            if (!isTrialActive && !isPaid) {
                return res.status(403).json({
                    success: false,
                    message: 'Sua licença expirou. Renove sua assinatura para continuar usando.',
                    code: 'LICENSE_EXPIRED'
                });
            }

            const token = jwt.sign(
                { userId: user.id, email: user.email, instagram: normalizedHandle },
                jwtSecret,
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    instagram_handle: normalizedHandle
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

        // Extension Info
        if ((path === '/api/v1/extension/info' || pathFromQuery === 'v1/extension/info') && method === 'GET') {
            return res.json({
                success: true,
                data: {
                    version: '4.4.5',
                    size: '1.7 MB',
                    available: true,
                    lastUpdate: new Date().toISOString(),
                    downloadUrl: '/downloads/eio-extension-v4.4.5.zip'
                }
            });
        }

        // Extension Download - Retorna instruções
        if ((path === '/api/v1/extension/download' || pathFromQuery === 'v1/extension/download') && method === 'GET') {
            // Por enquanto, retornar instruções de como obter a extensão
            return res.json({
                success: true,
                message: 'Para baixar a extensão, entre em contato com o suporte ou acesse o painel administrativo.',
                instructions: [
                    '1. Entre em contato com suporte@eio.com',
                    '2. Ou acesse: https://github.com/ms-assessoria-digital/eio-extension',
                    '3. Baixe o arquivo .zip da última versão'
                ]
            });
        }

        // ═══════════════════════════════════════════════════════════
        // GERENCIAMENTO DE CONTAS INSTAGRAM (Dashboard)
        // ═══════════════════════════════════════════════════════════

        // Listar contas Instagram do usuário
        if ((path === '/api/v1/instagram/accounts' || pathFromQuery === 'v1/instagram/accounts') && method === 'GET') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            // Verificar token
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(401).json({ message: 'Token não fornecido' });
            }

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);

                const { data: accounts, error } = await supabase
                    .from('instagram_accounts')
                    .select('*')
                    .eq('user_id', decoded.userId)
                    .order('created_at', { ascending: false });

                return res.json({
                    success: true,
                    accounts: accounts || [],
                    count: (accounts || []).length,
                    limit: 1
                });
            } catch (err) {
                return res.status(401).json({ message: 'Token inválido' });
            }
        }

        // Adicionar conta Instagram
        if ((path === '/api/v1/instagram/accounts' || pathFromQuery === 'v1/instagram/accounts') && method === 'POST') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(401).json({ message: 'Token não fornecido' });
            }

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);

                const { instagram_handle } = req.body || {};

                if (!instagram_handle) {
                    return res.status(400).json({ message: '@ do Instagram é obrigatório' });
                }

                // Normalizar handle
                const normalizedHandle = instagram_handle.replace('@', '').toLowerCase().trim();

                if (!/^[a-z0-9_.]+$/.test(normalizedHandle)) {
                    return res.status(400).json({ message: '@ do Instagram inválido. Use apenas letras, números, _ e .' });
                }

                // Verificar limite de 2 contas
                const { data: existingAccounts } = await supabase
                    .from('instagram_accounts')
                    .select('id')
                    .eq('user_id', decoded.userId);

                if ((existingAccounts || []).length >= 1) {
                    return res.status(400).json({
                        message: 'Limite de 1 conta atingido. Remova a conta atual antes de adicionar outra.',
                        code: 'LIMIT_REACHED'
                    });
                }

                // Verificar se já existe este @ para qualquer usuário
                const { data: alreadyExists } = await supabase
                    .from('instagram_accounts')
                    .select('id')
                    .eq('instagram_handle', normalizedHandle)
                    .single();

                if (alreadyExists) {
                    return res.status(400).json({
                        message: 'Este @ já está cadastrado em outra conta.',
                        code: 'ALREADY_EXISTS'
                    });
                }

                // Inserir nova conta
                const { data: newAccount, error } = await supabase
                    .from('instagram_accounts')
                    .insert([{
                        user_id: decoded.userId,
                        instagram_handle: normalizedHandle,
                        status: 'active',
                        connected_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('Erro ao inserir conta:', error);
                    return res.status(500).json({ message: 'Erro ao cadastrar conta', error: error.message });
                }

                return res.status(201).json({
                    success: true,
                    message: 'Conta cadastrada com sucesso!',
                    account: newAccount
                });
            } catch (err) {
                console.error('Erro:', err);
                return res.status(401).json({ message: 'Token inválido' });
            }
        }

        // ═══════════════════════════════════════════════════════════
        // NOVAS ROTAS PARA EXTENSÃO
        // ═══════════════════════════════════════════════════════════

        // Sincronização de Leads (CRM)
        if ((path === '/api/v1/leads/batch' || pathFromQuery === 'v1/leads/batch') && method === 'POST') {
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(401).json({ success: false, message: 'Token não fornecido' });
            }

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);
                const { leads } = req.body;

                if (!leads || !Array.isArray(leads)) {
                    return res.status(400).json({ success: false, message: 'Dados de leads inválidos' });
                }

                // Inserir leads no Supabase
                const { error } = await supabase
                    .from('leads')
                    .insert(leads.map(l => ({
                        user_id: decoded.userId,
                        username: l.username,
                        full_name: l.name,
                        avatar_url: l.avatar,
                        status: 'new',
                        extracted_at: new Date().toISOString()
                    })));

                if (error) throw error;

                return res.json({
                    success: true,
                    message: `${leads.length} leads sincronizados com sucesso`
                });
            } catch (err) {
                console.error('Lead sync error:', err);
                return res.status(401).json({ success: false, message: 'Token inválido ou erro no banco' });
            }
        }

        // Analytics Dashboard
        if ((path === '/api/v1/analytics/dashboard' || pathFromQuery === 'v1/analytics/dashboard') && method === 'GET') {
            const authHeader = req.headers['authorization'];
            if (!authHeader) return res.status(401).json({ success: false });

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);

                // Buscar logs do usuário
                const { data: logs, error } = await supabase
                    .from('logs')
                    .select('*')
                    .eq('user_id', decoded.userId)
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (error) throw error;

                // Calcular estatísticas básicas para o dashboard
                const stats = {
                    follows: logs.filter(l => l.action === 'follow' || (l.message && l.message.includes('FOLLOW'))).length,
                    likes: logs.filter(l => l.action === 'like' || (l.message && l.message.includes('LIKE'))).length,
                    comments: logs.filter(l => l.action === 'comment').length,
                    unfollows: logs.filter(l => l.action === 'unfollow').length
                };

                return res.json({
                    success: true,
                    stats,
                    recent_activity: logs
                });
            } catch (err) {
                return res.status(401).json({ success: false });
            }
        }

        // Logs da Extensão
        if ((path === '/api/v1/logs' || pathFromQuery === 'v1/logs') && method === 'POST') {
            const authHeader = req.headers['authorization'];
            if (!authHeader) return res.status(401).json({ success: false });

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);
                const { level, message, meta } = req.body;

                await supabase.from('logs').insert([{
                    user_id: decoded.userId,
                    level,
                    message,
                    meta,
                    created_at: new Date().toISOString()
                }]);

                return res.json({ success: true });
            } catch (err) {
                return res.status(401).json({ success: false });
            }
        }

        // Logs de Execução de Ações
        if ((path === '/api/v1/executions/log' || pathFromQuery === 'v1/executions/log') && method === 'POST') {
            const authHeader = req.headers['authorization'];
            if (!authHeader) return res.status(401).json({ success: false });

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);
                const { action, result, timestamp } = req.body;

                await supabase.from('logs').insert([{
                    user_id: decoded.userId,
                    level: 'success',
                    action,
                    message: `${action.toUpperCase()} em @${result?.username || 'perfil'}`,
                    meta: result,
                    created_at: timestamp || new Date().toISOString()
                }]);

                return res.json({ success: true });
            } catch (err) {
                return res.status(401).json({ success: false });
            }
        }

        // Remover conta Instagram
        if ((path.startsWith('/api/v1/instagram/accounts/') || pathFromQuery.startsWith('v1/instagram/accounts/')) && method === 'DELETE') {
            if (!supabase) {
                return res.status(500).json({ message: 'Banco de dados não configurado' });
            }

            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(401).json({ message: 'Token não fornecido' });
            }

            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, jwtSecret);

                // Extrair o ID ou handle da URL
                const accountId = path.split('/').pop() || pathFromQuery.split('/').pop();

                const { error } = await supabase
                    .from('instagram_accounts')
                    .delete()
                    .eq('user_id', decoded.userId)
                    .eq('id', accountId);

                if (error) {
                    return res.status(500).json({ message: 'Erro ao remover conta', error: error.message });
                }

                return res.json({
                    success: true,
                    message: 'Conta removida com sucesso!'
                });
            } catch (err) {
                return res.status(401).json({ message: 'Token inválido' });
            }
        }

        // Not found
        return res.status(404).json({ message: 'Rota não encontrada', path: path, pathFromQuery: pathFromQuery });

    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ message: 'Erro interno', error: error.message });
    }
};
