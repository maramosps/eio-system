# 🏗️ ARQUITETURA TÉCNICA COMPLETA - E.I.O

**Sistema de Automação Instagram com IA**

---

## 📑 Sumário Executivo

O **E.I.O (Engajamento Inteligente Orgânico)** é um sistema híbrido de automação para Instagram composto por:

1. **Frontend Web** (Landing + Dashboards)
2. **Extensão de Navegador** (Chrome/Edge/Brave/Opera)
3. **Backend API** (Node.js + Express)
4. **Motor de Automação Híbrido** (IA + Limites Inteligentes)
5. **Sistema de Pagamentos** (Stripe + Mercado Pago)

---

## 🎨 1. DESIGN SYSTEM

### 1.1 Identidade Visual

**Tema**: Dark Elegante + Modern Premium

**Paleta de Cores**:
```css
/* Base Dark */
--eio-black: #0A0A0F
--eio-dark-900: #111118
--eio-dark-800: #18181F
--eio-dark-700: #1F1F28

/* Azul Tecnologia (Principal) */
--eio-blue-500: #2196F3
--eio-blue-400: #42A5F5

/* Cyan Luminoso (Secundário) */
--eio-cyan-500: #00ACC1
--eio-cyan-glow: #00E5FF

/* Roxo Premium (Status) */
--eio-purple-500: #7B1FA2

/* Laranja Energia (CTA) */
--eio-orange-500: #FF6F00
```

**Tipografia**:
- Primary: **Inter** (Google Fonts)
- Secondary: **Plus Jakarta Sans** (Google Fonts)
- Monospace: **Consolas** / **Monaco**

**Gradientes Principais**:
```css
--eio-gradient-primary: linear-gradient(135deg, #1976D2 0%, #00ACC1 100%)
--eio-gradient-secondary: linear-gradient(135deg, #7B1FA2 0%, #2196F3 100%)
--eio-gradient-accent: linear-gradient(135deg, #FF6F00 0%, #FFA726 100%)
```

**Efeitos Visuais**:
- Glassmorphism (backdrop-filter: blur(16px))
- Gradient Orbs animados
- Shadow Glow coloridos
- Micro-animações em hover
- Parallax leve

### 1.2 Componentes Base

**Cards**:
```html
<div class="eio-card">
  <!-- Conteúdo -->
</div>
```
- Background: glassmorphism
- Border: 1px solid rgba(255,255,255,0.1)
- Hover: translateY(-4px) + shadow-lg

**Botões**:
```html
<button class="eio-btn eio-btn-primary">Texto</button>
```
Variações:
- `eio-btn-primary` (gradient azul)
- `eio-btn-secondary` (gradient roxo)
- `eio-btn-accent` (gradient laranja)
- `eio-btn-outline` (transparente com borda)
- `eio-btn-ghost` (fundo semi-transparente)

**Inputs**:
```html
<input class="eio-input" type="text" placeholder="...">
```
- Focus: glow azul + border highlight

**Badges**:
```html
<span class="eio-badge eio-badge-primary">Status</span>
```

---

## 🌐 2. FRONTEND WEB

### 2.1 Estrutura de Páginas

#### 2.1.1 Landing Page (`index.html`)

**Seções**:
1. **Hero Section**
   - Título principal com gradient
   - Descrição persuasiva
   - 2 CTAs (Começar Agora + Ver Demo)
   - Stats cards (50K+ usuários, 2M+ ações, 99.9% sem bloqueios)
   - Preview do dashboard

2. **Features Section** (6 cards)
   - Automação Híbrida Inteligente
   - Proteção Anti-Bloqueio com IA
   - Dashboard Premium Completo
   - Múltiplas Ações Automáticas
   - Monitoramento ao Vivo
   - Filtros Premium Avançados

3. **How It Works** (3 passos)
   - Instale a Extensão
   - Configure seus Fluxos
   - Deixe a IA Trabalhar

4. **Pricing Section**
   - Plano único: R$ 299,90 inicial + R$ 199,90/mês
   - Lista completa de features
   - Garantia de 7 dias

5. **Footer**
   - Links de produtos
   - Suporte
   - Legal
   - Redes sociais

**Tecnologias**:
- HTML5 semântico
- CSS3 com variáveis customizadas
- JavaScript Vanilla
- Intersection Observer (animações ao scroll)
- Parallax Effect (gradient orbs)

