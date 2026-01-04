# 🔥 Guia Completo de Integração Supabase - E.I.O

## 📋 Passo 1: Criar Conta no Supabase

### 1.1 Acessar o Site
1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"** ou **"Sign up"**

### 1.2 Criar Conta
- **Opção 1:** Criar conta com GitHub (recomendado)
- **Opção 2:** Criar conta com email

### 1.3 Criar Novo Projeto
1. Clique em **"New Project"**
2. Preencha os dados:
   - **Organization Name:** Escolha ou crie uma organização
   - **Project Name:** `eio-system` (ou outro nome de sua escolha)
   - **Database Password:** ⚠️ **ANOTE ESSA SENHA!** (você precisará depois)
   - **Region:** Escolha `South America (São Paulo)` (mais próximo)
   - **Pricing Plan:** Selecione **"Free"**

3. Clique em **"Create new project"**
4. Aguarde 1-2 minutos enquanto o projeto é criado

---

## 📋 Passo 2: Obter Credenciais de Conexão

### 2.1 Acessar Configurações do Projeto
1. No dashboard do Supabase, clique em **⚙️ Settings** (ícone de engrenagem)
2. No menu lateral, clique em **"API"** ou **"Database"**

### 2.2 Obter String de Conexão (Database)

Na seção **"Connection string"** ou **"Connection pooling"**, você verá:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

Ou usando connection pooling (recomendado para aplicações):
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**⚠️ IMPORTANTE:** Use a **connection pooling** para produção!

### 2.3 Informações Necessárias

Anote essas informações (você encontrará no painel):

- **Host:** `db.xxxxx.supabase.co` (Database) ou `aws-0-sa-east-1.pooler.supabase.com` (Pooler)
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** A senha que você definiu ao criar o projeto
- **Port:** `5432` (Database direto) ou `6543` (Pooler)

### 2.4 Anon Key (opcional, se quiser usar autenticação Supabase)
- Na aba **"API"** do Settings
- Copie a **"anon public"** key (se precisar usar Supabase Auth)

---

## 📋 Passo 3: Instalar Dependências (já instaladas!)

✅ **Boa notícia:** Você já tem todas as dependências necessárias!

O Supabase usa PostgreSQL padrão, e você já tem:
- ✅ `pg` (cliente PostgreSQL)
- ✅ `sequelize` (ORM que funciona com Supabase)

**Nenhuma instalação adicional necessária!**

---

## 📋 Passo 4: Configurar Variáveis de Ambiente

### 4.1 Criar Arquivo .env no Backend

Crie o arquivo `backend/.env` com as seguintes variáveis:

```env
# Ambiente
NODE_ENV=development

# Supabase Database Connection
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xxxxx
DB_PASSWORD=sua_senha_aqui
DB_SSL=true

# Ou use Connection String completa (alternativa)
DATABASE_URL=postgresql://postgres.xxxxx:sua_senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# JWT (gerar novas chaves para produção)
JWT_SECRET=seu_jwt_secret_muito_forte_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_muito_forte_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption Key (gerar nova chave)
ENCRYPTION_KEY=sua_chave_de_criptografia_32_caracteres

# Redis (opcional - pode usar Supabase Realtime ou manter Redis separado)
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=3000

# Stripe (se usar pagamentos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mercado Pago (se usar pagamentos)
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_WEBHOOK_SECRET=...

# Sentry (opcional)
SENTRY_DSN=

# Log Level
LOG_LEVEL=info
```

### 4.2 Substituir Valores

**Substitua:**
- `postgres.xxxxx` → O valor que aparece na sua connection string
- `sua_senha_aqui` → A senha que você definiu ao criar o projeto
- `xxxxx` → O código do seu projeto (aparece na URL do Supabase)

**Exemplo real:**
```
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.gkfjhdkfhdskfh
DB_PASSWORD=MinhaSenha123!@#
```

---

## 📋 Passo 5: Atualizar Conexão do Banco de Dados

### 5.1 Editar connection.js

O arquivo `backend/src/database/connection.js` já está configurado, mas precisamos adicionar suporte a SSL (obrigatório no Supabase):

```javascript
const sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        
        // ⭐ ADICIONAR: Configuração SSL para Supabase
        dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
                require: true,
                rejectUnauthorized: false
            } : false
        },
        
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    }
);
```

### 5.2 Usar DATABASE_URL (Alternativa Simples)

Se preferir usar a connection string completa, pode atualizar assim:

```javascript
const { Sequelize } = require('sequelize');

// Se tiver DATABASE_URL, usa ela; senão, monta manualmente
const sequelize = process.env.DATABASE_URL 
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'eio_db',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            dialectOptions: {
                ssl: process.env.DB_SSL === 'true' ? {
                    require: true,
                    rejectUnauthorized: false
                } : false
            },
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            define: {
                timestamps: true,
                underscored: true,
                freezeTableName: true
            }
        }
    );
```

