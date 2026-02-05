# 🐛 Known Issues - E.I.O System

**Última Atualização:** 2026-02-05

---

## 🔴 Em Aberto

_Nenhum issue crítico em aberto no momento._

---

## ✅ Resolvidos

### BUG: Loop de Login / Inicialização Duplicada do Supabase

**ID:** C-03 + C-01  
**Data de Resolução:** 2026-02-05  
**Severidade Original:** CRÍTICA (Blocker)

**Problema:**
O sistema possuía 3 inicializações separadas do cliente Supabase em diferentes partes do código:

- `api/index.js`
- `api/engine/config/supabase.js`
- `backend/src/config/supabase.js`

Cada uma com configurações diferentes e chaves hardcoded, causando:

- Loop de redirecionamento no login
- Estados de autenticação conflitantes
- Memory leaks com múltiplas conexões WebSocket
- Segurança comprometida com chaves expostas

**Solução Implementada:**

1. Criado arquivo centralizado `src/services/supabase.js` como único ponto de inicialização
2. Atualizados todos os imports para usar o arquivo centralizado
3. Removidos arquivos duplicados (`api/engine/config/supabase.js`, `backend/src/config/supabase.js`)
4. Removidas chaves hardcoded da extensão (`background.js`)
5. Criado template `.env.example` e configurado `.env` de produção
6. Instalada dependência `dotenv` para carregamento das variáveis de ambiente

**Arquivos Modificados:**

- `src/services/supabase.js` (CRIADO)
- `api/index.js`
- `api/engine/index.js`
- `api/engine/tasks.js`
- `api/engine/ack.js`
- `api/engine/services/logs.js`
- `api/engine/services/scheduler.js`
- `api/engine/strategies/flow.js`
- `api/engine/core/ack.js`
- `backend/src/routes/auth.routes.js`
- `backend/src/routes/license.routes.js`
- `backend/src/routes/extension.routes.js`
- `backend/src/services/chat.service.js`
- `extension/background.js`
- `frontend/config.js`
- `frontend/login.html`
- `.env.example` (CRIADO)
- `.env` (CRIADO)

**Arquivos Deletados:**

- `api/engine/config/supabase.js`
- `backend/src/config/supabase.js`

**Validação:**

- ✅ Smoke test passou: Supabase inicializa corretamente com variáveis de ambiente
- ⏳ Aguardando validação visual na extensão

---

## 📋 Histórico

| Data | Issue | Status |
|------|-------|--------|
| 2026-02-05 | C-03 + C-01: Loop de Login / Supabase Duplicado | ✅ Resolvido |
