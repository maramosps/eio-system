# 🔧 GUIA DE CONFIGURAÇÃO COMPLETA - E.I.O SYSTEM

**Data:** 07/01/2026  
**Status:** Sistema pronto para configuração final

---

## 📊 SITUAÇÃO ATUAL

### ✅ O que está funcionando

- ✅ Projeto no Vercel: `eio-system.vercel.app`
- ✅ Código completo (Frontend + Backend + Extensão)
- ✅ Estrutura de arquivos correta
- ✅ Vercel CLI instalado e funcionando

### ⚠️ O que precisa ser configurado

- ⚠️ Variáveis de ambiente no Vercel
- ⚠️ Banco de dados Supabase conectado
- ⚠️ Deploy atualizado com configurações

---

## 🎯 PASSO A PASSO PARA DEIXAR TUDO FUNCIONAL

### **PASSO 1: Configurar Supabase**

#### 1.1 Criar/Acessar Projeto Supabase

1. Acesse: <https://supabase.com/dashboard>
2. Faça login (ou crie conta)
3. Crie um novo projeto ou use existente

#### 1.2 Criar Tabelas no Banco

No **SQL Editor** do Supabase, execute este script:

```sql
-- ═══════════════════════════════════════════════════════════
-- E.I.O SYSTEM - SCHEMA DO BANCO DE DADOS
-- ═══════════════════════════════════════════════════════════

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    instagram_handle VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'trial',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    stripe_subscription_id VARCHAR(255),
    mercadopago_subscription_id VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Contas Instagram
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instagram_handle VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    connected_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Fluxos
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Execuções
CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    actions_completed INTEGER DEFAULT 0,
    actions_total INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Logs
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_handle ON instagram_accounts(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_flows_user_id ON flows(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_flow_id ON executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_execution_id ON logs(execution_id);

-- Desabilitar RLS temporariamente (APENAS DESENVOLVIMENTO)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE flows DISABLE ROW LEVEL SECURITY;
ALTER TABLE executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
```

#### 1.3 Obter Credenciais

No Supabase, vá em **Settings → API** e copie:

1. **Project URL** (ex: `https://xxxxx.supabase.co`)
2. **anon public** key
3. **service_role** key (⚠️ SECRETA - não compartilhar)

---

### **PASSO 2: Configurar Variáveis de Ambiente no Vercel**

#### 2.1 Via Dashboard do Vercel (Recomendado)

1. Acesse: <https://vercel.com/dashboard>
2. Selecione o projeto **eio-system**
3. Vá em **Settings → Environment Variables**
4. Adicione as seguintes variáveis:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key-aqui
SUPABASE_ANON_KEY=sua-anon-key-aqui

# JWT (gere chaves fortes)
JWT_SECRET=sua-chave-jwt-super-secreta-min-32-caracteres
JWT_REFRESH_SECRET=sua-chave-refresh-super-secreta-min-32-caracteres

# Node Environment
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://eio-system.vercel.app
```

**⚠️ IMPORTANTE:** Marque todas como **Production**, **Preview** e **Development**

#### 2.2 Via CLI (Alternativa)

```bash
# Adicionar variáveis uma por uma
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
```

---

### **PASSO 3: Fazer Deploy Atualizado**

#### 3.1 Via CLI (Recomendado)

```bash
# Navegar até a pasta do projeto
cd C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo

# Deploy em produção
vercel --prod
```

#### 3.2 Via Script Automatizado

```bash
# Executar o script de verificação e deploy
.\deploy-verificar.ps1
```

---

### **PASSO 4: Testar o Sistema**

#### 4.1 Testar API

```bash
# Health check
curl https://eio-system.vercel.app/api/health

