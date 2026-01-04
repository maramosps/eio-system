# 🚀 GUIA COMPLETO DE DEPLOY - E.I.O SYSTEM

**GitHub + Vercel + Firebase + Cloudflare**

---

## 📋 PRÉ-REQUISITOS

Antes de começar, certifique-se de ter:

- ✅ Node.js 18+ instalado
- ✅ Git instalado
- ✅ Conta GitHub (gratuita)
- ✅ Conta Vercel (gratuita)
- ✅ Conta Firebase (gratuita)
- ✅ Supabase já configurado (✅ FEITO)

---

## 🎯 PARTE 1: GITHUB - REPOSITÓRIO

### Passo 1.1: Instalar GitHub CLI (se não tiver)

```powershell
# Instalar via winget
winget install --id GitHub.cli

# OU baixar de: https://cli.github.com/
```

### Passo 1.2: Login no GitHub

```powershell
# Fazer login
gh auth login

# Selecionar:
# - GitHub.com
# - HTTPS
# - Yes (autenticar com browser)
```

### Passo 1.3: Criar Repositório

```powershell
# Na pasta do projeto
cd C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo

# Inicializar Git
git init

# Adicionar arquivos
git add .

# Primeiro commit
git commit -m "🚀 Initial commit - E.I.O System"

# Criar repositório no GitHub (privado)
gh repo create eio-system --private --source=. --remote=origin --push

# OU criar público
gh repo create eio-system --public --source=. --remote=origin --push
```

**✅ Repositório criado!** Acesse: `https://github.com/SEU_USERNAME/eio-system`

---

## 🎯 PARTE 2: VERCEL - DEPLOY AUTOMÁTICO

### Passo 2.1: Instalar Vercel CLI

```powershell
# Instalar globalmente
npm install -g vercel

# Verificar instalação
vercel --version
```

### Passo 2.2: Login na Vercel

```powershell
# Fazer login
vercel login

# Seguir instruções no browser
```

### Passo 2.3: Deploy Inicial

```powershell
# Na pasta do projeto
cd C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo

# Deploy (primeira vez - modo interativo)
vercel

# Responder:
# - Set up and deploy? Yes
# - Which scope? [Sua conta]
# - Link to existing project? No
# - Project name? eio-system
# - Directory? ./
# - Override settings? No
```

**✅ Deploy realizado!** Você receberá uma URL: `https://eio-system-xxx.vercel.app`

### Passo 2.4: Configurar Variáveis de Ambiente

```powershell
# Adicionar variáveis do .env na Vercel
vercel env add SUPABASE_URL
# Colar: https://zupnyvnrmwoyqajecxmm.supabase.co

vercel env add SUPABASE_ANON_KEY
# Colar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc0MTUsImV4cCI6MjA4MjQzMzQxNX0.j_kNf6oUjY65DXIdIVtDKOHlkktlZvzqHuo_SlEzUvY

vercel env add SUPABASE_SERVICE_KEY
# Colar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1NzQxNSwiZXhwIjoyMDgyNDMzNDE1fQ.IfnFeaJgOGVQrV0NXZaahztmfTnBB8A-F2skQILeRUY

vercel env add JWT_SECRET
# Colar: eio_super_secret_jwt_key_2024_production

vercel env add NODE_ENV
# Digitar: production

vercel env add TRIAL_DAYS
# Digitar: 5

vercel env add SUPPORT_EMAIL
# Digitar: msasdigital@gmail.com
```

**OU importar todas de uma vez:**

```powershell
# Criar arquivo .env.production com as variáveis
# Depois importar:
vercel env pull .env.production
```

### Passo 2.5: Deploy de Produção

```powershell
# Deploy para produção
vercel --prod

# Ou configurar deploy automático via GitHub:
vercel link
```

**✅ Produção no ar!** URL: `https://eio-system.vercel.app`

### Passo 2.6: Configurar Deploy Automático

1. Acesse: <https://vercel.com/dashboard>
2. Selecione o projeto `eio-system`
3. Vá em **Settings** > **Git**
4. Conecte ao repositório GitHub
5. Configure:
   - **Production Branch**: `main`
   - **Auto Deploy**: Enabled

