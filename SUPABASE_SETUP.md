# 🚀 GUIA COMPLETO - CONFIGURAÇÃO SUPABASE

## 📋 PARTE 1: CRIAR CONTA E PROJETO

### PASSO 1: Criar Conta no Supabase (2 minutos)

1. **Abrir navegador** e acessar: <https://supabase.com>
2. **Clicar em "Start your project"** (botão verde)
3. **Escolher método de login**:
   - Opção 1: GitHub (recomendado)
   - Opção 2: Email
4. **Fazer login** com a conta escolhida
5. ✅ Você será redirecionado para o painel

---

### PASSO 2: Criar Novo Projeto (3 minutos)

1. **No painel inicial**, clicar em **"New Project"** (botão verde)

2. **Preencher formulário**:

   ```
   Organization: [Selecionar ou criar nova]
   Name: eio-system
   Database Password: [CRIAR SENHA FORTE - ANOTE!]
   Region: South America (São Paulo)
   Pricing Plan: Free (para começar)
   ```

3. **IMPORTANTE**: Anote a senha do banco em local seguro!

4. **Clicar em "Create new project"**

5. **Aguardar** ~2 minutos (barra de progresso aparecerá)

6. ✅ Quando terminar, você verá o painel do projeto

---

## 📊 PARTE 2: CRIAR TABELAS NO BANCO

### PASSO 3: Acessar SQL Editor (1 minuto)

1. **No menu lateral esquerdo**, clicar em **"SQL Editor"**
2. **Clicar em "New Query"** (botão superior direito)
3. ✅ Editor SQL abrirá

---

### PASSO 4: Executar Script SQL (2 minutos)

1. **Abrir o arquivo** `database/schema.sql` no seu computador
   - Caminho: `c:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo\database\schema.sql`

2. **Copiar TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)

3. **Colar no SQL Editor** do Supabase (Ctrl+V)

4. **Clicar em "Run"** (botão verde inferior direito)

5. **Aguardar execução** (~10 segundos)

6. ✅ Deve aparecer: "Success. No rows returned"

---

### PASSO 5: Verificar Tabelas Criadas (1 minuto)

1. **No menu lateral**, clicar em **"Table Editor"**

2. **Verificar se aparecem 5 tabelas**:
   - ✅ users
   - ✅ subscriptions
   - ✅ flows
   - ✅ leads
   - ✅ executions

3. **Clicar em cada tabela** para ver a estrutura

4. ✅ Se todas aparecerem, está correto!

---

## 🔑 PARTE 3: OBTER CREDENCIAIS

### PASSO 6: Copiar URL e Keys (2 minutos)

1. **No menu lateral**, clicar em **"Settings"** (ícone de engrenagem)

2. **Clicar em "API"** no submenu

3. **Você verá 3 informações importantes**:

   **A) Project URL**

   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   ➡️ **COPIAR E ANOTAR**

   **B) anon/public key**

   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```

   ➡️ **COPIAR E ANOTAR**

   **C) service_role key** (clicar em "Reveal" para ver)

   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```

   ➡️ **COPIAR E ANOTAR**

4. ✅ Guarde essas 3 informações em local seguro!

---

## 💻 PARTE 4: CONFIGURAR BACKEND

### PASSO 7: Criar Arquivo .env (3 minutos)

1. **Abrir VS Code** ou editor de texto

2. **Navegar até a pasta backend**:

   ```
   c:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo\backend
   ```

3. **Criar novo arquivo** chamado `.env` (com o ponto no início!)

4. **Colar este conteúdo** (substituindo os valores):

   ```env
   # ═══════════════════════════════════════════════════════════
   # E.I.O SYSTEM - CONFIGURAÇÃO DE PRODUÇÃO
   # ═══════════════════════════════════════════════════════════

   # SUPABASE (COLE SUAS CREDENCIAIS AQUI)
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # JWT (MANTER COMO ESTÁ)
   JWT_SECRET=eio-secret-key-2026-production-change-in-production

   # SERVER (MANTER COMO ESTÁ)
   PORT=3000
   NODE_ENV=development

   # LICENSE (MANTER COMO ESTÁ)
   TRIAL_DAYS=5
   SUPPORT_EMAIL=msasdigital@gmail.com

   # CORS (ADICIONAR SEU DOMÍNIO DEPOIS)
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173
   ```

