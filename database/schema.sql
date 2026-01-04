-- ═══════════════════════════════════════════════════════════
-- E.I.O SYSTEM - SCHEMA DO BANCO DE DADOS
-- Supabase PostgreSQL
-- ═══════════════════════════════════════════════════════════

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════
-- TABELA: users (Usuários)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════
-- TABELA: subscriptions (Assinaturas)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ═══════════════════════════════════════════════════════════
-- TABELA: flows (Fluxos de Automação)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_flows_user_id ON flows(user_id);

-- ═══════════════════════════════════════════════════════════
-- TABELA: leads (Leads Extraídos)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  profile_url TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  bio TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'new'
);

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_flow_id ON leads(flow_id);
CREATE INDEX IF NOT EXISTS idx_leads_username ON leads(username);

-- ═══════════════════════════════════════════════════════════
-- TABELA: executions (Execuções de Fluxos)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  leads_extracted INTEGER DEFAULT 0,
  actions_performed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]'
);

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_flow_id ON executions(flow_id);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Política: Service Role tem acesso total (para backend)
CREATE POLICY "Service role has full access" ON users
  FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON subscriptions
  FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON flows
  FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON leads
  FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON executions
  FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- DADOS INICIAIS (OPCIONAL)
-- ═══════════════════════════════════════════════════════════

-- Inserir usuário de teste (senha: senha123)
-- Hash bcrypt de 'senha123': $2a$10$YourHashedPasswordHere
-- NOTA: Você precisará gerar o hash real usando bcrypt

-- INSERT INTO users (name, email, password) VALUES
-- ('Usuário Teste', 'teste@eio.com', '$2a$10$YourHashedPasswordHere');

-- ═══════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Contar registros em cada tabela
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'subscriptions' as table_name, COUNT(*) as count FROM subscriptions
UNION ALL
SELECT 
  'flows' as table_name, COUNT(*) as count FROM flows
UNION ALL
SELECT 
  'leads' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 
  'executions' as table_name, COUNT(*) as count FROM executions;