#### 2.1.2 Dashboard do Cliente

**Módulos Principais**:

1. **Overview Dashboard**
   - Estatísticas gerais
   - Gráficos de crescimento
   - Saúde da conta
   - Últimas atividades

2. **Gerenciador de Fluxos**
   - Lista de fluxos criados
   - Status (ativo/pausado/concluído)
   - Métricas por fluxo
   - Editar/Excluir

3. **Criador de Fluxos Híbridos** (Visual)
   - Interface drag-and-drop
   - Blocos disponíveis:
     - Buscar por hashtag
     - Buscar seguidores/seguindo
     - Filtrar perfis
     - Seguir
     - Curtir posts
     - Curtir stories
     - Comentar
     - Aguardar (delay)
     - Repetir
   - Configuração de limites
   - Preview do fluxo

4. **Histórico e Logs**
   - Tabela de todas as ações
   - Filtros (data, tipo, status)
   - Exportar relatórios (CSV/PDF)

5. **Análises e Métricas**
   - Gráficos de:
     - Seguidores ganhos/perdidos
     - Taxa de engajamento
     - Curtidas/comentários/follows por dia
     - Horários de pico
   - Comparação mês a mês

6. **Configurações**
   - Perfil do usuário
   - Contas do Instagram vinculadas
   - Limites personalizados
   - Notificações
   - Assinatura e pagamento

#### 2.1.3 Dashboard Administrativo

**Funcionalidades**:

1. **Dashboard Geral**
   - Total de usuários
   - Receita mensal/anual
   - Taxa de retenção
   - Usuários ativos hoje

2. **Gestão de Usuários**
   - Lista completa
   - Buscar/filtrar
   - Visualizar detalhes
   - Ativar/desativar conta
   - Alterar plano manualmente

3. **Controle de Assinaturas**
   - Status de pagamentos
   - Faturas pendentes
   - Renovações automáticas
   - Cancelamentos

4. **Monitoramento de Automações**
   - Fluxos em execução
   - Taxa de sucesso/falha
   - Detecção de problemas
   - Logs do sistema

5. **Gestão Financeira**
   - Transações (Stripe + Mercado Pago)
   - Relatórios financeiros
   - Estornos e reembolsos

6. **Painel de Erros**
   - Logs de erro do sistema
   - Alertas críticos
   - Status dos servidores

---

## 🔌 3. EXTENSÃO DE NAVEGADOR

### 3.1 Arquitetura da Extensão

**Componentes**:

```
extension/
├── manifest.json          (Configuração Manifest V3)
├── popup.html/css/js      (Interface do popup)
├── background.js          (Service Worker - Motor)
├── content.js             (Injeta no Instagram)
├── content.css            (Estilos injetados)
└── icons/                 (Ícones 16/32/48/128)
```

### 3.2 Manifest V3

**Permissões**:
```json
{
  "permissions": [
    "activeTab",
    "storage",
    "webRequest",
    "cookies",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "https://*.instagram.com/*",
    "https://api.eio-system.com/*"
  ]
}
```

### 3.3 Popup Interface

**Abas**:
1. **Dashboard**
   - Stats cards (follows, likes, comments hoje)
   - Saúde da conta (barra de progresso)
   - Quick actions (Start, Pause, Open Dashboard)

2. **Automações**
   - Lista de fluxos ativos
   - Botão "Criar Novo Fluxo"

3. **Console**
   - Logs ao vivo
   - Filtros (info, success, warning, error)
   - Botão "Limpar Console"

**Estado Global**:
```javascript
{
  isRunning: boolean,
  stats: {
    followsToday: number,
    likesToday: number,
    commentsToday: number
  },
  automations: Array,
  connectionStatus: 'connected' | 'disconnected'
}
```

### 3.4 Background Script (Service Worker)

**Responsabilidades**:
1. Gerenciar estado da extensão
2. Comunicar com backend via API/WebSocket
3. Agendar execuções (chrome.alarms)
4. Processar filas de ações
5. Aplicar limites inteligentes
6. Enviar logs para o console

**Comunicação**:
```javascript
// Enviar para backend
fetch('https://api.eio-system.com/actions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(action)
})

// Receber do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Processar mensagem
})
```

### 3.5 Content Script

