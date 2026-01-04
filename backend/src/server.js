/*
═══════════════════════════════════════════════════════════
  E.I.O - BACKEND SERVER
  Servidor principal da API
═══════════════════════════════════════════════════════════
*/

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const winston = require('winston');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const flowRoutes = require('./routes/flow.routes');
const executionRoutes = require('./routes/execution.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const accountRoutes = require('./routes/account.routes');
const adminRoutes = require('./routes/admin.routes');
const webhookRoutes = require('./routes/webhook.routes');
const calendarRoutes = require('./routes/calendar.routes');
const crmRoutes = require('./routes/crm.routes');
const extensionRoutes = require('./routes/extension.routes'); // ✅ NOVO

// Import middlewares
const { errorHandler } = require('./middlewares/errorHandler');
const { authenticate, checkSubscription } = require('./middlewares/auth');

// Import services
const { initializeDatabase } = require('./database/connection');
const { initializeRedis } = require('./services/redis.service');
const { initializeSocketIO } = require('./services/socket.service');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
});

// Logger configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Sentry initialization (production only)
if (process.env.NODE_ENV === 'production') {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

// Security middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authenticate, userRoutes); // Perfil pode ser acessado para pagar
app.use('/api/v1/subscriptions', authenticate, subscriptionRoutes); // Billing pode ser acessado
app.use('/api/v1/extension', extensionRoutes); // ✅ NOVO - Download da extensão

// Rotas Bloqueadas por Assinatura
app.use('/api/v1/flows', authenticate, checkSubscription, flowRoutes);
app.use('/api/v1/executions', authenticate, checkSubscription, executionRoutes);
app.use('/api/v1/analytics', authenticate, checkSubscription, analyticsRoutes);
app.use('/api/v1/accounts', authenticate, checkSubscription, accountRoutes);
app.use('/api/v1/admin', authenticate, adminRoutes); // Admin tem bypass no middleware
app.use('/api/v1/calendar', authenticate, checkSubscription, calendarRoutes);
app.use('/api/v1/crm', authenticate, checkSubscription, crmRoutes);

// Webhooks (no authentication required)
app.use('/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Error handler (must be last)
if (process.env.NODE_ENV === 'production') {
    app.use(Sentry.Handlers.errorHandler());
}
app.use(errorHandler);

// Initialize services
async function initialize() {
    try {
        logger.info('Starting E.I.O Backend Server...');

        // Connect to database
        try {
            logger.info('Connecting to database...');
            await initializeDatabase();
            logger.info('✓ Database connected');
        } catch (dbError) {
            logger.warn('✗ Database connection failed. Running in partial mode (No DB features).');
        }

        // Connect to Redis
        try {
            logger.info('Connecting to Redis...');
            await initializeRedis();
            logger.info('✓ Redis connected');
        } catch (redisError) {
            logger.warn('✗ Redis connection failed. Running in partial mode (No Cache features).');
        }

        // Initialize Socket.IO
        logger.info('Initializing WebSocket server...');
        initializeSocketIO(io);
        logger.info('✓ WebSocket server initialized');

        // Start server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`✓ Server running on port ${PORT}`);
            logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info('✓ E.I.O Backend is ready for testing!');
        });
    } catch (error) {
        logger.error('Failed to initialize server:', error);
        // We still want to see the error but not necessarily exit if we can start basic express
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed');
        // Close database connections, Redis, etc.
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
initialize();

module.exports = { app, server, io };
