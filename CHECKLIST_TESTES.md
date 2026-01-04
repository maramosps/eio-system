/*
═══════════════════════════════════════════════════════════
  E.I.O - CHECKLIST DE TESTES PRÉ-PRODUÇÃO
  Verificação completa antes do lançamento
═══════════════════════════════════════════════════════════
*/

# CHECKLIST DE TESTES - E.I.O SYSTEM

## ✅ TESTES DA EXTENSÃO

### 1. Instalação

- [ ] Extensão carrega sem erros no Chrome
- [ ] Ícone aparece na barra de ferramentas
- [ ] Popup abre ao clicar no ícone
- [ ] Logo do foguete aparece corretamente
- [ ] Todas as abas estão visíveis

### 2. Sistema de Licenciamento

- [ ] Modal de login aparece na primeira vez
- [ ] Login com credenciais válidas funciona
- [ ] Período de teste é calculado corretamente
- [ ] Aviso de dias restantes aparece
- [ ] Bloqueio após 5 dias funciona
- [ ] Modal de expiração aparece corretamente
- [ ] Botão "Ativar Licença" redireciona para dashboard

### 3. Navegação (Abas)

- [ ] Aba "Dashboard" abre e exibe stats
- [ ] Aba "Fluxos" abre e exibe criador
- [ ] Aba "Assistente" abre e exibe extração
- [ ] Aba "Console" abre e exibe logs
- [ ] Transição entre abas é suave
- [ ] Indicador de aba ativa funciona

### 4. Dashboard (Aba 1)

- [ ] Contadores de stats aparecem (Seguidores, Curtidas, Comentários)
- [ ] Botão "Iniciar" está funcional
- [ ] Botão "Pausar" fica habilitado após iniciar
- [ ] Status "Conectado ao Instagram" aparece

### 5. Flow Builder (Aba 2)

- [ ] Input "Nome do Fluxo" aceita texto
- [ ] Blocos de Extração são clicáveis:
  - [ ] 🔍 Hashtag
  - [ ] 👥 Seguidores
  - [ ] ❤️ Curtidas
- [ ] Blocos de Ação são clicáveis:
  - [ ] ➕ Seguir
  - [ ] 💙 Curtir
  - [ ] 💬 Comentar
  - [ ] ✉️ Enviar DM
- [ ] Blocos aparecem no canvas ao clicar
- [ ] Botão "×" remove blocos do canvas
- [ ] Botão "Limpar" limpa todo o fluxo
- [ ] Botão "Salvar e Ativar Fluxo" funciona
- [ ] Toast de confirmação aparece
- [ ] Fluxo aparece na lista "Meus Fluxos Ativos"

### 6. Gerenciamento de Fluxos

- [ ] Lista de fluxos ativos carrega
- [ ] Botão "Pausar" (laranja) funciona
- [ ] Botão "Retomar" (verde) funciona
- [ ] Botão "Parar" (vermelho) funciona
- [ ] Confirmação ao parar fluxo aparece
- [ ] Fluxo é removido da lista ao parar
- [ ] Botão "Atualizar" recarrega lista

### 7. Assistente - Extração (Aba 3)