**Funções**:
1. Detectar página do Instagram
2. Injetar console flutuante
3. Executar ações DOM:
   - Clicar em botões (follow, like)
   - Navegar entre posts/perfis
   - Ler dados da página
   - Detectar elementos (stories, posts)
4. Simular comportamento humano:
   - Delays aleatórios
   - Scroll natural
   - Movimentos de mouse

**Exemplo de Ação - Seguir**:
```javascript
async function followUser() {
  const followButton = document.querySelector('button[type="button"]');
  if (followButton && followButton.textContent === 'Follow') {
    // Delay humano (1-3s)
    await humanDelay(1000, 3000);
    
    // Scroll até o botão
    followButton.scrollIntoView({ behavior: 'smooth' });
    
    // Delay adicional
    await humanDelay(500, 1500);
    
    // Clicar
    followButton.click();
    
    // Enviar log
    sendLog('success', 'Usuário seguido');
    
    return true;
  }
  return false;
}
```

**Console Flutuante**:
```html
<div id="eio-console-float">
  <div class="eio-console-header">
    <span>E.I.O Console</span>
    <button>Minimize</button>
  </div>
  <div class="eio-console-body">
    <!-- Logs em tempo real -->
  </div>
</div>
```
- Posição: fixed, bottom-right
- Arrastável
- Minimizável
- Transparência ajustável

---

## 🔧 4. BACKEND API

### 4.1 Stack Tecnológico

**Servidor**:
- Node.js 18+
- Express.js 4.x
- TypeScript (opcional, mas recomendado)

**Banco de Dados**:
- PostgreSQL 14+ (principal)
- Redis (cache + sessões)
- MongoDB (opcional para logs)

**Autenticação**:
- JWT (Access Token)
- Refresh Tokens
- bcrypt (hash de senhas)
- OAuth 2.0 (login com Google)

**Pagamentos**:
- Stripe SDK
- Mercado Pago SDK
- Webhook handlers

**Real-time**:
- Socket.io (WebSockets)

**Job Queue**:
- Bull + Redis

**Monitoramento**:
- Winston (logs)
- Sentry (error tracking)
- PM2 (process manager)

### 4.2 Estrutura do Banco de Dados

#### Tabela: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'client', -- 'client' | 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

#### Tabela: `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  mercadopago_customer_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'professional',
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'paused' | 'canceled'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `flows`
```sql
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Estrutura do fluxo
  status VARCHAR(50) DEFAULT 'draft', -- 'draft' | 'active' | 'paused' | 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `executions`
```sql
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'running', -- 'running' | 'paused' | 'completed' | 'failed'
  stats JSONB, -- { follows: 0, likes: 0, comments: 0, ... }
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error TEXT
);
```

#### Tabela: `logs`
```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL, -- 'info' | 'success' | 'warning' | 'error'
  action VARCHAR(100), -- 'follow' | 'like' | 'comment' | ...
  message TEXT NOT NULL,
  meta JSONB, -- Dados adicionais
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `accounts`
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instagram_username VARCHAR(255) NOT NULL,
  encrypted_credentials TEXT, -- Credenciais criptografadas
  health_score INTEGER DEFAULT 100, -- 0-100
  limits_config JSONB, -- Limites personalizados
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 APIs RESTful

**Base URL**: `https://api.eio-system.com/v1`

#### Auth
```
POST   /auth/register          # Criar conta
POST   /auth/login             # Login
POST   /auth/google            # Login com Google
POST   /auth/refresh           # Renovar token
POST   /auth/logout            # Logout
```

#### Users
```
GET    /users/me               # Perfil do usuário
PUT    /users/me               # Atualizar perfil
DELETE /users/me               # Deletar conta
```

#### Subscriptions
```
GET    /subscriptions          # Status da assinatura
POST   /subscriptions/create   # Criar assinatura
POST   /subscriptions/cancel   # Cancelar assinatura
GET    /subscriptions/invoices # Histórico de faturas
```

#### Flows
```
GET    /flows                  # Listar fluxos
POST   /flows                  # Criar fluxo
GET    /flows/:id              # Detalhes do fluxo
PUT    /flows/:id              # Atualizar fluxo
DELETE /flows/:id              # Deletar fluxo
POST   /flows/:id/start        # Iniciar execução
POST   /flows/:id/pause        # Pausar execução
POST   /flows/:id/stop         # Parar execução
```

