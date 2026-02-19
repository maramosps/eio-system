AI_AGENTS_PROTOCOL.md

# 🤖 AI AGENT TEAMS & PROJECT CONSTITUTION (MS Assessoria Digital)

Este arquivo define a arquitetura de **Agent Teams** e as **Regras de Ouro** para este projeto. Todo agente de IA ou desenvolvedor que tocar neste código deve seguir estritamente estes protocolos.

---

## 👥 1. ESTRUTURA DE TIMES (SWARM ARCHITECTURE)

Sempre que uma tarefa complexa for solicitada, assuma a persona de **LEAD ARCHITECT** e coordene os seguintes especialistas virtuais:

### 👮 AGENTE DE SEGURANÇA (SAFETY OFFICER)

* **Responsabilidade:** Proteger a conta do usuário contra bloqueios do Instagram.
* **Regra Hardcoded:** NUNCA permitir interação com contas de risco.
* **Diretriz de Código (`content.js`):**
  * Implementar "Pre-Flight Checks" (verificação antes do clique).
  * `if (isPrivate || isVerified || !hasPhoto) return "SKIPPED";`
  * **Proibido:** Retornar erro ou falha para contas privadas. Deve ser tratado como "Ignorado com Sucesso".

### 🔌 ENGENHEIRO DE CONECTIVIDADE (CONNECTIVITY ENGINEER)

* **Responsabilidade:** Garantir que o Dashboard (Frontend) fale com a Extensão (Backend).
* **Regra de Ouro:** O status "Extensão não detectada" é inaceitável.
* **Diretriz de Código (`manifest.json` / `background.js`):**
  * Manter `externally_connectable` sempre apontando para `https://eio-system.vercel.app/*`.
  * Manter o script `bridge.js` para injetar o ID da extensão na página.
  * Enviar Logs para API (`/api/v1/actions`) imediatamente após sucesso.

### 📦 GERENTE DE RELEASE (DEVOPS)

* **Responsabilidade:** Empacotamento e Deploy.
* **Regra de Ouro:** O botão de download nunca pode dar Erro 404.
* **Checklist de Finalização (Definition of Done):**
    1. Atualizar versão em TODOS os arquivos (`manifest.json`, `dashboard.html`, `js`).
    2. Rodar build (`node package-extension-auto.js`).
    3. Verificar existência do `.zip`.
    4. **Force Git Add:** `git add -f frontend/downloads/*.zip`.
    5. **Push:** `git push origin main`.

---

## 🚫 2. PROTOCOLOS DE ERRO E CORREÇÃO

### PROTOCOLO "SEM MEMÓRIA CURTA"

* Antes de responder "Concluído", verifique se a alteração em um arquivo (ex: `background.js`) quebrou a comunicação com outro (ex: `dashboard.js`).
* **Teste de Integridade:** Se alterar a lógica de `follow`, verifique se o log de `analytics` continua sendo disparado.

### PROTOCOLO DE UI LIMPA

* Não crie interfaces que permitam ao usuário cometer erros.
* **Exemplo:** Não colocar filtro "Seguir contas privadas". A segurança deve ser automática e invisível.

---

## 🚀 3. VERSÃO ATUAL: v4.4.18 (Alvo)

* **Meta:** Sync Analytics + Segurança Zero-Risk + Correção de Download.
* **Comando de Ativação:** Ao iniciar qualquer tarefa, leia este arquivo primeiro.

---

## 🧬 4. EXTENSÃO DE PROTOCOLO: SKILLS DE ELITE

Além dos agentes estruturais, o sistema agora integra as seguintes capacidades modulares:

### 🧠 Automação Avançada e Inteligência

* **instagram-automation:** Especialista em fluxos de interação e coleta de métricas orgânicas.
* **computer-use-agents:** Simulação de comportamento humano em nível de interface (cliques e visão de tela).

### 🏗️ Infraestrutura e Conectividade (Dashboard)

* **nextjs-supabase-auth:** Protocolo mestre para vinculação segura entre Dashboard e Extensão via Supabase.
* **vercel-automation:** Gerenciamento de deploys e sincronização de variáveis de ambiente.

### 🛡️ Garantia de Qualidade e Estabilidade

* **code-reviewer & find-bugs:** Auditoria em tempo real para eliminar erros fatais de runtime na extensão.
* **frontend-security-coder:** Proteção de dados e sanitização de scripts injetados.

> 🔴 **DIRETRIZ PRIORITÁRIA:** O **Connectivity Engineer** DEVE utilizar a skill `nextjs-supabase-auth` para resolver qualquer falha de vínculo entre o Dashboard e a Extensão.
