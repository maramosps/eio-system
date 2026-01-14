# ═══════════════════════════════════════════════════════════
# E.I.O SYSTEM - SCRIPT DE VERIFICAÇÃO E DEPLOY
# ═══════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 E.I.O SYSTEM - DEPLOY AUTOMATIZADO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════
# FASE 1: VERIFICAÇÃO DO AMBIENTE
# ═══════════════════════════════════════════════════════════

Write-Host "📋 FASE 1: Verificação do Ambiente" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Verificar Node.js
Write-Host "Verificando Node.js..." -NoNewline
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ $nodeVersion" -ForegroundColor Green
}
else {
    Write-Host " ❌ Node.js não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar NPM
Write-Host "Verificando NPM..." -NoNewline
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ v$npmVersion" -ForegroundColor Green
}
else {
    Write-Host " ❌ NPM não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar Vercel CLI
Write-Host "Verificando Vercel CLI..." -NoNewline
$vercelVersion = vercel --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ $vercelVersion" -ForegroundColor Green
}
else {
    Write-Host " ⚠️  Não instalado. Instalando..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# FASE 2: VERIFICAÇÃO DO PROJETO
# ═══════════════════════════════════════════════════════════

Write-Host "📋 FASE 2: Verificação do Projeto" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Verificar estrutura de arquivos
$arquivosCriticos = @(
    "api\index.js",
    "frontend\index.html",
    "frontend\login.html",
    "frontend\dashboard.html",
    "extension\manifest.json",
    "vercel.json"
)

$todosArquivosOk = $true
foreach ($arquivo in $arquivosCriticos) {
    Write-Host "Verificando $arquivo..." -NoNewline
    if (Test-Path $arquivo) {
        Write-Host " ✅" -ForegroundColor Green
    }
    else {
        Write-Host " ❌ Não encontrado!" -ForegroundColor Red
        $todosArquivosOk = $false
    }
}

if (-not $todosArquivosOk) {
    Write-Host ""
    Write-Host "❌ Alguns arquivos críticos estão faltando!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# FASE 3: VERIFICAÇÃO DO DEPLOY ATUAL
# ═══════════════════════════════════════════════════════════

Write-Host "📋 FASE 3: Verificação do Deploy Atual" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "Obtendo informações do projeto no Vercel..." -ForegroundColor Cyan
vercel ls --limit 1

Write-Host ""

# ═══════════════════════════════════════════════════════════
# FASE 4: TESTE DA API ATUAL
# ═══════════════════════════════════════════════════════════

Write-Host "📋 FASE 4: Teste da API Atual" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "Testando endpoint de saúde..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://eio-system.vercel.app/api/health" -Method Get -ErrorAction Stop
    Write-Host "✅ API está respondendo!" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "Supabase Configurado: $($response.supabaseConfigured)" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  API não está respondendo ou retornou erro" -ForegroundColor Yellow
    Write-Host "Erro: $_" -ForegroundColor Red
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# FASE 5: OPÇÕES DE DEPLOY
# ═══════════════════════════════════════════════════════════

Write-Host "📋 FASE 5: Opções de Deploy" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

Write-Host "Escolha uma opção:" -ForegroundColor Cyan
Write-Host "1. 🚀 Deploy em PRODUÇÃO (--prod)" -ForegroundColor Green
Write-Host "2. 🧪 Deploy em PREVIEW (staging)" -ForegroundColor Yellow
Write-Host "3. 📊 Apenas verificar status" -ForegroundColor Blue
Write-Host "4. ⚙️  Configurar variáveis de ambiente" -ForegroundColor Magenta
Write-Host "5. ❌ Cancelar" -ForegroundColor Red
Write-Host ""

$opcao = Read-Host "Digite o número da opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "🚀 INICIANDO DEPLOY EM PRODUÇÃO" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  ATENÇÃO: Isso irá atualizar o site em produção!" -ForegroundColor Yellow
        Write-Host ""
        $confirmacao = Read-Host "Tem certeza? (S/N)"
        
        if ($confirmacao -eq "S" -or $confirmacao -eq "s") {
            Write-Host ""
            Write-Host "Executando deploy..." -ForegroundColor Cyan
            vercel --prod
            
            Write-Host ""
            Write-Host "✅ Deploy concluído!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 Acesse: https://eio-system.vercel.app" -ForegroundColor Cyan
        }
        else {
            Write-Host "Deploy cancelado." -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "🧪 INICIANDO DEPLOY EM PREVIEW" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Executando deploy..." -ForegroundColor Cyan
        vercel
        
        Write-Host ""
        Write-Host "✅ Deploy de preview concluído!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "📊 STATUS DO PROJETO" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Últimos deploys:" -ForegroundColor Cyan
        vercel ls --limit 5
        
        Write-Host ""
        Write-Host "Variáveis de ambiente:" -ForegroundColor Cyan
        vercel env ls
    }
    
    "4" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "⚙️  CONFIGURAR VARIÁVEIS DE AMBIENTE" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Variáveis atuais:" -ForegroundColor Cyan
        vercel env ls
        
        Write-Host ""
        Write-Host "Para adicionar uma variável, use:" -ForegroundColor Yellow
        Write-Host "vercel env add NOME_DA_VARIAVEL" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Exemplo:" -ForegroundColor Yellow
        Write-Host "vercel env add SUPABASE_URL" -ForegroundColor Gray
    }
    
    "5" {
        Write-Host ""
        Write-Host "Operação cancelada." -ForegroundColor Yellow
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Script finalizado!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
