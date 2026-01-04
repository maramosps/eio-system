// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - CHAT JAVASCRIPT (Frontend)
// Gerencia interface de chat em tempo real
// ═══════════════════════════════════════════════════════════

let socket = null;
let currentConversation = null;
let conversations = [];

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
    setupEventListeners();
});

async function initializeChat() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        console.error('❌ Usuário não autenticado');
        window.location.href = 'login.html';
        return;
    }

    // Conectar WebSocket
    const API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://eio-system.vercel.app';

    socket = io(API_URL, {
        auth: { token }
    });

    setupSocketListeners(user.id, token);
}

// ═══════════════════════════════════════════════════════════
// WEBSOCKET LISTENERS
// ═══════════════════════════════════════════════════════════

function setupSocketListeners(userId, token) {
    socket.on('connect', () => {
        console.log('✅ Conectado ao chat');
        socket.emit('authenticate', { userId, token });
    });

    socket.on('conversations_loaded', (data) => {
        conversations = data;
        renderConversations();
        updateUnreadCount();
    });

    socket.on('new_message', (data) => {
        handleNewMessage(data);
    });

    socket.on('message_sent', (data) => {
        handleMessageSent(data);
    });

    socket.on('conversation_created', (data) => {
        conversations.unshift(data);
        renderConversations();
    });

    socket.on('send_to_instagram', (data) => {
        // Extensão vai capturar isso e enviar no Instagram
        console.log('📤 Enviar para Instagram:', data);
    });

    socket.on('error', (error) => {
        console.error('❌ Erro:', error);
        showToast(error.message || 'Erro no chat', 'error');
    });

    socket.on('disconnect', () => {
        console.log('👋 Desconectado do chat');
    });
}

// ═══════════════════════════════════════════════════════════
// RENDERIZAÇÃO
// ═══════════════════════════════════════════════════════════

function renderConversations() {
    const list = document.getElementById('conversationsList');

    if (conversations.length === 0) {
        list.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #666;">
                <p>Nenhuma conversa ainda</p>
                <p style="font-size: 0.85rem; margin-top: 8px;">
                    As conversas aparecerão aqui quando você receber mensagens
                </p>
            </div>
        `;
        return;
    }

    list.innerHTML = conversations.map(conv => `
        <div class="eio-conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}" 
             data-id="${conv.id}" 
             onclick="selectConversation('${conv.id}')">
            <img src="${conv.follower_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + conv.follower_username}" 
                 class="eio-conversation-avatar" 
                 alt="${conv.follower_name}">
            <div class="eio-conversation-info">
                <div class="eio-conversation-header">
                    <span class="eio-conversation-name">${conv.follower_name || conv.follower_username}</span>
                    <span class="eio-conversation-time">${formatTime(conv.updated_at)}</span>
                </div>
                <div class="eio-conversation-preview">${conv.last_message || 'Nova conversa'}</div>
                ${conv.unread_count > 0 ? `<span class="eio-conversation-unread">${conv.unread_count}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function selectConversation(conversationId) {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    currentConversation = conv;
    renderChatArea(conv);
    markAsRead(conversationId);
}

function renderChatArea(conv) {
    const chatMain = document.getElementById('chatMain');

    chatMain.innerHTML = `
        <div class="eio-chat-header">
            <div class="eio-chat-header-info">
                <img src="${conv.follower_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + conv.follower_username}" 
                     class="eio-chat-header-avatar" 
                     alt="${conv.follower_name}">
                <div>
                    <div class="eio-chat-header-name">${conv.follower_name || conv.follower_username}</div>
                    <div class="eio-chat-header-username">@${conv.follower_username}</div>
                </div>
            </div>
            <div class="eio-chat-actions">
                <button class="eio-whatsapp-btn" onclick="sendToWhatsApp('${conv.follower_username}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                </button>
                <button class="eio-icon-btn" onclick="archiveConversation('${conv.id}')" title="Arquivar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="21 8 21 21 3 21 3 8"></polyline>
                        <rect x="1" y="3" width="22" height="5"></rect>
                        <line x1="10" y1="12" x2="14" y2="12"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div class="eio-chat-messages" id="chatMessages">
            ${renderMessages(conv.messages || [])}
        </div>

        <div class="eio-chat-input-container">
            <div class="eio-chat-input-wrapper">
                <textarea class="eio-chat-input" 
                          id="messageInput" 
                          placeholder="Digite sua mensagem..." 
                          rows="1"
                          onkeypress="handleKeyPress(event)"></textarea>
                <button class="eio-chat-send-btn" onclick="sendMessage()" id="sendBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Auto-scroll para última mensagem
    setTimeout(() => {
        const messagesDiv = document.getElementById('chatMessages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 100);
}

function renderMessages(messages) {
    if (!messages || messages.length === 0) {
        return `
            <div style="text-align: center; color: #666; padding: 40px;">
                <p>Nenhuma mensagem ainda</p>
                <p style="font-size: 0.85rem; margin-top: 8px;">Envie a primeira mensagem!</p>
            </div>
        `;
    }

    return messages.map(msg => `
        <div class="eio-message ${msg.sender === 'user' ? 'sent' : ''}">
            <img src="${msg.sender === 'user' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=user' : currentConversation.follower_avatar}" 
                 class="eio-message-avatar" 
                 alt="">
            <div>
                <div class="eio-message-content">${escapeHtml(msg.content)}</div>
                <div class="eio-message-time">${formatTime(msg.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════════
// AÇÕES
// ═══════════════════════════════════════════════════════════

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text || !currentConversation) return;

    socket.emit('send_message', {
        conversationId: currentConversation.id,
        text
    });

    input.value = '';
    input.focus();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function handleNewMessage(data) {
    // Atualizar conversa
    const conv = conversations.find(c => c.id === data.conversationId);
    if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push(data.message);
        conv.last_message = data.message.content;
        conv.updated_at = data.message.timestamp;
        conv.unread_count++;

        // Re-renderizar se for a conversa atual
        if (currentConversation?.id === data.conversationId) {
            renderChatArea(conv);
        }

        renderConversations();
        updateUnreadCount();
    }
}

function handleMessageSent(data) {
    const conv = conversations.find(c => c.id === data.conversationId);
    if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push(data.message);
        conv.last_message = data.message.content;
        conv.updated_at = data.message.timestamp;

        if (currentConversation?.id === data.conversationId) {
            renderChatArea(conv);
        }

        renderConversations();
    }
}

function markAsRead(conversationId) {
    socket.emit('mark_as_read', { conversationId });

    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
        conv.unread_count = 0;
        renderConversations();
        updateUnreadCount();
    }
}

function sendToWhatsApp(username) {
    const phone = prompt('Digite o número do WhatsApp (com DDD):', '');
    if (!phone) return;

    const message = `Olá! Vi que você seguiu nosso Instagram @${username}. Vamos conversar por aqui?`;
    const whatsappLink = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

    window.open(whatsappLink, '_blank');
    showToast('Link do WhatsApp aberto!', 'success');
}

function archiveConversation(conversationId) {
    if (!confirm('Arquivar esta conversa?')) return;

    // TODO: Implementar arquivamento no backend
    showToast('Conversa arquivada', 'success');
}

// ═══════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════

function updateUnreadCount() {
    const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
    const badge = document.getElementById('totalUnread');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'inline-block' : 'none';
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    // Implementar toast notification
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchConversations');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = conversations.filter(conv =>
                conv.follower_name?.toLowerCase().includes(query) ||
                conv.follower_username?.toLowerCase().includes(query)
            );
            // Re-renderizar com conversas filtradas
        });
    }
}
