-- ═══════════════════════════════════════════════════════════
-- E.I.O SYSTEM - CHAT TABLES
-- Tabelas para sistema de chat espelhado do Instagram
-- ═══════════════════════════════════════════════════════════
-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    follower_username VARCHAR(255) NOT NULL,
    follower_name VARCHAR(255),
    follower_avatar TEXT,
    status VARCHAR(50) DEFAULT 'active',
    -- active, archived, blocked
    unread_count INTEGER DEFAULT 0,
    last_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Índices
    CONSTRAINT unique_user_follower UNIQUE(user_id, follower_username)
);
-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL,
    -- 'user' ou 'follower'
    content TEXT NOT NULL,
    instagram_message_id VARCHAR(255),
    -- ID da mensagem no Instagram
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    -- Metadados opcionais
    media_url TEXT,
    media_type VARCHAR(50),
    -- image, video, audio
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read)
WHERE read = FALSE;
-- RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- Políticas de acesso
-- Usuários só podem ver suas próprias conversas
CREATE POLICY conversations_user_policy ON conversations FOR ALL USING (user_id = auth.uid());
-- Usuários só podem ver mensagens de suas conversas
CREATE POLICY messages_user_policy ON messages FOR ALL USING (
    conversation_id IN (
        SELECT id
        FROM conversations
        WHERE user_id = auth.uid()
    )
);
-- Service role tem acesso total (para o backend)
CREATE POLICY conversations_service_policy ON conversations FOR ALL TO service_role USING (true);
CREATE POLICY messages_service_policy ON messages FOR ALL TO service_role USING (true);
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger para atualizar updated_at
CREATE TRIGGER update_conversations_updated_at BEFORE
UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Comentários
COMMENT ON TABLE conversations IS 'Conversas do chat espelhado do Instagram';
COMMENT ON TABLE messages IS 'Mensagens das conversas';
COMMENT ON COLUMN conversations.status IS 'Status da conversa: active, archived, blocked';
COMMENT ON COLUMN messages.sender IS 'Quem enviou: user (cliente) ou follower (seguidor)';