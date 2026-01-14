# 🔧 CONFIGURAR VARIÁVEIS DE AMBIENTE NO VERCEL

## ❌ PROBLEMA IDENTIFICADO

O erro "Erro de conexão. Tente novamente." acontece porque:

- ✅ Frontend deployado no Vercel
- ✅ API deployada no Vercel (`/api/index.js`)
- ❌ **Variáveis de ambiente NÃO configuradas**

A API precisa das credenciais do Supabase para funcionar!

## 🔑 VARIÁVEIS NECESSÁRIAS

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-service-role
JWT_SECRET=eio-secret-key-2026
```

## 📋 PASSO A PASSO - Configurar no Vercel

### 1. Obter Credenciais do Supabase

1. Acesse: <https://supabase.com/dashboard>
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** (SUPABASE_URL)
   - **service_role key** (SUPABASE_SERVICE_KEY) ⚠️ **NÃO a anon key!**

### 2. Adicionar no Vercel

**Opção A: Via Dashboard (Recomendado)**

1. Acesse: <https://vercel.com/dashboard>
2. Selecione o projeto **eio-system**
3. Vá em **Settings** > **Environment Variables**
4. Adicione as 3 variáveis:

```
Name: SUPABASE_URL
Value: https://seu-projeto.supabase.co

Name: SUPABASE_SERVICE_KEY
Value: sua-chave-service-role-aqui

Name: JWT_SECRET
Value: eio-secret-key-2026
```

1. Clique em **Save**
2. Vá em **Deployments** > **Redeploy**

**Opção B: Via CLI**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Adicionar variáveis
vercel env add SUPABASE_URL
# Cole o valor quando solicitado

vercel env add SUPABASE_SERVICE_KEY
# Cole o valor quando solicitado

vercel env add JWT_SECRET
# Cole: eio-secret-key-2026

# Redeploy
vercel --prod
```

## ✅ VERIFICAR SE FUNCIONOU

### 1. Testar API Health Check

Acesse no navegador:

```
https://eio-system.vercel.app/api/health
```

**Resposta esperada:**

```json
{
  "status": "OK",
  "message": "E.I.O System API está rodando",
  "supabaseConfigured": true,
  "timestamp": "2026-01-12T..."
}
```

Se `supabaseConfigured` for `false`, as variáveis não estão configuradas!

### 2. Testar Login

1. Acesse: <https://eio-system.vercel.app/login.html>
2. Tente fazer login
3. Se funcionar = ✅ **SUCESSO!**

## 🆘 TROUBLESHOOTING

### Problema: supabaseConfigured = false

**Solução:**

1. Verifique se as variáveis foram adicionadas corretamente
2. Certifique-se de usar a **service_role key**, não a anon key
3. Faça redeploy após adicionar variáveis

### Problema: Ainda dá erro de conexão

**Solução:**

1. Abra o Console do navegador (F12)
2. Vá na aba **Network**
3. Tente fazer login novamente
4. Clique na requisição `/api/v1/auth/login`
5. Veja a resposta - deve mostrar o erro específico

### Problema: CORS Error

**Solução:**
A API já tem CORS configurado, mas se der erro:

1. Verifique se está acessando via HTTPS
2. Limpe cache do navegador

## 📝 ARQUIVO .env.local (Para Referência)

Crie este arquivo localmente para testes:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-service-role

# JWT
JWT_SECRET=eio-secret-key-2026

# Opcional
NODE_ENV=production
```

⚠️ **NUNCA** commite este arquivo no Git!

## 🎯 PRÓXIMOS PASSOS

1. ✅ Configure as variáveis no Vercel
2. ✅ Faça redeploy
3. ✅ Teste a API: `/api/health`
4. ✅ Teste o login
5. ✅ Comece os testes das funcionalidades

---

**Importante:** Após configurar as variáveis, aguarde 1-2 minutos para o Vercel aplicar as mudanças e faça um hard refresh (Ctrl + F5) no navegador.
