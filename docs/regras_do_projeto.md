# 📋 Regras do Projeto E.I.O System

**Versão:** 1.0  
**Última Atualização:** 2026-02-05

---

## 🔐 Diretrizes de Segurança

### Gerenciamento de Credenciais

1. **NUNCA** commitar credenciais no repositório
2. Usar variáveis de ambiente para todas as chaves sensíveis
3. O arquivo `.env` deve estar no `.gitignore`
4. Manter `.env.example` atualizado com os placeholders

### Cliente Supabase

1. **ÚNICO ponto de inicialização:** `src/services/supabase.js`
2. Todos os módulos devem importar deste arquivo centralizado
3. A extensão Chrome **NÃO DEVE** acessar Supabase diretamente
4. Frontend usa apenas `ANON_KEY` (protegido por RLS)

---

## 📦 REGRA DE OURO DO DEPLOY E NOMENCLATURA

> **CRÍTICO - Seguir obrigatoriamente:**

1. **Sempre que alterar código na pasta `/extension`, RECRIAR o `.zip`**

2. **Nomenclatura Obrigatória:** O arquivo deve chamar-se ESTRITAMENTE:

   ```
   eio.system-vX.X.X.zip
   ```

   Onde X.X.X é a versão do `manifest.json`.

3. **NUNCA inventar sufixos:**
   - ❌ `eio-extension-CORRIGIDO.zip`
   - ❌ `eio-extension-NEW.zip`
   - ❌ `eio-extension-FINAL.zip`
   - ❌ `eio-extension.zip` (sem versão)
   - ✅ `eio.system-v4.4.5.zip`

4. **Locais de armazenamento:**
   - `frontend/downloads/eio.system-vX.X.X.zip`
   - `public/eio.system-v4.4.5.zip`

5. **Antes de qualquer commit:**
   - Verificar se o ZIP está atualizado
   - Verificar se a versão do manifest.json corresponde

---

## 🔄 Fluxo de Deploy

### Checklist Pré-Deploy

- [ ] Código testado localmente
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] ZIP da extensão atualizado com nova versão
- [ ] Commit message descritivo
- [ ] Push para branch main

### Comandos de Deploy

```bash
# Atualizar ZIP da extensão
Compress-Archive -Path "extension\*" -DestinationPath "frontend\downloads\eio.system-v{VERSION}.zip" -Force

# Commit e Push
git add -A
git commit -m "feat: descrição da alteração"
git push origin main
```

---

## 📁 Estrutura de Arquivos

```
eio-sistema-completo/
├── src/services/supabase.js    # Cliente Supabase centralizado
├── api/                        # Funções serverless (Vercel)
├── backend/                    # Rotas e serviços
├── extension/                  # Código fonte da extensão
├── frontend/                   # Dashboard e assets
│   └── downloads/              # ZIP para download
├── public/                     # Assets públicos
├── docs/                       # Documentação
├── .env                        # Variáveis de ambiente (não commitar!)
└── .env.example                # Template de variáveis
```

---

## 📝 Convenções de Código

### Imports

```javascript
// ✅ Correto
const { supabase } = require('../../../src/services/supabase');

// ❌ Incorreto
const supabase = require('../config/supabase');
```

### Versionamento

- Seguir Semantic Versioning (SemVer)
- Major.Minor.Patch (ex: 4.4.5)
- Atualizar `manifest.json`, `package.json` e `frontend/config.js` simultaneamente

---

## 📞 Contatos

- **Suporte WhatsApp:** 5521975312662
- **Repositório:** GitHub (privado)
- **Deploy:** Vercel

---

*Documento mantido por Antigravity AI Assistant*