---

## 📋 Passo 6: Criar Tabelas no Supabase

### 6.1 Opção 1: Usar Sequelize Sync (Desenvolvimento)

Execute o backend uma vez em modo desenvolvimento:

```bash
cd backend
npm run dev
```

O Sequelize criará automaticamente as tabelas (se configurado para sync).

### 6.2 Opção 2: SQL Editor do Supabase (Recomendado para Produção)

1. No dashboard do Supabase, vá em **"SQL Editor"**
2. Execute os comandos SQL para criar as tabelas (se tiver migrations)
3. Ou use o Sequelize migrations:

```bash
cd backend
npm run migrate
```

---

## 📋 Passo 7: Testar Conexão

### 7.1 Testar Manualmente

Crie um arquivo de teste `backend/test-connection.js`:

```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexão com Supabase estabelecida com sucesso!');
        
        // Testar uma query simples
        const [results] = await sequelize.query('SELECT NOW()');
        console.log('✅ Query de teste executada:', results);
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        process.exit(1);
    }
}

testConnection();
```

Execute:
```bash
cd backend
node test-connection.js
```

### 7.2 Iniciar Servidor

```bash
cd backend
npm run dev
```

Se tudo estiver correto, você verá:
```
✓ Database connection established successfully
✓ Database models synchronized
✓ Server running on port 3000
```

---

## 📋 Passo 8: Configurar Row Level Security (RLS) - Opcional

O Supabase tem Row Level Security habilitado por padrão. Para desenvolvimento, você pode desabilitar temporariamente, mas **para produção, configure RLS adequadamente**.

### 8.1 Desabilitar RLS Temporariamente (Apenas Desenvolvimento)

No SQL Editor do Supabase:

```sql
-- Desabilitar RLS em todas as tabelas (APENAS PARA DEV!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE flows DISABLE ROW LEVEL SECURITY;
ALTER TABLE executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
```

### 8.2 Configurar RLS Corretamente (Produção)

Configure políticas RLS adequadas para cada tabela baseado no seu modelo de autenticação.

---

## 📋 Passo 9: Limites do Plano Gratuito

### O que você tem de graça:

✅ **500 MB** de banco de dados
✅ **2 GB** de bandwidth
✅ **50.000 usuários ativos** por mês
✅ **500 MB** de storage para arquivos
✅ **2 milhões de Edge Function invocations**
✅ API REST automática
✅ Autenticação (email, OAuth, etc)
✅ Realtime subscriptions

### Estimativa de Clientes Suportados:

- **200-400 clientes ativos** no plano gratuito
- Depende do uso de cada cliente
- Quando ultrapassar, o custo é muito baixo (paga apenas pelo excedente)

---

## 📋 Passo 10: Próximos Passos (Opcional)

### 10.1 Usar Supabase Auth (Opcional)

Se quiser usar autenticação do Supabase ao invés de JWT customizado:
- Vantagem: Menos código, mais segurança
- Desvantagem: Precisa adaptar o sistema de autenticação

### 10.2 Usar Supabase Storage (Opcional)

Para armazenar arquivos (fotos de perfil, etc):
- Integrar Supabase Storage
- 500 MB grátis

### 10.3 Usar Supabase Realtime (Opcional)

Para substituir Redis/WebSocket:
- Realtime subscriptions grátis
- Sincronização automática

---

## ✅ Checklist de Integração

- [ ] Conta criada no Supabase
- [ ] Projeto criado no Supabase
- [ ] Credenciais anotadas
- [ ] Arquivo `.env` criado e configurado
- [ ] `connection.js` atualizado com SSL
- [ ] Conexão testada
- [ ] Tabelas criadas
- [ ] Servidor iniciado com sucesso
- [ ] Testes realizados

---

## 🆘 Troubleshooting

### Erro: "SSL required"
✅ **Solução:** Adicione `DB_SSL=true` no .env e configure dialectOptions.ssl

### Erro: "Connection refused"
✅ **Solução:** Verifique se está usando o host e porta corretos (pooler usa porta 6543)

### Erro: "Authentication failed"
✅ **Solução:** Verifique se o usuário está no formato correto (postgres.xxxxx para pooler)

### Erro: "Too many connections"
✅ **Solução:** Use connection pooling (porta 6543) ao invés de conexão direta (porta 5432)

---

## 📚 Recursos Úteis

- **Documentação Supabase:** https://supabase.com/docs
- **Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres
- **SSL Configuration:** https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-required

---

**Pronto! Seu sistema está integrado ao Supabase! 🚀**

