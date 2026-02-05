// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - CHAT SERVICE (WebSocket)
// Gerencia conversas em tempo real do Instagram
// ═══════════════════════════════════════════════════════════

const { supabase } = require('../../../src/services/supabase');

class ChatService {
    constructor(io) {
        this.io = io;
        this.activeChats = new Map(); // userId -> socket
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('✅ Cliente conectado ao chat:', socket.id);

            // Autenticar usuário
            socket.on('authenticate', async (data) => {
                try {
                    const { userId, token } = data;

                    // Validar token (simplificado - você pode adicionar JWT validation)
                    if (!userId || !token) {
                        socket.emit('auth_error', { message: 'Token inválido' });
                        return;
                    }

                    // Associar socket ao usuário
                    this.activeChats.set(userId, socket);
                    socket.userId = userId;

                    // Carregar conversas existentes
                    const conversations = await this.loadUserConversations(userId);
                    socket.emit('conversations_loaded', conversations);

                    console.log(`✅ Usuário ${userId} autenticado no chat`);

                } catch (error) {
                    console.error('❌ Erro na autenticação:', error);
                    socket.emit('auth_error', { message: 'Erro ao autenticar' });
                }
            });

            // Nova mensagem recebida da extensão
            socket.on('new_message_from_instagram', async (data) => {
                try {
                    const { userId, conversationId, message } = data;

                    // Salvar mensagem no banco
                    const savedMessage = await this.saveMessage({
                        conversation_id: conversationId,
                        sender: 'follower',
                        content: message.text,
                        instagram_message_id: message.id,
                        timestamp: message.timestamp
                    });

                    // Notificar cliente conectado
                    const userSocket = this.activeChats.get(userId);
                    if (userSocket) {
                        userSocket.emit('new_message', {
                            conversationId,
                            message: savedMessage
                        });
                    }

                    console.log(`📨 Nova mensagem salva: ${conversationId}`);

                } catch (error) {
                    console.error('❌ Erro ao processar mensagem:', error);
                }
            });

            // Cliente envia mensagem pelo dashboard
            socket.on('send_message', async (data) => {
                try {
                    const { conversationId, text } = data;
                    const userId = socket.userId;

                    if (!userId) {
                        socket.emit('error', { message: 'Não autenticado' });
                        return;
                    }

                    // Salvar mensagem no banco
                    const savedMessage = await this.saveMessage({
                        conversation_id: conversationId,
                        sender: 'user',
                        content: text,
                        timestamp: new Date().toISOString()
                    });

                    // Confirmar para o cliente
                    socket.emit('message_sent', {
                        conversationId,
                        message: savedMessage
                    });

                    // Enviar comando para extensão enviar no Instagram
                    socket.emit('send_to_instagram', {
                        conversationId,
                        text,
                        messageId: savedMessage.id
                    });

                    console.log(`📤 Mensagem enviada: ${conversationId}`);

                } catch (error) {
                    console.error('❌ Erro ao enviar mensagem:', error);
                    socket.emit('error', { message: 'Erro ao enviar mensagem' });
                }
            });

            // Nova conversa iniciada
            socket.on('start_conversation', async (data) => {
                try {
                    const { userId, followerUsername, followerData } = data;

                    // Criar nova conversa
                    const conversation = await this.createConversation({
                        user_id: userId,
                        follower_username: followerUsername,
                        follower_name: followerData.name,
                        follower_avatar: followerData.avatar,
                        status: 'active'
                    });

                    // Notificar cliente
                    const userSocket = this.activeChats.get(userId);
                    if (userSocket) {
                        userSocket.emit('conversation_created', conversation);
                    }

                    console.log(`💬 Nova conversa criada: ${conversation.id}`);

                } catch (error) {
                    console.error('❌ Erro ao criar conversa:', error);
                }
            });

            // Marcar mensagens como lidas
            socket.on('mark_as_read', async (data) => {
                try {
                    const { conversationId } = data;

                    await this.markConversationAsRead(conversationId);

                    socket.emit('marked_as_read', { conversationId });

                } catch (error) {
                    console.error('❌ Erro ao marcar como lida:', error);
                }
            });

            // Desconexão
            socket.on('disconnect', () => {
                if (socket.userId) {
                    this.activeChats.delete(socket.userId);
                    console.log(`👋 Usuário ${socket.userId} desconectado do chat`);
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    // DATABASE OPERATIONS
    // ═══════════════════════════════════════════════════════════

    async loadUserConversations(userId) {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    messages:messages(*)
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Erro ao carregar conversas:', error);
            return [];
        }
    }

    async createConversation(data) {
        try {
            const { data: conversation, error } = await supabase
                .from('conversations')
                .insert({
                    user_id: data.user_id,
                    follower_username: data.follower_username,
                    follower_name: data.follower_name,
                    follower_avatar: data.follower_avatar,
                    status: data.status || 'active',
                    unread_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return conversation;

        } catch (error) {
            console.error('❌ Erro ao criar conversa:', error);
            throw error;
        }
    }

    async saveMessage(data) {
        try {
            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: data.conversation_id,
                    sender: data.sender,
                    content: data.content,
                    instagram_message_id: data.instagram_message_id,
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false
                })
                .select()
                .single();

            if (error) throw error;

            // Atualizar conversa
            await supabase
                .from('conversations')
                .update({
                    updated_at: new Date().toISOString(),
                    last_message: data.content,
                    unread_count: data.sender === 'follower'
                        ? supabase.raw('unread_count + 1')
                        : supabase.raw('unread_count')
                })
                .eq('id', data.conversation_id);

            return message;

        } catch (error) {
            console.error('❌ Erro ao salvar mensagem:', error);
            throw error;
        }
    }

    async markConversationAsRead(conversationId) {
        try {
            // Marcar todas as mensagens como lidas
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('conversation_id', conversationId)
                .eq('sender', 'follower');

            // Zerar contador de não lidas
            await supabase
                .from('conversations')
                .update({ unread_count: 0 })
                .eq('id', conversationId);

        } catch (error) {
            console.error('❌ Erro ao marcar como lida:', error);
            throw error;
        }
    }

    // Notificar usuário sobre nova mensagem (mesmo offline)
    async notifyNewMessage(userId, conversationId, message) {
        const userSocket = this.activeChats.get(userId);

        if (userSocket) {
            // Usuário online - enviar via WebSocket
            userSocket.emit('new_message', {
                conversationId,
                message
            });
        } else {
            // Usuário offline - pode enviar push notification aqui
            console.log(`📧 Usuário ${userId} offline - mensagem salva`);
        }
    }
}

module.exports = ChatService;
