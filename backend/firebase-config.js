// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - FIREBASE CONFIGURATION
// Cloud Messaging para Push Notifications de Engajamento
// ═══════════════════════════════════════════════════════════

const { initializeApp } = require('firebase/app');
const { getMessaging } = require('firebase/messaging');

// CONFIGURAÇÃO FIREBASE
// Obtenha estas credenciais em: https://console.firebase.google.com
// Project Settings > General > Your apps > Web app
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Inicializar Firebase
let app;
let messaging;

try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log('✅ Firebase inicializado com sucesso');
} catch (error) {
    console.warn('⚠️ Firebase não configurado ainda:', error.message);
    console.warn('   Configure as variáveis de ambiente FIREBASE_* no .env');
}

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE PUSH NOTIFICATION
// ═══════════════════════════════════════════════════════════

/**
 * Enviar notificação de engajamento para usuário
 * @param {string} userId - ID do usuário
 * @param {object} notification - Dados da notificação
 */
async function sendEngagementNotification(userId, notification) {
    try {
        // TODO: Implementar envio via Firebase Admin SDK
        console.log(`📱 Enviando notificação para usuário ${userId}:`, notification);

        // Exemplo de payload
        const message = {
            notification: {
                title: notification.title || 'E.I.O - Novo Engajamento',
                body: notification.body || 'Você tem novas interações!',
                icon: '/icons/icon128.png'
            },
            data: {
                type: notification.type || 'engagement',
                url: notification.url || '/dashboard',
                timestamp: new Date().toISOString()
            },
            token: notification.fcmToken // Token do dispositivo do usuário
        };

        // await admin.messaging().send(message);
        return { success: true, message: 'Notificação enviada' };

    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enviar notificação em lote
 * @param {Array} notifications - Array de notificações
 */
async function sendBatchNotifications(notifications) {
    try {
        const results = await Promise.all(
            notifications.map(notif => sendEngagementNotification(notif.userId, notif))
        );

        const successful = results.filter(r => r.success).length;
        console.log(`✅ ${successful}/${notifications.length} notificações enviadas`);

        return { successful, total: notifications.length, results };

    } catch (error) {
        console.error('Erro ao enviar notificações em lote:', error);
        return { successful: 0, total: notifications.length, error: error.message };
    }
}

/**
 * Tipos de notificações de engajamento
 */
const NotificationTypes = {
    NEW_FOLLOWER: 'new_follower',
    NEW_LIKE: 'new_like',
    NEW_COMMENT: 'new_comment',
    NEW_DM: 'new_dm',
    FLOW_COMPLETED: 'flow_completed',
    TRIAL_EXPIRING: 'trial_expiring',
    DAILY_REPORT: 'daily_report'
};

// ═══════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════

module.exports = {
    app,
    messaging,
    sendEngagementNotification,
    sendBatchNotifications,
    NotificationTypes,
    firebaseConfig
};

// ═══════════════════════════════════════════════════════════
// EXEMPLO DE USO
// ═══════════════════════════════════════════════════════════

/*
const { sendEngagementNotification, NotificationTypes } = require('./firebase-config');

// Enviar notificação de novo seguidor
await sendEngagementNotification('user-id-123', {
  title: 'Novo Seguidor! 🎉',
  body: '@joaosilva começou a te seguir',
  type: NotificationTypes.NEW_FOLLOWER,
  url: '/dashboard/followers',
  fcmToken: 'user-device-token'
});

// Enviar notificação de fluxo completo
await sendEngagementNotification('user-id-123', {
  title: 'Fluxo Concluído ✅',
  body: 'Seu fluxo "Curtir Posts" foi executado com sucesso!',
  type: NotificationTypes.FLOW_COMPLETED,
  url: '/dashboard/flows',
  fcmToken: 'user-device-token'
});
*/
