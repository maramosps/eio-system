const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Registrar novo usuário
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validações
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
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          created_at: new Date().toISOString(),
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({ message: 'Erro ao criar usuário' });
    }

    // Criar assinatura de trial
    await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: newUser.id,
          plan: 'trial',
          status: 'active',
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 dias
        }
      ]);

    console.log('✅ Novo usuário criado:', email);

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
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login de usuário
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validações
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

    // Atualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Gerar token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'eio-secret-key-2026',
      { expiresIn: '30d' }
    );

    console.log('✅ Login realizado:', email);

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
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

/**
 * @route   POST /api/v1/auth/extension-login
 * @desc    Login específico para extensão
 * @access  Public
 */
router.post('/extension-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validações
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

    // Atualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

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
      process.env.JWT_SECRET || 'eio-secret-key-2026',
      { expiresIn: '30d' }
    );

    console.log('✅ Login extensão realizado:', email);

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
      trialStartDate: trialStartDate.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      isTrialActive,
      isPaid,
      daysRemaining: isTrialActive ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0
    });

  } catch (error) {
    console.error('Erro no login da extensão:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Obter usuário atual
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'eio-secret-key-2026');

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, created_at, last_login')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
});

module.exports = router;
