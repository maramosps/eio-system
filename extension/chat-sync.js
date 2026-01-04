// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - CHAT SYNC (Extension)
// Sincroniza mensagens do Instagram com o Dashboard
// ═══════════════════════════════════════════════════════════

class ChatSync {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.messageObserver = null;
        this.conversationMap = new Map(); // username -> conversationId
        this.API_URL = 'https://eio-system.vercel.app';

        this.init();
    }

    async init() {
        console.log('🔄 Iniciando ChatSync...');

        // Conectar WebSocket
        await this.connectWebSocket();

        // Observar mensagens do Instagram
        this.observeInstagramMessages();

        // Escutar comandos do dashboard
        this.listenToDashboardCommands();
    }

    // ═══════════════════════════════════════════════════════════
    // WEBSOCKET CONNECTION
    // ═══════════════════════════════════════════════════════════

    async connectWebSocket() {
        try {
            const token = await this.getAuthToken();
            const userId = await this.getUserId();

            if (!token || !userId) {
                console.warn('⚠️ Usuário não autenticado - ChatSync desabilitado');
                return;
            }

            // Carregar Socket.IO
            if (typeof io === 'undefined') {
                await this.loadSocketIO();
            }

            this.socket = io(this.API_URL, {
                auth: { token }
            });

            this.socket.on('connect', () => {
                console.log('✅ ChatSync conectado');
                this.isConnected = true;
                this.socket.emit('authenticate', { userId, token });
            });

            this.socket.on('disconnect', () => {
                console.log('👋 ChatSync desconectado');
                this.isConnected = false;
            });

            this.socket.on('send_to_instagram', (data) => {
                this.sendInstagramDM(data);
            });

            this.socket.on('error', (error) => {
                console.error('❌ ChatSync error:', error);
            });

        } catch (error) {
            console.error('❌ Erro ao conectar WebSocket:', error);
        }
    }

    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // INSTAGRAM MESSAGE OBSERVER
    // ═══════════════════════════════════════════════════════════

    observeInstagramMessages() {
        // Observar mudanças no DOM para detectar novas mensagens
        const targetNode = document.body;

        const config = {
            childList: true,
            subtree: true
        };

        this.messageObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    this.checkForNewMessages(mutation.addedNodes);
                }
            }
        });

        this.messageObserver.observe(targetNode, config);
        console.log('👀 Observando mensagens do Instagram...');
    }

    checkForNewMessages(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Detectar mensagens do Instagram (seletores podem variar)
                const messages = node.querySelectorAll('[role="listitem"]');

                messages.forEach(msgElement => {
                    this.processMessage(msgElement);
                });
            }
        });
    }

    async processMessage(msgElement) {
        try {
            // Extrair dados da mensagem
            const messageData = this.extractMessageData(msgElement);

            if (!messageData || messageData.isOwnMessage) {
                return; // Ignorar mensagens próprias
            }

            // Verificar se já foi processada
            if (msgElement.dataset.eioChatSynced) {
                return;
            }

            msgElement.dataset.eioChatSynced = 'true';

            // Obter ou criar conversa
            const conversationId = await this.getOrCreateConversation(messageData.username);

            // Enviar para backend
            if (this.isConnected && this.socket) {
                this.socket.emit('new_message_from_instagram', {
                    userId: await this.getUserId(),
                    conversationId: conversationId,
                    message: {
                        id: messageData.id,
                        text: messageData.text,
                        timestamp: messageData.timestamp
                    }
                });

                console.log('📨 Mensagem enviada para dashboard:', messageData.text);
            }

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    }

    extractMessageData(msgElement) {
        try {
            // NOTA: Estes seletores podem precisar ser ajustados
            // baseado na estrutura atual do Instagram

            const textElement = msgElement.querySelector('[dir="auto"]');
            const text = textElement?.textContent || '';

            // Verificar se é mensagem própria
            const isOwnMessage = msgElement.closest('[data-testid="message-container-you"]') !== null;

            // Extrair username do cabeçalho da conversa
            const username = this.getCurrentConversationUsername();

            return {
                id: `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: text,
                timestamp: new Date().toISOString(),
                username: username,
                isOwnMessage: isOwnMessage
            };

        } catch (error) {
            console.error('❌ Erro ao extrair dados da mensagem:', error);
            return null;
        }
    }

    getCurrentConversationUsername() {
        // Tentar extrair username da URL ou do cabeçalho
        const urlMatch = window.location.pathname.match(/\/direct\/t\/([^\/]+)/);
        if (urlMatch) {
            return urlMatch[1];
        }

        // Fallback: tentar extrair do cabeçalho
        const headerElement = document.querySelector('header a[href*="/"]');
        if (headerElement) {
            const href = headerElement.getAttribute('href');
            const match = href.match(/\/([^\/]+)\/?$/);
            if (match) {
                return match[1];
            }
        }

        return 'unknown';
    }

    async getOrCreateConversation(username) {
        // Verificar cache
        if (this.conversationMap.has(username)) {
            return this.conversationMap.get(username);
        }

        // Buscar ou criar no backend
        try {
            const userId = await this.getUserId();
            const followerData = await this.getFollowerData(username);

            // Criar conversa via WebSocket
            const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (this.isConnected && this.socket) {
                this.socket.emit('start_conversation', {
                    userId: userId,
                    followerUsername: username,
                    followerData: followerData
                });
            }

            this.conversationMap.set(username, conversationId);
            return conversationId;

        } catch (error) {
            console.error('❌ Erro ao criar conversa:', error);
            return `conv_${username}`;
        }
    }

    async getFollowerData(username) {
        // Tentar extrair dados do perfil
        try {
            const avatarElement = document.querySelector('header img[alt*="profile"]');
            const nameElement = document.querySelector('header h1, header h2');

            return {
                name: nameElement?.textContent || username,
                avatar: avatarElement?.src || null
            };
        } catch (error) {
            return {
                name: username,
                avatar: null
            };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SEND MESSAGE TO INSTAGRAM
    // ═══════════════════════════════════════════════════════════

    async sendInstagramDM(data) {
        try {
            console.log('📤 Enviando mensagem para Instagram:', data);

            const { conversationId, text, messageId } = data;

            // Encontrar input de mensagem
            const messageInput = document.querySelector('textarea[placeholder*="Message"], textarea[placeholder*="Mensagem"]');

            if (!messageInput) {
                console.error('❌ Input de mensagem não encontrado');
                return;
            }

            // Simular digitação humana
            await this.typeMessage(messageInput, text);

            // Aguardar um pouco
            await this.sleep(500);

            // Encontrar e clicar no botão de enviar
            const sendButton = document.querySelector('button[type="submit"]');

            if (sendButton) {
                sendButton.click();
                console.log('✅ Mensagem enviada no Instagram');
            } else {
                // Fallback: pressionar Enter
                const event = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    bubbles: true
                });
                messageInput.dispatchEvent(event);
            }

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
        }
    }

    async typeMessage(input, text) {
        // Simular digitação humana
        input.focus();

        // Definir valor
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        ).set;

        nativeInputValueSetter.call(input, text);

        // Disparar eventos
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD COMMANDS
    // ═══════════════════════════════════════════════════════════

    listenToDashboardCommands() {
        // Escutar mensagens do background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'CHAT_SEND_MESSAGE') {
                this.sendInstagramDM(message.data);
                sendResponse({ success: true });
            }
            return true;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    async getAuthToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['accessToken'], (result) => {
                resolve(result.accessToken);
            });
        });
    }

    async getUserId() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['user'], (result) => {
                const user = result.user ? JSON.parse(result.user) : null;
                resolve(user?.id);
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ═══════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════

    destroy() {
        if (this.messageObserver) {
            this.messageObserver.disconnect();
        }

        if (this.socket) {
            this.socket.disconnect();
        }

        console.log('🛑 ChatSync desativado');
    }
}

// ═══════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════

// Inicializar apenas se estiver no Instagram Direct
if (window.location.hostname.includes('instagram.com') &&
    window.location.pathname.includes('/direct')) {

    // Aguardar página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.eioChatSync = new ChatSync();
        });
    } else {
        window.eioChatSync = new ChatSync();
    }
}

console.log('✅ ChatSync module loaded');
