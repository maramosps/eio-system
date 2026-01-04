# 🧪 GUIA DE INSTALAÇÃO PARA TESTE LOCAL - E.I.O SYSTEM

## 📋 PRÉ-REQUISITOS

- ✅ Google Chrome (versão mais recente)
- ✅ Node.js 16+ instalado
- ✅ MongoDB instalado e rodando
- ✅ Conta no Instagram para testes

## 🚀 PASSO A PASSO - INSTALAÇÃO COMPLETA

### PARTE 1: CONFIGURAR BACKEND

#### 1. Navegar até a pasta do backend

```powershell
cd c:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo\backend
```

#### 2. Instalar dependências

```powershell
npm install
```

#### 3. Criar arquivo .env

```powershell
# Criar arquivo .env na raiz do backend
New-Item -Path ".env" -ItemType File -Force
```

#### 4. Configurar variáveis de ambiente (.env)

```env
# Copiar e colar no arquivo .env:

# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/eio_system

# JWT
JWT_SECRET=eio-secret-key-2026-local-testing

# API
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# License
TRIAL_DAYS=5
SUPPORT_EMAIL=msasdigital@gmail.com

# CORS
CORS_ORIGIN=http://localhost:5173,chrome-extension://*
```

#### 5. Iniciar MongoDB

```powershell
# Em um novo terminal:
mongod
```

#### 6. Iniciar servidor backend

```powershell
# No terminal do backend:
npm run dev
```

✅ **Backend deve estar rodando em**: <http://localhost:3000>

---

### PARTE 2: CONFIGURAR EXTENSÃO

#### 1. Atualizar URL da API na extensão

Abrir arquivo: `extension/license-manager.js`

Linha 10, alterar:

```javascript
// DE:
API_URL: 'https://api.eio-system.com',

// PARA:
API_URL: 'http://localhost:3000',
```

#### 2. Carregar extensão no Chrome

1. Abrir Chrome
2. Digitar na barra de endereços: `chrome://extensions/`
3. Ativar **"Modo do desenvolvedor"** (canto superior direito)
4. Clicar em **"Carregar sem compactação"**
5. Selecionar a pasta: `c:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo\extension`
6. Clicar em **"Selecionar pasta"**

✅ **Extensão deve aparecer na lista** com o nome "E.I.O - Decole seu Instagram"

#### 3. Fixar extensão na barra

1. Clicar no ícone de quebra-cabeça (extensões) na barra do Chrome
2. Encontrar "E.I.O - Decole seu Instagram"
3. Clicar no ícone de alfinete para fixar

---

### PARTE 3: CRIAR USUÁRIO DE TESTE

#### 1. Criar usuário via API (Postman ou curl)

```powershell
# Usando PowerShell:
$body = @{
    name = "Usuário Teste"
    email = "teste@eio.com"
    password = "senha123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**OU** criar manualmente no MongoDB:

```javascript
// No MongoDB Compass ou mongo shell:
use eio_system

db.users.insertOne({
    name: "Usuário Teste",
    email: "teste@eio.com",
    password: "$2a$10$YourHashedPasswordHere", // Use bcrypt
    createdAt: new Date(),
    lastLogin: null
})
```

---

### PARTE 4: TESTAR EXTENSÃO

#### 1. Abrir Instagram

```
https://www.instagram.com
```

#### 2. Fazer login no Instagram

- Use sua conta pessoal de teste

#### 3. Clicar no ícone da extensão E.I.O

- Deve aparecer o popup

#### 4. Fazer login na extensão

- **Email**: <teste@eio.com>
- **Senha**: senha123

#### 5. Verificar período de teste

- Deve mostrar "5 dias de teste"
- Todas as funcionalidades devem estar disponíveis

---

## 🧪 TESTES ESSENCIAIS

### Teste 1: Flow Builder

1. Ir para aba "Fluxos"
2. Clicar em blocos (Hashtag, Seguidores, etc)
3. Ver blocos aparecerem no canvas
4. Clicar em "Salvar e Ativar Fluxo"
5. Verificar toast de confirmação
6. Ver fluxo na lista "Meus Fluxos Ativos"

### Teste 2: Extração de Leads

1. Ir para aba "Assistente"
2. Selecionar "Seguidores de (@perfil)"
3. Digitar um perfil (ex: @instagram)
4. Clicar em "Iniciar Varredura"
5. Verificar se detecta automaticamente

### Teste 3: Configurações

1. Clicar no ícone de engrenagem
2. Alterar configurações
3. Clicar em "Salvar"
4. Verificar toast de confirmação

### Teste 4: Console

1. Ir para aba "Console"
2. Verificar logs em tempo real
3. Clicar em "Limpar"
4. Verificar se console limpa

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### Problema: "Erro ao conectar com servidor"

**Solução**: Verificar se backend está rodando em <http://localhost:3000>

### Problema: "Credenciais inválidas"

**Solução**: Verificar se usuário foi criado no banco de dados

### Problema: "Extensão não carrega"

**Solução**:

1. Verificar erros no console do Chrome (F12)
2. Recarregar extensão em chrome://extensions/

### Problema: "Logo não aparece"

**Solução**: Verificar se pasta `public/assets/` existe com a imagem do foguete

### Problema: "Botões não funcionam"

**Solução**:

1. Abrir console do Chrome (F12)
2. Verificar erros JavaScript
3. Verificar se todos os scripts estão carregados

---

## 📊 MONITORAMENTO DURANTE TESTES

### Console do Chrome (F12)

- Aba "Console": Ver logs e erros
- Aba "Network": Ver requisições à API
- Aba "Application" → "Storage": Ver dados salvos

### Console do Backend

- Ver requisições recebidas
- Ver erros do servidor
- Ver queries do MongoDB

---

## ✅ CHECKLIST PRÉ-TESTE

- [ ] MongoDB rodando
- [ ] Backend rodando (<http://localhost:3000>)
- [ ] Usuário de teste criado
- [ ] Extensão carregada no Chrome
- [ ] Instagram aberto e logado
- [ ] Console do Chrome aberto (F12)

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ TESTE APROVADO SE

1. Extensão carrega sem erros
2. Login funciona
3. Todas as abas abrem
4. Todos os botões são clicáveis
5. Flow Builder funciona
6. Toasts aparecem
7. Configurações salvam
8. Nenhum erro no console

### ❌ TESTE REPROVADO SE

1. Erros no console
2. Botões não respondem
3. API não conecta
4. Funcionalidades quebradas

---

## 📞 SUPORTE

**Email**: <msasdigital@gmail.com>

**Documentação Completa**:

- CHECKLIST_TESTES.md
- DISTRIBUICAO_E_LICENCIAMENTO.md
- README.md

---

**MS Assessoria Digital**
**E.I.O System - Decole seu Instagram**
**Versão**: 1.0.0
**Data**: Janeiro 2026