#### Executions
```
GET    /executions             # Histórico de execuções
GET    /executions/:id         # Detalhes da execução
GET    /executions/:id/logs    # Logs da execução
```

#### Analytics
```
GET    /analytics/dashboard    # Métricas do dashboard
GET    /analytics/growth       # Dados de crescimento
GET    /analytics/engagement   # Dados de engajamento
GET    /analytics/export       # Exportar relatório
```

#### Accounts
```
GET    /accounts               # Contas do Instagram
POST   /accounts               # Adicionar conta
GET    /accounts/:id           # Detalhes da conta
DELETE /accounts/:id           # Remover conta
```

#### Admin (apenas admin)
```
GET    /admin/users            # Listar todos os usuários
GET    /admin/stats            # Estatísticas do sistema
GET    /admin/logs             # Logs do sistema
```

### 4.4 WebSocket Events

**Namespace**: `/live`

**Client → Server**:
```javascript
socket.emit('subscribe', { userId })
socket.emit('unsubscribe', { userId })
```

**Server → Client**:
```javascript
socket.emit('statsUpdate', { stats })
socket.emit('logEntry', { level, message, timestamp })
socket.emit('executionStatus', { flowId, status })
socket.emit('healthUpdate', { healthScore, limits })
```

---

##⚙️ 5. MOTOR DE AUTOMAÇÃO

### 5.1 Arquitetura do Motor

**Componentes**:
1. **Flow Parser** (converte fluxo visual em ações)
2. **Action Executor** (executa ações no Instagram)
3. **Limit Manager** (gerencia limites)
4. **AI Engine** (ajusta limites dinamicamente)
5. **Logger** (registra tudo)

### 5.2 Tipos de Ações

#### 5.2.1 Follow
```javascript
{
  type: 'follow',
  target: {
    type: 'hashtag' | 'followers' | 'following' | 'profile',
    value: '#fitness' | '@influencer' | ...
  },
  filters: {
    minFollowers: 100,
    maxFollowers: 10000,
    isPrivate: false,
    hasProfilePic: true,
    minPosts: 10
  },
  limits: {
    maxPerHour: 30,
    maxPerDay: 200
  }
}
```

#### 5.2.2 Like
```javascript
{
  type: 'like',
  target: {
    type: 'feed' | 'hashtag' | 'profile',
    value: ...
  },
  options: {
    likePosts: true,
    likeStories: false,
    maxLikesPerProfile: 3
  },
  limits: {
    maxPerHour: 60,
    maxPerDay: 500
  }
}
```

#### 5.2.3 Comment
```javascript
{
  type: 'comment',
  target: { ... },
  messages: [
    'Muito legal! 🔥',
    'Adorei o conteúdo!',
    'Incrível! 😍'
  ],
  limits: {
    maxPerHour: 20,
    maxPerDay: 100
  }
}
```

### 5.3 Limites Inteligentes com IA

**Fatores Considerados**:
- Idade da conta
- Nível de atividade histórico
- Taxa de sucesso/bloqueio
- Comportamento recente
- Horário do dia

**Algoritmo Básico**:
```javascript
function calculateSmartLimits(account) {
  const baseLimit = {
    followsPerHour: 30,
    likesPerHour: 60,
    commentsPerHour: 20
  };
  
  // Ajustes baseados na idade da conta
  const ageMultiplier = Math.min(account.ageDays / 90, 1);
  
  // Ajustes baseados na saúde da conta
  const healthMultiplier = account.healthScore / 100;
  
  // Ajustes baseados no horário
  const hour = new Date().getHours();
  const hourMultiplier = (hour >= 9 && hour <= 22) ? 1 : 0.5;
  
  return {
    followsPerHour: Math.floor(baseLimit.followsPerHour * ageMultiplier * healthMultiplier * hourMultiplier),
    likesPerHour: Math.floor(baseLimit.likesPerHour * ageMultiplier * healthMultiplier * hourMultiplier),
    commentsPerHour: Math.floor(baseLimit.commentsPerHour * ageMultiplier * healthMultiplier * hourMultiplier)
  };
}
```

### 5.4 Intervalos Humanos

