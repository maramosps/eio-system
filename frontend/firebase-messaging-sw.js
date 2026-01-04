// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - FIREBASE SERVICE WORKER
// Service Worker para receber notificações em background
// ═══════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração Firebase (mesma do firebase-config.js)
// IMPORTANTE: Substituir pelos valores reais do Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ═══════════════════════════════════════════════════════════
// HANDLER DE NOTIFICAÇÕES EM BACKGROUND
// ═══════════════════════════════════════════════════════════

messaging.onBackgroundMessage((payload) => {
    console.log('📱 Notificação recebida em background:', payload);

    const notificationTitle = payload.notification.title || 'E.I.O System';
    const notificationOptions = {
        body: payload.notification.body || 'Nova notificação',
        icon: payload.notification.icon || '/icons/icon128.png',
        badge: '/icons/icon32.png',
        data: payload.data,
        tag: payload.data?.type || 'default',
        requireInteraction: false,
        vibrate: [200, 100, 200]
    };

    // Mostrar notificação
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// ═══════════════════════════════════════════════════════════
// HANDLER DE CLIQUE NA NOTIFICAÇÃO
// ═══════════════════════════════════════════════════════════

self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notificação clicada:', event.notification);

    event.notification.close();

    // Abrir URL específica ou dashboard
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Se já existe uma janela aberta, focar nela
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Caso contrário, abrir nova janela
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

console.log('✅ Firebase Service Worker carregado');
