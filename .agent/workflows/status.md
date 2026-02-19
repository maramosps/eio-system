---
description: Display agent and project status. Progress tracking and status board.
---

# /status - Show Status

$ARGUMENTS

---

## Task

Show current project and agent status.

### 🛡️ Status de Segurança
- [x] **Dependências:** `dotenv` v16.4.5 (Corrigido)
- [x] **Auth:** Bypass de emergência removido (Seguro)
- [x] **Supabase:** Client unificado em `services/supabase.js`
- [!] **Chaves:** Necessitam atualização na Vercel

### 🌐 Status do Frontend
- [x] **Conexão:** Centralizada em `global-connection.js`
- [x] **Dashboard:** Código limpo e otimizado (v4.6.6)
- [x] **UI:** Estilos V16 aplicados (Anti-quebra)

3. **File Statistics**
   - Files created count
   - Files modified count

4. **Preview Status**
   - Is server running
   - URL
   - Health check

---

## Example Output

```
=== Project Status ===

📁 Project: my-ecommerce
📂 Path: C:/projects/my-ecommerce
🏷️ Type: nextjs-ecommerce
📊 Status: active

🔧 Tech Stack:
   Framework: next.js
   Database: postgresql
   Auth: clerk
   Payment: stripe

✅ Features (5):
   • product-listing
   • cart
   • checkout
   • user-auth
   • order-history

⏳ Pending (2):
   • admin-panel
   • email-notifications

📄 Files: 73 created, 12 modified

=== Agent Status ===

✅ database-architect → Completed
✅ backend-specialist → Completed
🔄 frontend-specialist → Dashboard components (60%)
⏳ test-engineer → Waiting

=== Preview ===

🌐 URL: http://localhost:3000
💚 Health: OK
```

---

## Technical

Status uses these scripts:
- `python .agent/scripts/session_manager.py status`
- `python .agent/scripts/auto_preview.py status`