5. **SUBSTITUIR**:
   - `SUPABASE_URL` → Colar a URL que você copiou
   - `SUPABASE_ANON_KEY` → Colar a anon key
   - `SUPABASE_SERVICE_KEY` → Colar a service_role key

6. **Salvar arquivo** (Ctrl+S)

7. ✅ Arquivo .env criado!

---

### PASSO 8: Instalar Dependências (2 minutos)

1. **Abrir PowerShell** ou Terminal

2. **Navegar até pasta backend**:

   ```powershell
   cd c:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo\backend
   ```

3. **Instalar pacotes do Supabase**:

   ```powershell
   npm install @supabase/supabase-js dotenv
   ```

4. **Aguardar instalação** (~30 segundos)

5. ✅ Deve aparecer: "added X packages"

---

### PASSO 9: Testar Conexão (1 minuto)

1. **No mesmo terminal**, executar:

   ```powershell
   node server.js
   ```

2. **Verificar mensagens**:

   ```
   ✅ Supabase conectado com sucesso
   ✅ Servidor: http://localhost:3000
   ```

3. **Se aparecer erro**:
   - Verificar se .env está correto
   - Verificar se credenciais foram coladas corretamente
   - Verificar se não tem espaços extras

4. ✅ Se tudo OK, servidor está rodando!

---

## 🧪 PARTE 5: TESTAR SISTEMA

### PASSO 10: Criar Primeiro Usuário (2 minutos)

1. **Abrir navegador** em: <http://localhost:3000/register>

2. **Preencher formulário**:

   ```
   Nome: Seu Nome
   Email: seu@email.com
   Senha: senha123
   Confirmar Senha: senha123
   ```

3. **Clicar em "Criar Conta Grátis"**

4. **Aguardar** mensagem de sucesso

5. ✅ Será redirecionado para login

---

### PASSO 11: Verificar no Supabase (1 minuto)

1. **Voltar ao painel do Supabase**

2. **Ir em "Table Editor" → "users"**

3. **Verificar se seu usuário aparece** na tabela

4. **Ir em "Table Editor" → "subscriptions"**

5. **Verificar se sua assinatura de trial aparece**

6. ✅ Se aparecer, integração funcionou!

---

### PASSO 12: Fazer Login (1 minuto)

1. **Acessar**: <http://localhost:3000/login>

2. **Fazer login** com as credenciais criadas

3. **Deve redirecionar** para o dashboard

4. ✅ Sistema funcionando com Supabase!

---

## ✅ CHECKLIST FINAL

- [ ] Conta Supabase criada
- [ ] Projeto "eio-system" criado
- [ ] Tabelas criadas (5 tabelas)
- [ ] Credenciais copiadas
- [ ] Arquivo .env criado
- [ ] Dependências instaladas
- [ ] Servidor iniciado sem erros
- [ ] Usuário criado com sucesso
- [ ] Login funcionando
- [ ] Dados aparecendo no Supabase

---

## 🆘 PROBLEMAS COMUNS

### ❌ "Erro ao conectar com Supabase"

**Solução**: Verificar se SUPABASE_URL e SUPABASE_SERVICE_KEY estão corretos no .env

### ❌ "Table 'users' does not exist"

**Solução**: Executar novamente o SQL do PASSO 4

### ❌ "Invalid API key"

**Solução**: Verificar se copiou a service_role key (não a anon key)

### ❌ Servidor não inicia

**Solução**:

1. Verificar se .env existe na pasta backend
2. Verificar se não tem erros de sintaxe no .env
3. Executar: `npm install` novamente

---

## 📞 SUPORTE

**Email**: <msasdigital@gmail.com>

**Próximo Passo**: Ver `CLOUDFLARE_SETUP.md` para configurar domínio

---

**MS Assessoria Digital**
**E.I.O System - Decole seu Instagram**
**Supabase configurado com sucesso!** ✅