**Randomização**:
```javascript
function humanDelay(min, max) {
  const base = Math.random() * (max - min) + min;
  const variance = base * 0.2; // ±20%
  const final = base + (Math.random() * variance * 2 - variance);
  return Math.floor(final);
}

// Exemplo: delay entre 2-5 segundos
await sleep(humanDelay(2000, 5000));
```

**Pausas Inteligentes**:
- A cada 50-100 ações: pausa de 5-15 minutos
- A cada 2-4 horas: pausa de 30-60 minutos
- Durante a noite (1h-7h): pausa completa

---

## 💳 6. SISTEMA DE PAGAMENTOS

### 6.1 Stripe Integration

**Produtos**:
```javascript
{
  name: 'E.I.O Professional',
  description: 'Plano Professional completo',
  prices: [
    {
      id: 'price_initial',
      amount: 29990, // R$ 299,90 em centavos
      currency: 'brl',
      type: 'one_time'
    },
    {
      id: 'price_monthly',
      amount: 19990, // R$ 199,90 em centavos
      currency: 'brl',
      type: 'recurring',
      interval: 'month'
    }
  ]
}
```

**Fluxo de Checkout**:
1. Cliente clica em "Começar Agora"
2. Redirecionado para Stripe Checkout
3. Paga R$ 299,90 (valor inicial)
4. Webhook confirma pagamento
5. Backend cria assinatura mensal (R$ 199,90/mês)
6. Cliente recebe acesso imediato

**Webhooks**:
```javascript
// POST /webhooks/stripe
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
  }
  
  res.json({ received: true });
});
```

### 6.2 Mercado Pago Integration

**Preferências de Pagamento**:
```javascript
const preference = {
  items: [
    {
      title: 'E.I.O Professional - Acesso Inicial',
      unit_price: 299.90,
      quantity: 1
    }
  ],
  back_urls: {
    success: 'https://eio-system.com/payment/success',
    failure: 'https://eio-system.com/payment/failure',
    pending: 'https://eio-system.com/payment/pending'
  },
  auto_return: 'approved',
  notification_url: 'https://api.eio-system.com/webhooks/mercadopago'
};
```

---

## 🔒 7. SEGURANÇA

### 7.1 Autenticação

**JWT Structure**:
```javascript
{
  header: {
    alg: 'HS256',
    typ: 'JWT'
  },
  payload: {
    sub: userId,
    email: 'user@example.com',
    role: 'client',
    iat: 1234567890,
    exp: 1234571490 // 1 hora
  }
}
```

**Refresh Token**:
- Armazenado em httpOnly cookie
- Validade: 30 dias
- Rotação automática

### 7.2 Criptografia

**Credenciais do Instagram**:
```javascript
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = process.env.ENCRYPTION_KEY;

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}
```

### 7.3 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requests
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

---

## 📊 8. MONITORAMENTO E LOGS

### 8.1 Winston Logger

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 8.2 Sentry (Error Tracking)

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Error handler middleware
app.use(Sentry.Handlers.errorHandler());
```

---

## 🚀 9. DEPLOY E INFRAESTRUTURA

### 9.1 Docker

**Dockerfile (Backend)**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/eio
      - REDIS_URL=redis://redis:6379
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: eio
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres-data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

### 9.2 Hosting Recomendado

**Backend**:
- AWS EC2 / Digital Ocean Droplet
- Mínimo: 2 vCPUs, 4GB RAM
- Recomendado: 4 vCPUs, 8GB RAM

**Banco de Dados**:
- AWS RDS PostgreSQL
- Digital Ocean Managed Database

**Redis**:
- AWS ElastiCache
- Redis Cloud

**CDN**:
- CloudFlare (frontend estático + proteção DDoS)

### 9.3 CI/CD

**GitHub Actions**:
```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && git pull && docker-compose up -d'
```

---

## 📈 10. ESCALABILIDADE

### 10.1 Horizontal Scaling

- Load Balancer (NGINX)
- Múltiplas instâncias do backend
- Redis para sessões compartilhadas
- PostgreSQL replication (read replicas)

### 10.2 Performance

**Caching Strategy**:
- Redis para:
  - Sessões de usuário
  - Dados frequentemente acessados
  - Rate limiting
  - Job queues

**Database**:
- Índices em colunas chave
- Paginação em listagens
- Queries otimizadas

---

**🎯 Este documento define toda a arquitetura técnica do sistema E.I.O. Use-o como referência para desenvolvimento e deploy.**