- [ ] Dropdown "Fonte de Leads" funciona
- [ ] Opções disponíveis:
  - [ ] Seguidores de (@perfil)
  - [ ] Curtidas em (Post URL)
  - [ ] Hashtag (#tag)
  - [ ] Deixar de Seguir (Não me seguem)
- [ ] Input "Alvo / Referência" aceita texto
- [ ] Checkboxes de filtros funcionam:
  - [ ] Brasileiros
  - [ ] Com Foto
  - [ ] Com Posts
  - [ ] Contas Públicas
- [ ] Botão "Iniciar Varredura" funciona
- [ ] Barra de progresso aparece
- [ ] Lista de leads encontrados aparece
- [ ] Botão "Automatizar Atendimento" funciona
- [ ] Botão "CRM" funciona

### 8. Console (Aba 4)

- [ ] Logs aparecem em tempo real
- [ ] Cores diferentes por tipo (info, success, warning, error)
- [ ] Botão "Limpar" limpa o console
- [ ] Scroll automático para última mensagem

### 9. Configurações

- [ ] Botão de engrenagem abre modal
- [ ] Dropdown "Velocidade de Ação" funciona
- [ ] Checkbox "Iniciar automação ao abrir" funciona
- [ ] Checkbox "Notificações de ações" funciona
- [ ] Botão "Cancelar" fecha modal
- [ ] Botão "Salvar" salva configurações
- [ ] Toast de confirmação aparece

### 10. Footer

- [ ] Link "Dashboard Web" abre dashboard
- [ ] Link "Suporte Premium" abre WhatsApp

### 11. Toasts (Notificações)

- [ ] Toast aparece no canto inferior direito
- [ ] Cores corretas por tipo (success=verde, error=vermelho, etc)
- [ ] Toast desaparece após 3 segundos
- [ ] Múltiplos toasts não se sobrepõem

## ✅ TESTES DE INTEGRAÇÃO COM INSTAGRAM

### 12. Content Script

- [ ] Script injeta corretamente no Instagram
- [ ] Detecta perfil atual automaticamente
- [ ] Detecta post atual automaticamente
- [ ] Preenche campo "Alvo" automaticamente

### 13. Automações no Instagram

- [ ] Seguir perfil funciona
- [ ] Deixar de seguir funciona
- [ ] Curtir post funciona
- [ ] Comentar funciona
- [ ] Enviar DM funciona
- [ ] Delays entre ações são respeitados
- [ ] Não ultrapassa limites do Instagram

## ✅ TESTES DE BACKEND

### 14. API - Autenticação

- [ ] POST /api/v1/auth/extension-login retorna token
- [ ] Token JWT é válido
- [ ] Dados de trial são retornados
- [ ] Erro 401 para credenciais inválidas

### 15. API - Licenciamento

- [ ] POST /api/v1/license/validate verifica licença
- [ ] Retorna dias restantes corretamente
- [ ] Retorna status de pagamento
- [ ] Bloqueia após trial expirado

### 16. API - Ativação (Admin)

- [ ] POST /api/v1/license/activate ativa licença
- [ ] Define duração corretamente
- [ ] Atualiza status no banco

## ✅ TESTES DE SEGURANÇA

### 17. Proteções

- [ ] Senhas são criptografadas (bcrypt)
- [ ] Token expira após 30 dias
- [ ] Validação server-side funciona
- [ ] Impossível burlar período de teste
- [ ] Dados sensíveis não aparecem no console

## ✅ TESTES DE PERFORMANCE

### 18. Desempenho

- [ ] Popup abre em menos de 1 segundo
- [ ] Navegação entre abas é instantânea
- [ ] Blocos são adicionados sem lag
- [ ] Lista de fluxos carrega rapidamente
- [ ] Não trava o Instagram

## ✅ TESTES DE COMPATIBILIDADE

### 19. Navegadores

- [ ] Google Chrome (versão mais recente)
- [ ] Microsoft Edge (Chromium)
- [ ] Brave Browser

### 20. Sistemas Operacionais

- [ ] Windows 10/11
- [ ] macOS
- [ ] Linux

## 🐛 ERROS CONHECIDOS E CORREÇÕES

### Problemas Encontrados

1. [ ] Logo não aparece → CORRIGIDO (fallback adicionado)
2. [ ] Botão configurações não funciona → CORRIGIDO (modal implementado)
3. [ ] Blocos não clicáveis → CORRIGIDO (eventos adicionados)
4. [ ] Botões Pausar/Parar sem estilo → CORRIGIDO (gradientes adicionados)

## 📝 NOTAS IMPORTANTES

### Antes do Teste Real

1. Criar conta de teste no Instagram
2. Configurar variáveis de ambiente no backend
3. Iniciar servidor backend localmente
4. Carregar extensão no Chrome em modo desenvolvedor

### Durante o Teste

1. Abrir Console do Chrome (F12)
2. Verificar erros no console
3. Testar cada funcionalidade individualmente
4. Anotar qualquer comportamento inesperado

### Após o Teste

1. Corrigir bugs encontrados
2. Otimizar performance se necessário
3. Atualizar documentação
4. Preparar para deploy

## 🚀 APROVAÇÃO FINAL

- [ ] Todos os testes passaram
- [ ] Nenhum erro no console
- [ ] Performance aceitável
- [ ] Pronto para produção

---

**Data do Teste**: _________________
**Testado por**: _________________
**Resultado**: ⭕ APROVADO / ❌ REPROVADO
**Observações**: _________________

---

**MS Assessoria Digital**
**E.I.O System - Decole seu Instagram**
**Email**: <msasdigital@gmail.com>
