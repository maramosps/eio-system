# 🚀 Guia de Deploy E.I.O System

**Versão:** 4.4.5  
**Última Atualização:** 2026-02-06

---

## 📋 Checklist Pré-Deploy

Antes de iniciar, certifique-se de ter:

- [ ] Conta na [Vercel](https://vercel.com)
- [ ] Projeto Supabase configurado
- [ ] Acesso ao repositório GitHub

---

## 🔑 Variáveis de Ambiente (OBRIGATÓRIAS)

Configure **TODAS** as variáveis abaixo no painel da Vercel:

### Passo a Passo

1. Acesse: `https://vercel.com/[seu-usuario]/[seu-projeto]/settings/environment-variables`
2. Adicione cada variável listada abaixo
3. Selecione **todos os ambientes** (Production, Preview, Development)
4. Clique em "Save"
5. Faça um **Redeploy** para aplicar as alterações

### Variáveis Necessárias

| Variável | Descrição | Onde Encontrar |
|----------|-----------|----------------|
| `SUPABASE_URL` | URL do seu projeto Supabase | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_SERVICE_KEY` | Chave de serviço (admin) | Supabase Dashboard > Settings > API > service_role key |
| `SUPABASE_ANON_KEY` | Chave pública (anon) | Supabase Dashboard > Settings > API > anon key |
| `JWT_SECRET` | Segredo para tokens JWT | Gere uma string aleatória segura (32+ chars) |
| `NODE_ENV` | Ambiente de execução | Use: `production` |

### Exemplo de Valores

```env
SUPABASE_URL=https://seuprojetoid.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=minha-chave-secreta-super-segura-aqui-123!@#
NODE_ENV=production
```

---

## ✅ Verificando o Deploy

Após configurar as variáveis e fazer redeploy:

### 1. Acesse a Rota de Diagnóstico

```
https://seu-projeto.vercel.app/api/health
```

### 2. Resposta Esperada (Sistema Saudável)

```json
{
  "status": "online",
  "message": "E.I.O System API está pronta para produção",
  "version": "4.4.5",
  "env_check": {
    "SUPABASE_URL": "Configurado ✅",
    "SUPABASE_SERVICE_KEY": "Configurado ✅",
    "SUPABASE_ANON_KEY": "Configurado ✅",
    "JWT_SECRET": "Configurado ✅",
    "NODE_ENV": "production"
  },
  "database": {
    "supabase_client": "Inicializado ✅",
    "ready": true
  }
}
```

### 3. Resposta de Erro (Variáveis Faltando)

```json
{
  "status": "degraded",
  "message": "3 variável(eis) de ambiente não configurada(s)",
  "env_check": {
    "SUPABASE_URL": "Faltando ❌",
    "SUPABASE_SERVICE_KEY": "Faltando ❌",
    "SUPABASE_ANON_KEY": "Faltando ❌",
    "JWT_SECRET": "Configurado ✅"
  }
}
```

---

## 🔧 Troubleshooting

### Problema: "Servidor retornou resposta inválida"

**Causa:** Variáveis de ambiente não configuradas na Vercel.

**Solução:**

1. Acesse `/api/health` para ver quais variáveis estão faltando
2. Configure as variáveis no painel Vercel
3. Faça redeploy

### Problema: "Erro 500" ou "Internal Server Error"

**Causa:** Falha na conexão com Supabase.

**Solução:**

1. Verifique se as chaves do Supabase estão corretas
2. Confirme se o projeto Supabase está ativo
3. Verifique os logs no Vercel Dashboard > Logs

### Problema: Download da extensão retorna 404

**Causa:** Arquivo ZIP não está no repositório.

**Solução:**

1. Verifique se `frontend/downloads/eio-extension-v4.4.5.zip` existe
2. Confirme que `.gitignore` não está bloqueando arquivos `.zip`
3. Execute: `git add -f frontend/downloads/eio-extension-v4.4.5.zip`

---

## 📁 Estrutura de Arquivos de Deploy

```
eio-sistema-completo/
├── .env.example           # Template (commitar)
├── .env                   # Valores reais (NÃO commitar)
├── vercel.json            # Configuração Vercel
├── api/
│   └── index.js           # API principal
├── src/services/
│   └── supabase.js        # Cliente Supabase centralizado
├── frontend/
│   ├── downloads/
│   │   └── eio-extension-v4.4.5.zip
│   └── *.html
└── public/
    └── downloads/
        └── eio-extension-v4.4.5.zip
```

---

## 🔄 Atualizando a Extensão

Quando atualizar o código da extensão:

1. Atualize a versão no `extension/manifest.json`
2. Gere novo ZIP:

   ```powershell
   Compress-Archive -Path "extension\*" -DestinationPath "frontend\downloads\eio-extension-vX.X.X.zip" -Force
   ```

3. Copie para public:

   ```powershell
   Copy-Item "frontend\downloads\eio-extension-vX.X.X.zip" "public\downloads\" -Force
   ```

4. Force add ao Git:

   ```bash
   git add -f frontend/downloads/eio-extension-vX.X.X.zip
   git add -f public/downloads/eio-extension-vX.X.X.zip
   ```

5. Commit e Push

---

## 📞 Suporte

- **WhatsApp:** [+55 21 97531-2662](https://wa.me/5521975312662)
- **Health Check:** `https://eio-system.vercel.app/api/health`

---

*Documento mantido pela equipe E.I.O System*