**✅ Agora todo push no GitHub faz deploy automático!**

---

## 🎯 PARTE 3: FIREBASE - PUSH NOTIFICATIONS

### Passo 3.1: Criar Projeto Firebase

1. Acesse: <https://console.firebase.google.com>
2. Clique em **Add Project**
3. Nome: `eio-system`
4. Desabilite Google Analytics (opcional)
5. Clique em **Create Project**

### Passo 3.2: Adicionar Web App

1. No console, clique no ícone **Web** (`</>`)
2. Nome do app: `E.I.O Web`
3. **NÃO** marque Firebase Hosting
4. Clique em **Register app**
5. **COPIE** as credenciais que aparecem

### Passo 3.3: Habilitar Cloud Messaging

1. No menu lateral, vá em **Build** > **Cloud Messaging**
2. Clique em **Get Started**
3. Aceite os termos
4. Copie o **Server Key** (para backend)

### Passo 3.4: Configurar no Projeto

```powershell
# Instalar Firebase SDK
cd backend
npm install firebase firebase-admin

# Adicionar variáveis ao .env
```

Edite `backend/.env` e adicione:

```env
# FIREBASE CONFIGURATION
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=eio-system.firebaseapp.com
FIREBASE_PROJECT_ID=eio-system
FIREBASE_STORAGE_BUCKET=eio-system.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_SERVER_KEY=AAAA...
```

### Passo 3.5: Atualizar Configuração

Edite `backend/firebase-config.js` e substitua os placeholders pelas credenciais reais.

Edite `frontend/firebase-messaging-sw.js` e substitua os placeholders.

### Passo 3.6: Adicionar ao Vercel

```powershell
# Adicionar variáveis Firebase na Vercel
vercel env add FIREBASE_API_KEY
vercel env add FIREBASE_AUTH_DOMAIN
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_STORAGE_BUCKET
vercel env add FIREBASE_MESSAGING_SENDER_ID
vercel env add FIREBASE_APP_ID
vercel env add FIREBASE_SERVER_KEY
```

**✅ Firebase configurado!**

---

## 🎯 PARTE 4: CLOUDFLARE - DNS E PROTEÇÃO

### Opção A: Usar Domínio Vercel (Temporário)

**✅ JÁ ESTÁ FUNCIONANDO!**

Sua aplicação está em: `https://eio-system.vercel.app`

- ✅ HTTPS automático
- ✅ SSL/TLS ativo
- ✅ CDN global
- ✅ Pronto para usar

### Opção B: Domínio Personalizado (Futuro)

Quando comprar um domínio (ex: `eio.com.br`):

#### Passo 4.1: Adicionar Domínio na Vercel

1. Vercel Dashboard > Projeto > **Settings** > **Domains**
2. Adicionar: `eio.com.br` e `www.eio.com.br`
3. Vercel mostrará os registros DNS necessários

#### Passo 4.2: Configurar Cloudflare

1. Acesse: <https://dash.cloudflare.com>
2. Adicione seu site: `eio.com.br`
3. Escolha plano **Free**
4. Cloudflare mostrará os nameservers

#### Passo 4.3: Atualizar Registrador de Domínio

No site onde comprou o domínio (Registro.br, GoDaddy, etc):

1. Vá em **DNS Settings**
2. Altere os **Nameservers** para os da Cloudflare:

   ```
   nameserver1.cloudflare.com
   nameserver2.cloudflare.com
   ```

#### Passo 4.4: Configurar DNS na Cloudflare

Adicione os registros que a Vercel pediu:

```
Type: CNAME
Name: @
Target: cname.vercel-dns.com
Proxy: ON (nuvem laranja)

Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy: ON (nuvem laranja)
```

#### Passo 4.5: Configurar SSL/TLS

1. Cloudflare > **SSL/TLS** > **Overview**
2. Modo: **Full (strict)**
3. **Edge Certificates** > Always Use HTTPS: **ON**

**✅ Domínio configurado!** Aguarde 24-48h para propagação DNS.

---

## 🎯 PARTE 5: ATUALIZAR EXTENSÃO

### Passo 5.1: Atualizar API URL