# Deve retornar:
{
  "status": "OK",
  "message": "E.I.O System API está rodando",
  "supabaseConfigured": true
}
```

#### 4.2 Testar Registro de Usuário

```bash
curl -X POST https://eio-system.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Teste\",\"email\":\"teste@exemplo.com\",\"password\":\"senha123\"}"
```

#### 4.3 Testar Login

```bash
curl -X POST https://eio-system.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"teste@exemplo.com\",\"password\":\"senha123\"}"
```

#### 4.4 Testar Frontend

1. Acesse: <https://eio-system.vercel.app>
2. Navegue pela landing page
3. Clique em "Entrar" ou "Começar Agora"
4. Teste o login
5. Acesse o dashboard

---

### **PASSO 5: Configurar Extensão**

#### 5.1 Atualizar URL da API na Extensão

**Arquivo:** `extension/popup.js`

Procure por `API_BASE_URL` e atualize para:

```javascript
const API_BASE_URL = 'https://eio-system.vercel.app/api/v1';
```

**Arquivo:** `extension/background.js`

```javascript
const API_BASE_URL = 'https://eio-system.vercel.app/api/v1';
```

#### 5.2 Empacotar Extensão

1. Compacte a pasta `extension` em um arquivo ZIP
2. Nomeie como `eio-extension.zip`
3. Coloque em `frontend/downloads/eio-extension.zip`

#### 5.3 Fazer Deploy Novamente

```bash
vercel --prod
```

---

## 🎯 CHECKLIST FINAL

### Configuração

- [ ] Projeto Supabase criado
- [ ] Tabelas criadas no banco
- [ ] Credenciais Supabase obtidas
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Deploy realizado

### Testes

- [ ] API respondendo (`/api/health`)
- [ ] Registro de usuário funcionando
- [ ] Login funcionando
- [ ] Frontend carregando
- [ ] Dashboard acessível
- [ ] Extensão conectando com API

### Funcionalidades

- [ ] Autenticação completa
- [ ] Dashboard exibindo dados
- [ ] CRM funcionando
- [ ] Analytics funcionando
- [ ] Extensão operacional
- [ ] Todas as integrações testadas

---

## 🆘 TROUBLESHOOTING

### Erro: "Banco de dados não configurado"

**Causa:** Variáveis `SUPABASE_URL` ou `SUPABASE_SERVICE_KEY` não configuradas

**Solução:**

1. Verificar variáveis no Vercel Dashboard
2. Fazer novo deploy: `vercel --prod`

### Erro: "404 Not Found" na API

**Causa:** Rota não configurada ou deploy não atualizado

**Solução:**

1. Verificar se `api/index.js` existe
2. Fazer novo deploy: `vercel --prod`
3. Aguardar 1-2 minutos para propagação

### Erro: "CORS blocked"

**Causa:** Configuração de CORS na API

**Solução:** Já está configurado em `api/index.js` com `Access-Control-Allow-Origin: *`

### Frontend não carrega

**Causa:** Arquivos não foram deployados

**Solução:**

1. Verificar `vercel.json`
2. Fazer novo deploy: `vercel --prod`

---

## 📞 PRÓXIMOS PASSOS

Após tudo configurado:

1. **Domínio Customizado** (opcional)
   - Configurar domínio próprio no Vercel
   - Ex: `app.eio-system.com`

2. **Monitoramento**
   - Configurar Sentry para logs de erro
   - Configurar analytics

3. **Backups**
   - Supabase já faz backup automático
   - Configurar backup adicional se necessário

4. **Segurança**
   - Habilitar RLS no Supabase (produção)
   - Configurar rate limiting
   - Adicionar 2FA

5. **Marketing**
   - Testar todo o fluxo de compra
   - Configurar Stripe/Mercado Pago
   - Lançar para clientes

---

## ✅ SISTEMA PRONTO

Quando todos os checkboxes estiverem marcados, seu sistema estará:

- ✅ **100% Funcional**
- ✅ **Em Produção**
- ✅ **Escalável**
- ✅ **Seguro**
- ✅ **Pronto para Venda**

---

**Desenvolvido por MS Assessoria Digital** 🚀

**Suporte:** Entre em contato se precisar de ajuda em alguma etapa!
