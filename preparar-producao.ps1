# ═══════════════════════════════════════════════════════════
# E.I.O SYSTEM - SCRIPT DE PREPARAÇÃO PARA PRODUÇÃO
# MS Assessoria Digital
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 E.I.O SYSTEM - PREPARAÇÃO PARA PRODUÇÃO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path ".\backend\server.js")) {
    Write-Host "❌ ERRO: Execute este script na pasta raiz do projeto!" -ForegroundColor Red
    Write-Host "   Pasta atual: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# ═══════════════════════════════════════════════════════════
# PASSO 1: COLETAR INFORMAÇÕES
# ═══════════════════════════════════════════════════════════

Write-Host "📋 PASSO 1: Informações de Produção" -ForegroundColor Yellow
Write-Host ""

# URL da API
$apiUrl = Read-Host "Digite a URL da API de produção (ex: https://api.eio.decolaseuinsta.com)"
if ([string]::IsNullOrWhiteSpace($apiUrl)) {
    Write-Host "❌ URL da API é obrigatória!" -ForegroundColor Red
    exit 1
}

# URL do Frontend
$frontendUrl = Read-Host "Digite a URL do frontend (ex: https://www.eio.decolaseuinsta.com)"
if ([string]::IsNullOrWhiteSpace($frontendUrl)) {
    Write-Host "❌ URL do frontend é obrigatória!" -ForegroundColor Red
    exit 1
}

# Gerar JWT Secret forte
Write-Host ""
Write-Host "🔐 Gerando JWT Secret forte..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
Write-Host "✅ JWT Secret gerado: $($jwtSecret.Substring(0, 20))..." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# PASSO 2: BACKUP DOS ARQUIVOS ORIGINAIS
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "💾 PASSO 2: Criando backup dos arquivos originais..." -ForegroundColor Yellow

$backupDir = ".\backup-pre-producao-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Copy-Item ".\backend\.env" "$backupDir\.env.backup" -Force
Copy-Item ".\extension\license-manager.js" "$backupDir\license-manager.js.backup" -Force
Copy-Item ".\extension\manifest.json" "$backupDir\manifest.json.backup" -Force

Write-Host "✅ Backup criado em: $backupDir" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# PASSO 3: ATUALIZAR BACKEND .ENV
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "⚙️ PASSO 3: Atualizando backend/.env para produção..." -ForegroundColor Yellow

$envContent = Get-Content ".\backend\.env" -Raw

# Substituir NODE_ENV
$envContent = $envContent -replace 'NODE_ENV=development', 'NODE_ENV=production'

# Substituir JWT_SECRET
$envContent = $envContent -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret"

# Substituir FRONTEND_URL
$envContent = $envContent -replace 'FRONTEND_URL=.*', "FRONTEND_URL=$frontendUrl"

# Atualizar CORS_ORIGIN
$corsOrigin = "$frontendUrl,chrome-extension://*"
$envContent = $envContent -replace 'CORS_ORIGIN=.*', "CORS_ORIGIN=$corsOrigin"

# Salvar
Set-Content ".\backend\.env" -Value $envContent -NoNewline

Write-Host "✅ Backend .env atualizado" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# PASSO 4: ATUALIZAR LICENSE-MANAGER.JS
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "⚙️ PASSO 4: Atualizando extension/license-manager.js..." -ForegroundColor Yellow

$licenseContent = Get-Content ".\extension\license-manager.js" -Raw

# Substituir API_URL
$licenseContent = $licenseContent -replace "API_URL: 'http://localhost:3000'", "API_URL: '$apiUrl'"

# Desativar DEV_MODE
$licenseContent = $licenseContent -replace 'DEV_MODE: true', 'DEV_MODE: false'

# Salvar
Set-Content ".\extension\license-manager.js" -Value $licenseContent -NoNewline

Write-Host "✅ License Manager atualizado" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# PASSO 5: ATUALIZAR MANIFEST.JSON
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "⚙️ PASSO 5: Atualizando extension/manifest.json..." -ForegroundColor Yellow

$manifestContent = Get-Content ".\extension\manifest.json" -Raw

# Extrair domínio da API URL
$apiDomain = $apiUrl -replace 'https?://', '' -replace '/$', ''

# Substituir host_permissions
$manifestContent = $manifestContent -replace '"https://api\.eio-system\.com/\*"', "`"https://$apiDomain/*`""

# Salvar
Set-Content ".\extension\manifest.json" -Value $manifestContent -NoNewline

Write-Host "✅ Manifest.json atualizado" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# PASSO 6: VERIFICAR ARQUIVOS
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "🔍 PASSO 6: Verificando alterações..." -ForegroundColor Yellow
Write-Host ""

# Verificar .env
$envCheck = Get-Content ".\backend\.env" -Raw
if ($envCheck -match 'NODE_ENV=production') {
    Write-Host "  ✅ NODE_ENV=production" -ForegroundColor Green
}
else {
    Write-Host "  ❌ NODE_ENV não está em production" -ForegroundColor Red
}

if ($envCheck -match "JWT_SECRET=$jwtSecret") {
    Write-Host "  ✅ JWT_SECRET atualizado" -ForegroundColor Green
}
else {
    Write-Host "  ❌ JWT_SECRET não foi atualizado" -ForegroundColor Red
}

# Verificar license-manager.js
$licenseCheck = Get-Content ".\extension\license-manager.js" -Raw
if ($licenseCheck -match "API_URL: '$apiUrl'") {
    Write-Host "  ✅ API_URL atualizado para $apiUrl" -ForegroundColor Green
}
else {
    Write-Host "  ❌ API_URL não foi atualizado" -ForegroundColor Red
}

if ($licenseCheck -match 'DEV_MODE: false') {
    Write-Host "  ✅ DEV_MODE desativado" -ForegroundColor Green
}
else {
    Write-Host "  ❌ DEV_MODE ainda está ativo" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════
# PASSO 7: CRIAR ARQUIVO DE PRODUÇÃO
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "📄 PASSO 7: Criando arquivo de configuração de produção..." -ForegroundColor Yellow

$prodConfig = @"
# ═══════════════════════════════════════════════════════════
# E.I.O SYSTEM - CONFIGURAÇÃO DE PRODUÇÃO
# Gerado em: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
# ═══════════════════════════════════════════════════════════

## URLs
- API: $apiUrl
- Frontend: $frontendUrl

## Segurança
- JWT Secret: $($jwtSecret.Substring(0, 20))... (64 caracteres)
- NODE_ENV: production
- DEV_MODE: false

## Backup
- Backup dos arquivos originais: $backupDir

## Próximos Passos

### 1. Deploy do Backend
``````bash
# No servidor de produção
cd backend
npm install --production
pm2 start server.js --name eio-backend
pm2 save
``````

### 2. Configurar Nginx
``````nginx
server {
    listen 80;
    server_name $($apiDomain);
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
``````

### 3. Configurar SSL
``````bash
sudo certbot --nginx -d $apiDomain
``````

### 4. Empacotar Extensão
``````powershell
.\package-extension.ps1
``````

### 5. Testar
- Acessar: $apiUrl/api/health
- Registrar usuário de teste
- Instalar extensão
- Fazer login na extensão

## Avisos Importantes

⚠️ **NUNCA COMMITAR O ARQUIVO .env NO GIT**
⚠️ **GUARDAR O JWT_SECRET EM LOCAL SEGURO**
⚠️ **APÓS PUBLICAR EXTENSÃO, ATUALIZAR CORS COM ID REAL**

## Suporte
Email: msasdigital@gmail.com
"@

Set-Content ".\CONFIGURACAO_PRODUCAO.md" -Value $prodConfig

Write-Host "✅ Arquivo criado: CONFIGURACAO_PRODUCAO.md" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# RESUMO FINAL
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ PREPARAÇÃO PARA PRODUÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Arquivos Atualizados:" -ForegroundColor Yellow
Write-Host "  • backend\.env" -ForegroundColor White
Write-Host "  • extension\license-manager.js" -ForegroundColor White
Write-Host "  • extension\manifest.json" -ForegroundColor White
Write-Host ""
Write-Host "💾 Backup criado em:" -ForegroundColor Yellow
Write-Host "  $backupDir" -ForegroundColor White
Write-Host ""
Write-Host "📄 Próximos passos em:" -ForegroundColor Yellow
Write-Host "  CONFIGURACAO_PRODUCAO.md" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "  1. Configurar servidor de produção" -ForegroundColor White
Write-Host "  2. Configurar SSL/HTTPS" -ForegroundColor White
Write-Host "  3. Fazer deploy do backend" -ForegroundColor White
Write-Host "  4. Empacotar e distribuir extensão" -ForegroundColor White
Write-Host "  5. Testar tudo em produção" -ForegroundColor White
Write-Host ""
Write-Host "🔐 JWT Secret (GUARDAR EM LOCAL SEGURO):" -ForegroundColor Yellow
Write-Host "  $jwtSecret" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
