/*
═══════════════════════════════════════════════════════════
  E.I.O - SOCKET.IO SERVICE
  Serviço de WebSocket para comunicação em tempo real
═══════════════════════════════════════════════════════════
*/

const { verifyAccessToken } = require('../utils/jwt');

let io;
const connectedClients = new Map();

/**
 * Inicializar Socket.IO
 */
function initializeSocketIO(socketIO) {
    io = socketIO;

    // Middleware de autenticação
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = verifyAccessToken(token);
            socket.userId = decoded.sub;
            socket.userEmail = decoded.email;

            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    // Event handlers
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Adicionar cliente à lista
        connectedClients.set(socket.userId, socket.id);

        // Join user room
        socket.join(`user:${socket.userId}`);

        // Subscribe to execution
        socket.on('subscribe:execution', (executionId) => {
            socket.join(`execution:${executionId}`);
            console.log(`User ${socket.userId} subscribed to execution ${executionId}`);
        });

        // Unsubscribe from execution
        socket.on('unsubscribe:execution', (executionId) => {
            socket.leave(`execution:${executionId}`);
            console.log(`User ${socket.userId} unsubscribed from execution ${executionId}`);
        });

        // Ping/pong for connection keepalive
        socket.on('ping', () => {
            socket.emit('pong');
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
            connectedClients.delete(socket.userId);
        });
    });

    console.log('✓ Socket.IO initialized');
}

/**
 * Emitir evento para usuário específico
 */
function emitToUser(userId, event, data) {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
}

/**
 * Emitir evento para execução específica
 */
function emitToExecution(executionId, event, data) {
    if (io) {
        io.to(`execution:${executionId}`).emit(event, data);
    }
}

/**
 * Emitir para todos os clientes
 */
function emitToAll(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

/**
 * Verificar se usuário está conectado
 */
function isUserConnected(userId) {
    return connectedClients.has(userId);
}

/**
 * Atualizar estatísticas em tempo real
 */
function sendStatsUpdate(userId, stats) {
    emitToUser(userId, 'stats:update', stats);
}

/**
 * Enviar log em tempo real
 */
function sendLogEntry(userId, log) {
    emitToUser(userId, 'log:entry', log);
}

/**
 * Atualizar status de execução
 */
function sendExecutionStatus(executionId, status) {
    emitToExecution(executionId, 'execution:status', status);
}

/**
 * Enviar notificação
 */
function sendNotification(userId, notification) {
    emitToUser(userId, 'notification', notification);
}

module.exports = {
    initializeSocketIO,
    emitToUser,
    emitToExecution,
    emitToAll,
    isUserConnected,
    sendStatsUpdate,
    sendLogEntry,
    sendExecutionStatus,
    sendNotification
};
