# 🚀 Supabase - Guia Rápido de Integração

## ✅ Checklist Rápido

### 1️⃣ Cadastro no Supabase (5 minutos)
- [ ] Acessar https://supabase.com
- [ ] Criar conta (GitHub ou Email)
- [ ] Criar novo projeto
- [ ] Anotar a senha do banco de dados
- [ ] Aguardar criação do projeto (1-2 min)

### 2️⃣ Obter Credenciais (2 minutos)
- [ ] Ir em Settings > Database
- [ ] Copiar Connection String (Connection Pooling)
- [ ] Ou anotar: Host, Port, User, Password

### 3️⃣ Configurar Backend (3 minutos)
- [ ] Criar arquivo `backend/.env`
- [ ] Copiar variáveis (ver guia completo)
- [ ] Adicionar `DB_SSL=true`
- [ ] Colar connection string ou configurar host/user/password

### 4️⃣ Atualizar Código (já feito!)
- [x] ✅ Arquivo `connection.js` já atualizado com SSL
- [x] ✅ Suporte para DATABASE_URL e conexão manual
- [x] ✅ Dependências já instaladas (pg, sequelize)

### 5️⃣ Testar (2 minutos)
- [ ] Executar: `cd backend && npm run dev`
- [ ] Verificar logs: "✓ Database connection established"
- [ ] Pronto! 🎉

---

## 📝 Arquivo .env Mínimo

Crie `backend/.env`:

```env
NODE_ENV=development

# Supabase (escolha uma opção):

# OPÇÃO 1: Connection String (Mais fácil)
DATABASE_URL=postgresql://postgres.xxxxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DB_SSL=true

# OPÇÃO 2: Individual
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xxxxx
DB_PASSWORD=sua_senha
DB_SSL=true

# JWT (gerar chaves fortes para produção)
JWT_SECRET=seu_jwt_secret_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_aqui

# Encryption
ENCRYPTION_KEY=chave_32_caracteres_aqui

# Outros
FRONTEND_URL=http://localhost:3000
PORT=3000
```

---

## 🎯 Onde Encontrar as Credenciais

1. **Dashboard Supabase** → Seu Projeto
2. **Settings** (⚙️) → **Database**
3. **Connection string** → **Connection pooling** (use esta!)
4. Copie a URL completa ou anote:
   - Host
   - Port (6543 para pooler)
   - Database (sempre `postgres`)
   - User (formato: `postgres.xxxxx`)
   - Password (a senha que você criou)

---

## ⚠️ Lembretes Importantes

1. ✅ Use **Connection Pooling** (porta 6543) - melhor performance
2. ✅ SSL é **obrigatório** - sempre `DB_SSL=true`
3. ✅ User no formato `postgres.xxxxx` para pooler
4. ✅ Não commitar `.env` no git (já deve estar no .gitignore)

---

## 🆘 Problemas Comuns

**Erro "SSL required":**
→ Adicione `DB_SSL=true` no .env

**Erro "Connection refused":**
→ Verifique se está usando porta 6543 (pooler)

**Erro "Authentication failed":**
→ Verifique user (deve ser `postgres.xxxxx` para pooler)

**Erro "Too many connections":**
→ Use connection pooling (porta 6543)

---

**Tempo total: ~10 minutos para integração completa! 🚀**

Veja o guia completo em `SUPABASE_INTEGRATION_GUIDE.md` para mais detalhes.