Edite `extension/license-manager.js`:

```javascript
const LICENSE_CONFIG = {
    API_URL: 'https://eio-system.vercel.app',  // ✅ URL da Vercel
    DEV_MODE: false,
    DEV_SKIP_LICENSE: false
};
```

### Passo 5.2: Atualizar Manifest

Edite `extension/manifest.json`:

```json
"host_permissions": [
    "https://*.instagram.com/*",
    "https://eio-system.vercel.app/*"
]
```

### Passo 5.3: Commit e Push

```powershell
git add .
git commit -m "🔧 Atualizar URLs para Vercel"
git push origin main
```

**✅ Deploy automático será acionado!**

---

## ✅ CHECKLIST FINAL

### GitHub

- [ ] Repositório criado
- [ ] Código commitado
- [ ] Push realizado

### Vercel

- [ ] CLI instalado
- [ ] Login realizado
- [ ] Deploy inicial feito
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy de produção realizado
- [ ] Deploy automático configurado
- [ ] URL funcionando com HTTPS

### Firebase

- [ ] Projeto criado
- [ ] Web App registrado
- [ ] Cloud Messaging habilitado
- [ ] SDK instalado
- [ ] Configuração atualizada
- [ ] Variáveis adicionadas na Vercel

### Cloudflare (Opcional)

- [ ] Usando domínio Vercel temporário ✅
- [ ] OU domínio personalizado configurado

### Extensão

- [ ] API_URL atualizado
- [ ] DEV_MODE desativado
- [ ] Manifest atualizado
- [ ] Código commitado

---

## 🧪 TESTAR TUDO

### Teste 1: Backend API

```powershell
# Testar health check
curl https://eio-system.vercel.app/api/health
```

Deve retornar:

```json
{
  "status": "OK",
  "message": "E.I.O System API está rodando"
}
```

### Teste 2: Frontend

Abra no navegador: `https://eio-system.vercel.app`

Deve carregar a landing page.

### Teste 3: Registro de Usuário

1. Acesse: `https://eio-system.vercel.app/register`
2. Crie uma conta de teste
3. Verifique no Supabase se o usuário foi criado

### Teste 4: Extensão

1. Carregue a extensão no Chrome
2. Abra o popup
3. Faça login com a conta criada
4. Verifique se conecta à API da Vercel

---

## 📊 MONITORAMENTO

### Vercel Analytics (Gratuito)

1. Vercel Dashboard > Projeto > **Analytics**
2. Veja visitas, performance, etc.

### Vercel Logs

```powershell
# Ver logs em tempo real
vercel logs
```

### Supabase Dashboard

1. <https://supabase.com/dashboard>
2. Veja queries, usuários, storage

---

## 💰 CUSTOS

### Planos Gratuitos Incluem

**Vercel Free:**

- 100 GB bandwidth/mês
- Serverless Functions ilimitadas
- Deploy automático
- HTTPS/SSL grátis

**Firebase Free (Spark):**

- 10GB Cloud Storage
- 1GB/dia de transferência
- Notificações ilimitadas

**Supabase Free:**

- 500MB database
- 2GB bandwidth
- 50MB file storage

**Cloudflare Free:**

- DNS ilimitado
- DDoS protection
- CDN global
- SSL grátis

**✅ TUDO GRÁTIS para começar!**

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Build failed"

```powershell
# Verificar logs
vercel logs

# Rebuild
vercel --prod --force
```

### Erro: "Environment variables not found"

```powershell
# Listar variáveis
vercel env ls

# Adicionar faltantes
vercel env add NOME_VARIAVEL
```

### Erro: "Firebase not initialized"

Verifique se as variáveis `FIREBASE_*` estão no `.env` e na Vercel.

---

## 📞 SUPORTE

- **Email**: <msasdigital@gmail.com>
- **Vercel Docs**: <https://vercel.com/docs>
- **Firebase Docs**: <https://firebase.google.com/docs>
- **Cloudflare Docs**: <https://developers.cloudflare.com>

---

**MS Assessoria Digital**  
**E.I.O System - Decole seu Instagram**  
**Versão**: 1.0.0  
**Deploy**: Vercel + Firebase + Supabase
