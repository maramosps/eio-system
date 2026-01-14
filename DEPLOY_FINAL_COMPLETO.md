# 🚀 DEPLOY FINAL COMPLETO - E.I.O SYSTEM

**Data:** 07/01/2026  
**Objetivo:** Deploy completo do sistema E.I.O para produção real e funcional

---

## 📋 ÍNDICE

1. [Verificação do Sistema](#fase-1-verificação-do-sistema)
2. [Configuração do Banco de Dados](#fase-2-configuração-do-banco-de-dados)
3. [Deploy do Backend](#fase-3-deploy-do-backend)
4. [Deploy do Frontend](#fase-4-deploy-do-frontend)
5. [Configuração da Extensão](#fase-5-configuração-da-extensão)
6. [Testes de Integração](#fase-6-testes-de-integração)
7. [Monitoramento e Validação](#fase-7-monitoramento-e-validação)

---

## 🎯 FASE 1: Verificação do Sistema

### ✅ Status Atual

**Componentes Identificados:**

- ✅ Backend API (Node.js + Express)
- ✅ Frontend Web (HTML/CSS/JS)
- ✅ Extensão Chrome (Manifest V3)
- ✅ Integração Supabase configurada
- ✅ API Vercel configurada

**Arquivos Críticos:**

- `api/index.js` - API serverless para Vercel
- `backend/` - Backend completo (alternativa local)
- `frontend/` - Interface web
- `extension/` - Extensão do navegador
- `vercel.json` - Configuração de deploy

### 📊 Checklist de Pré-requisitos

- [x] Node.js v24.11.1 instalado
- [x] NPM v11.6.2 instalado
- [ ] Credenciais Supabase configuradas
- [ ] Variáveis de ambiente configuradas
- [ ] Vercel CLI instalado
- [ ] Testes de conexão realizados

---

## 🎯 FASE 2: Configuração do Banco de Dados

### 2.1 Supabase - Verificação

**Ações Necessárias:**

1. **Verificar se o projeto Supabase existe**
   - Acessar: <https://supabase.com/dashboard>
   - Confirmar projeto ativo

2. **Obter Credenciais**
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY
   - SUPABASE_ANON_KEY

3. **Criar Tabelas no Banco**

```sql
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
```

### 2.2 Desabilitar RLS (Row Level Security) - Desenvolvimento

```sql
-- APENAS PARA DESENVOLVIMENTO - Remover em produção
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE flows DISABLE ROW LEVEL SECURITY;
ALTER TABLE executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
```

---

## 🎯 FASE 3: Deploy do Backend

### 3.1 Configurar Variáveis de Ambiente no Vercel

**Variáveis Necessárias:**

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key-aqui
SUPABASE_ANON_KEY=sua-anon-key-aqui

# JWT
JWT_SECRET=seu-jwt-secret-super-forte-aqui-min-32-chars
JWT_REFRESH_SECRET=seu-refresh-secret-super-forte-aqui

# Node Environment
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://seu-dominio.vercel.app

# Stripe (opcional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mercado Pago (opcional)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
```

### 3.2 Deploy no Vercel

**Opção 1: Via CLI**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login no Vercel
vercel login

# Deploy
cd C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo
vercel --prod
```

**Opção 2: Via GitHub**

1. Criar repositório no GitHub
2. Push do código
3. Conectar no Vercel Dashboard
4. Deploy automático

### 3.3 Testar API

```bash
# Health Check
curl https://seu-dominio.vercel.app/api/health

# Deve retornar:
{
  "status": "OK",
  "message": "E.I.O System API está rodando",
  "supabaseConfigured": true
}
```

---

## 🎯 FASE 4: Deploy do Frontend

### 4.1 Atualizar Configuração da API

**Arquivo:** `frontend/config.js`

```javascript
const API_BASE_URL = 'https://seu-dominio.vercel.app/api/v1';
const WS_URL = 'https://seu-dominio.vercel.app';

window.EIO_CONFIG = {
    API_BASE_URL,
    WS_URL,
    isProduction: true
};
```

### 4.2 Verificar Arquivos Estáticos

- ✅ `index.html` - Landing page
- ✅ `login.html` - Página de login
- ✅ `dashboard.html` - Dashboard principal
- ✅ `admin.html` - Dashboard admin
- ✅ Todos os arquivos CSS e JS

### 4.3 Deploy Automático

O frontend já está configurado no `vercel.json` para deploy automático junto com a API.

---

## 🎯 FASE 5: Configuração da Extensão

### 5.1 Atualizar URL da API na Extensão

**Arquivo:** `extension/popup.js` (procurar por API_BASE_URL)

```javascript
const API_BASE_URL = 'https://seu-dominio.vercel.app/api/v1';
```

**Arquivo:** `extension/background.js`

```javascript
const API_BASE_URL = 'https://seu-dominio.vercel.app/api/v1';
```

### 5.2 Empacotar Extensão

```bash
# Criar arquivo ZIP da extensão
cd extension
# Criar arquivo .zip com todos os arquivos
```

### 5.3 Disponibilizar Download

Colocar o arquivo ZIP em `frontend/downloads/eio-extension.zip`

---

## 🎯 FASE 6: Testes de Integração

### 6.1 Teste de Registro

```bash
curl -X POST https://seu-dominio.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Usuario",
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

### 6.2 Teste de Login

```bash
curl -X POST https://seu-dominio.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

### 6.3 Teste do Frontend

1. Acessar: `https://seu-dominio.vercel.app`
2. Testar navegação
3. Testar login
4. Testar dashboard

### 6.4 Teste da Extensão

1. Carregar extensão no Chrome
2. Fazer login
3. Testar funcionalidades
4. Verificar comunicação com API

---

## 🎯 FASE 7: Monitoramento e Validação

### 7.1 Checklist Final

- [ ] API respondendo corretamente
- [ ] Banco de dados conectado
- [ ] Frontend carregando
- [ ] Login funcionando
- [ ] Dashboard exibindo dados
- [ ] Extensão conectando com API
- [ ] Todas as rotas testadas

### 7.2 Métricas de Sucesso

- ✅ Tempo de resposta da API < 500ms
- ✅ Taxa de erro < 1%
- ✅ Uptime > 99%
- ✅ Todas as funcionalidades operacionais

### 7.3 Próximos Passos

1. **Configurar domínio customizado** (opcional)
2. **Configurar SSL/HTTPS** (Vercel já fornece)
3. **Configurar monitoramento** (Sentry, LogRocket)
4. **Configurar backups** (Supabase automático)
5. **Documentar API** (Swagger/OpenAPI)

---

## 🎯 COMANDOS RÁPIDOS

### Deploy Completo

```bash
# 1. Instalar dependências
cd backend
npm install

# 2. Deploy no Vercel
vercel --prod

# 3. Testar API
curl https://seu-dominio.vercel.app/api/health
```

### Atualização Rápida

```bash
# Deploy de atualização
vercel --prod
```

---

## 🆘 TROUBLESHOOTING

### Erro: "Banco de dados não configurado"

**Solução:** Adicionar variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` no Vercel

### Erro: "CORS blocked"

**Solução:** Verificar configuração de CORS no `api/index.js`

### Erro: "Token inválido"

**Solução:** Verificar `JWT_SECRET` nas variáveis de ambiente

---

## ✅ CONCLUSÃO

Após completar todas as fases, o sistema E.I.O estará:

- ✅ **100% Funcional** em produção
- ✅ **Escalável** (Vercel + Supabase)
- ✅ **Seguro** (HTTPS, JWT, SSL)
- ✅ **Monitorado** (Logs, métricas)
- ✅ **Pronto para venda** e uso real

---

**Desenvolvido por MS Assessoria Digital** 🚀
