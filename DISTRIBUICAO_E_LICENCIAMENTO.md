# E.I.O System - Sistema de Distribuição e Licenciamento

## 📧 Informações de Contato

- **Email Empresa**: <msasdigital@gmail.com>
- **Suporte**: <msasdigital@gmail.com>
- **Empresa**: MS Assessoria Digital

## 🔐 Sistema de Licenciamento

### Período de Teste

- **Duração**: 5 dias corridos
- **Início**: A partir do primeiro cadastro do usuário
- **Funcionalidades**: Acesso completo durante o período de teste

### Após Expiração do Teste

- ❌ **Extensão bloqueada** automaticamente
- 🔒 **Todas as funcionalidades desabilitadas**
- 💳 **Redirecionamento** para página de pagamento no dashboard
- ✅ **Reativação** imediata após confirmação de pagamento

## 📦 Processo de Distribuição

### 1. Preparação do Pacote da Extensão

```bash
# Navegar até a pasta da extensão
cd extension/

# Criar arquivo ZIP para distribuição
# Incluir apenas os arquivos necessários:
- manifest.json
- popup.html
- popup.css
- popup.js
- background.js
- content.js
- content.css
- license-manager.js
- flow-management.js
- flow-builder-integration.js
- settings-handler.js
- flow-builder-styles.css
- icons/ (pasta completa)
- public/ (pasta completa)
```

### 2. Upload para Google Drive

1. **Fazer login** em: <msasdigital@gmail.com>
2. **Criar pasta** no Google Drive: `E.I.O - Extensões Clientes`
3. **Upload** do arquivo ZIP da extensão
4. **Configurar permissões**:
   - Clicar com botão direito no arquivo
   - "Compartilhar" → "Obter link"
   - Configurar: "Qualquer pessoa com o link pode visualizar"
   - Copiar o link

### 3. Envio ao Cliente

**Template de Email:**

```
Assunto: 🚀 Bem-vindo ao E.I.O System - Sua Extensão Está Pronta!

Olá [NOME DO CLIENTE],

Seja bem-vindo ao E.I.O System!

Sua conta foi criada com sucesso e você tem 5 DIAS DE TESTE GRÁTIS para explorar todas as funcionalidades da nossa plataforma de automação para Instagram.

📥 DOWNLOAD DA EXTENSÃO:
[LINK DO GOOGLE DRIVE]

📋 INSTRUÇÕES DE INSTALAÇÃO:

1. Baixe o arquivo ZIP através do link acima
2. Descompacte o arquivo em uma pasta no seu computador
3. Abra o Google Chrome
4. Digite na barra de endereços: chrome://extensions/
5. Ative o "Modo do desenvolvedor" (canto superior direito)
6. Clique em "Carregar sem compactação"
7. Selecione a pasta descompactada
8. Pronto! A extensão E.I.O aparecerá no seu navegador

🔑 SUAS CREDENCIAIS:
Email: [EMAIL DO CLIENTE]
Senha: [SENHA TEMPORÁRIA]

⏰ PERÍODO DE TESTE:
- Início: [DATA DE HOJE]
- Término: [DATA + 5 DIAS]
- Após o período de teste, ative sua licença no dashboard para continuar usando

🌐 ACESSO AO DASHBOARD:
https://dashboard.eio-system.com
(Use as mesmas credenciais da extensão)

📞 SUPORTE:
Dúvidas? Entre em contato: msasdigital@gmail.com

Aproveite seu período de teste!

Atenciosamente,
Equipe MS Assessoria Digital
E.I.O System
```

## 🔧 Configuração do Backend

### Variáveis de Ambiente (.env)

```env
# API Configuration
API_URL=https://api.eio-system.com
FRONTEND_URL=https://dashboard.eio-system.com

# JWT
JWT_SECRET=eio-secret-key-2026-production-change-this

# Database
MONGODB_URI=mongodb://localhost:27017/eio_system

# Email (para envio de links)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=msasdigital@gmail.com
SMTP_PASS=[SENHA DO EMAIL]

# License
TRIAL_DAYS=5
SUPPORT_EMAIL=msasdigital@gmail.com
```

### Rotas de Licenciamento

```javascript
// Já implementadas em: backend/src/routes/license.routes.js

POST /api/v1/auth/extension-login
- Login da extensão
- Retorna token + dados de trial

POST /api/v1/license/validate
- Valida licença ativa
- Verifica período de teste

POST /api/v1/license/activate
- Ativa licença após pagamento (Admin)
```

## 👨‍💼 Dashboard do Administrador

### Funcionalidades Necessárias

1. **Gerenciar Usuários**
   - Listar todos os usuários
   - Ver status de trial (dias restantes)
   - Ver status de pagamento

2. **Ativar Licenças**
   - Após confirmação de pagamento
   - Definir duração (30, 90, 365 dias)
   - Renovação automática

3. **Relatórios**
   - Usuários em trial
   - Usuários pagos
   - Expirados
   - Receita

## 🔄 Fluxo Completo

### Novo Cliente

1. **Cliente se cadastra** no site/dashboard
2. **Sistema cria conta** com trial de 5 dias
3. **Admin envia email** com link do Google Drive
4. **Cliente baixa e instala** a extensão
5. **Cliente faz login** na extensão
6. **Sistema valida** período de teste
7. **Cliente usa** por 5 dias

### Após 5 Dias

**SE NÃO PAGOU:**

- ❌ Extensão bloqueia automaticamente
- 🔒 Modal de "Trial Expirado" aparece
- 💳 Botão redireciona para página de pagamento
- 📧 Email automático lembrando de ativar

**SE PAGOU:**

- ✅ Admin ativa licença no dashboard
- ✅ Extensão continua funcionando
- ✅ Validação diária com servidor
- ✅ Renovação automática (se configurado)

## 🛡️ Segurança

### Proteções Implementadas

1. **Validação Diária**: Extensão verifica licença com servidor a cada uso
2. **Token JWT**: Autenticação segura com expiração
3. **Período de Graça**: 24h offline em caso de problemas de conexão
4. **Bloqueio Automático**: Desabilita toda a UI após expiração
5. **Criptografia**: Senhas com bcrypt, dados sensíveis protegidos

### Prevenção de Fraudes

- ✅ Email único por conta
- ✅ Validação server-side obrigatória
- ✅ Token com expiração
- ✅ Log de acessos
- ✅ Impossível burlar período de teste (validado no servidor)

## 📊 Monitoramento

### Métricas Importantes

- Total de usuários cadastrados
- Usuários em trial ativo
- Taxa de conversão (trial → pago)
- Usuários com licença expirada
- Receita mensal recorrente (MRR)

## 🚀 Deploy

### Checklist Pré-Produção

- [ ] Configurar domínio: api.eio-system.com
- [ ] Configurar domínio: dashboard.eio-system.com
- [ ] SSL/HTTPS em ambos os domínios
- [ ] Configurar banco de dados MongoDB
- [ ] Configurar email SMTP
- [ ] Testar fluxo completo de trial
- [ ] Testar bloqueio após expiração
- [ ] Testar ativação de licença
- [ ] Criar pasta no Google Drive
- [ ] Preparar template de email
- [ ] Documentar processo para equipe

## 📞 Suporte

Para qualquer dúvida sobre o sistema de licenciamento:

- Email: <msasdigital@gmail.com>
- Documentação completa em: /docs

---

**MS Assessoria Digital**  
E.I.O System - Decole seu Instagram  
© 2026
