-- ═══════════════════════════════════════════════════════════
-- SCRIPT DE MIGRAÇÃO - SISTEMA DE CONTAS INSTAGRAM
-- Execute este script no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════
-- 1. Adicionar campo instagram_handle na tabela users (se não existir)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255);
-- 2. Criar tabela de contas Instagram vinculadas
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_handle VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    -- active, disabled, pending
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    -- Informações do dispositivo que conectou
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 3. Criar índice para busca rápida por instagram_handle
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_handle ON instagram_accounts(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_users_instagram_handle ON users(instagram_handle);
-- 4. Função para contar contas de um usuário (máximo 1)
CREATE OR REPLACE FUNCTION check_instagram_account_limit() RETURNS TRIGGER AS $$
DECLARE account_count INTEGER;
BEGIN
SELECT COUNT(*) INTO account_count
FROM instagram_accounts
WHERE user_id = NEW.user_id
    AND status = 'active';
IF account_count >= 1 THEN RAISE EXCEPTION 'Limite de 1 conta Instagram por usuário atingido';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 5. Trigger para verificar limite antes de inserir
DROP TRIGGER IF EXISTS trigger_check_instagram_limit ON instagram_accounts;
CREATE TRIGGER trigger_check_instagram_limit BEFORE
INSERT ON instagram_accounts FOR EACH ROW EXECUTE FUNCTION check_instagram_account_limit();
-- 6. Habilitar RLS na tabela instagram_accounts
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
-- 7. Políticas de segurança
DROP POLICY IF EXISTS "Users can view own instagram accounts" ON instagram_accounts;
CREATE POLICY "Users can view own instagram accounts" ON instagram_accounts FOR
SELECT USING (
        auth.uid()::text = user_id::text
        OR true
    );
-- Permitir acesso via service key
DROP POLICY IF EXISTS "Users can insert own instagram accounts" ON instagram_accounts;
CREATE POLICY "Users can insert own instagram accounts" ON instagram_accounts FOR
INSERT WITH CHECK (true);
-- Controlado via API
DROP POLICY IF EXISTS "Users can update own instagram accounts" ON instagram_accounts;
CREATE POLICY "Users can update own instagram accounts" ON instagram_accounts FOR
UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete own instagram accounts" ON instagram_accounts;
CREATE POLICY "Users can delete own instagram accounts" ON instagram_accounts FOR DELETE USING (true);
-- 8. Visualização para debug (opcional)
SELECT 'Migração concluída!' as status,
    (
        SELECT COUNT(*)
        FROM users
    ) as total_users,
    (
        SELECT COUNT(*)
        FROM instagram_accounts
    ) as total_instagram_accounts;