# 🚀 E.I.O Backend API

Backend completo do sistema E.I.O - Engajamento Inteligente Orgânico.

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar variáveis de ambiente
# Configure database, Redis, JWT, Stripe, Mercado Pago, etc.

# Criar banco de dados PostgreSQL
createdb eio_db

# Iniciar servidor de desenvolvimento
npm run dev

# Iniciar servidor de produção
npm start
```

## 🗄️ Banco de Dados

### PostgreSQL Setup

```bash
# Instalar PostgreSQL
# Windows: https://www.postgresql.org/download/windows/

# Criar banco
createdb eio_db

# As tabelas serão criadas automaticamente pelo Sequelize ao iniciar
```

### Redis Setup

```bash
# Instalar Redis
# Windows: https://github.com/microsoftarchive/redis/releases

# Iniciar Redis
redis-server
```

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── server.js              # Servidor principal
│   ├── controllers/           # Controladores
│   │   ├── auth.controller.js
│   │   └── user.controller.js
│   ├── models/                # Models Sequelize
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   ├── Flow.js
│   │   ├── Execution.js
│   │   ├── Log.js
│   │   └── Account.js
│   ├── routes/                # Rotas da API
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── ...
│   ├── middlewares/           # Middlewares
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── services/              # Serviços
│   │   ├── redis.service.js
│   │   ├── socket.service.js
│   │   └── payment.service.js
│   ├── utils/                 # Utilitários
│   │   ├── jwt.js
│   │   └── encryption.js
│   ├── validators/            # Schemas de validação
│   │   └── auth.validator.js
│   └── database/
│       └── connection.js
├── logs/                      # Arquivos de log
├── package.json
└── .env.example
```

## 🔑 APIs Principais

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/google` - Login com Google
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/logout` - Logout

### Usuário
- `GET /api/v1/users/me` - Obter perfil
- `PUT /api/v1/users/me` - Atualizar perfil
- `DELETE /api/v1/users/me` - Deletar conta

### Automações (em desenvolvimento)
- `GET /api/v1/flows` - Listar fluxos
- `POST /api/v1/flows` - Criar fluxo
- `POST /api/v1/flows/:id/start` - Iniciar fluxo

### WebSocket
- Conectar em `ws://localhost:3000` com token JWT
- Events: `stats:update`, `log:entry`, `execution:status`

## 🔐 Segurança

- ✅ JWT com refresh tokens
- ✅ Bcrypt para senhas
- ✅ AES-256 para dados sensíveis
- ✅ Rate limiting
- ✅ Helmet (security headers)
- ✅ CORS configurado

## 🚀 Deploy

### Requisitos de Produção
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- 2GB RAM mínimo (4GB recomendado)

### Variáveis de Ambiente Importantes
- `NODE_ENV=production`
- `JWT_SECRET` - Mudar para chave forte
- `ENCRYPTION_KEY` - Gerar nova chave
- `DATABASE_URL` - URL do PostgreSQL
- `REDIS_URL` - URL do Redis

## 📊 Monitoramento

- Logs em `logs/error.log` e `logs/combined.log`
- Sentry para error tracking (configurar `SENTRY_DSN`)
- Health check: `GET /health`

## 🛠️ Desenvolvimento

```bash
# Watch mode
npm run dev

# Testes (quando implementados)
npm test

# Lint (quando configurado)
npm run lint
```

## 📝 Status do Backend

### ✅ Completo
- [x] Servidor Express configurado
- [x] Autenticação JWT
- [x] Models Sequelize
- [x] Middlewares (auth, error, validator)
- [x] Services (Redis, Socket.IO, Payment)
- [x] Rotas básicas

### 🔄 Em Desenvolvimento
- [ ] Controllers completos para todos os endpoints
- [ ] Sistema de filas (Bull)
- [ ] Webhooks de pagamento completos
- [ ] Testes unitários e integração
- [ ] Documentação Swagger/OpenAPI

## 📞 Suporte

Desenvolvido por MS Assessoria Digital
