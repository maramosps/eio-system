const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://eio-system.vercel.app',
        'chrome-extension://*'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend e downloads
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/downloads', express.static(path.join(__dirname, '../public/downloads')));
app.use('/eio-extension-v4.4.5.zip', express.static(path.join(__dirname, '../public/downloads/eio-extension-v4.4.5.zip')));

// Rotas da API
const authRoutes = require('./src/routes/auth.routes');
const licenseRoutes = require('./src/routes/license.routes');
const leadRoutes = require('./src/routes/lead.routes');
const adminRoutes = require('./src/routes/admin.routes');
const userRoutes = require('./src/routes/user.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/license', licenseRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota de registro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Rota de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Rota de dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'E.I.O System API está rodando',
        timestamp: new Date().toISOString()
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🚀 E.I.O SYSTEM - BACKEND RODANDO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  ✅ Servidor: http://localhost:${PORT}`);
    console.log(`  ✅ API: http://localhost:${PORT}/api`);
    console.log(`  ✅ Health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('  📋 Rotas Disponíveis:');
    console.log(`     • POST /api/v1/auth/register - Criar conta`);
    console.log(`     • POST /api/v1/auth/login - Login dashboard`);
    console.log(`     • POST /api/v1/auth/extension-login - Login extensão`);
    console.log(`     • POST /api/v1/license/validate - Validar licença`);
    console.log('');
    console.log('  🔑 Credenciais de Teste:');
    console.log('     Email: teste@eio.com');
    console.log('     Senha: senha123');
    console.log('');
    console.log('  🌐 Frontend:');
    console.log(`     • Login: http://localhost:${PORT}/login`);
    console.log(`     • Registro: http://localhost:${PORT}/register`);
    console.log(`     • Dashboard: http://localhost:${PORT}/dashboard`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});

module.exports = app;
