# ═══════════════════════════════════════════════════════════
# E.I.O SYSTEM - SCRIPT DE DEPLOY AUTOMÁTICO
# GitHub + Vercel + Firebase
# ═══════════════════════════════════════════════════════════

param(
    [switch]$SkipGitHub,
    [switch]$SkipVercel,
    [switch]$SkipFirebase
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 E.I.O SYSTEM - DEPLOY AUTOMÁTICO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path ".\backend\server.js")) {
    Write-Host "❌ ERRO: Execute este script na pasta raiz do projeto!" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════
# PARTE 1: GITHUB
# ═══════════════════════════════════════════════════════════

if (-not $SkipGitHub) {
    Write-Host "📦 PARTE 1: Configurando GitHub..." -ForegroundColor Yellow
    Write-Host ""
    
    # Verificar se Git está instalado
    try {
        $gitVersion = git --version
        Write-Host "✅ Git instalado: $gitVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Git não encontrado! Instale em: https://git-scm.com" -ForegroundColor Red
        exit 1
    }
    
    # Verificar se GitHub CLI está instalado
    try {
        $ghVersion = gh --version
        Write-Host "✅ GitHub CLI instalado" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ GitHub CLI não encontrado. Instalando..." -ForegroundColor Yellow
        Write-Host "   Execute: winget install --id GitHub.cli" -ForegroundColor White
        Write-Host "   Ou baixe de: https://cli.github.com/" -ForegroundColor White
        $install = Read-Host "Deseja tentar instalar agora? (s/n)"
        if ($install -eq 's') {
            winget install --id GitHub.cli
        }
        else {
            Write-Host "⏭️ Pulando configuração do GitHub" -ForegroundColor Yellow
            $SkipGitHub = $true
        }
    }
    
    if (-not $SkipGitHub) {
        # Verificar se já está autenticado
        try {
            gh auth status 2>&1 | Out-Null
            Write-Host "✅ Já autenticado no GitHub" -ForegroundColor Green
        }
        catch {
            Write-Host "🔐 Fazendo login no GitHub..." -ForegroundColor Yellow
            gh auth login
        }
        
        # Inicializar Git se necessário
        if (-not (Test-Path ".\.git")) {
            Write-Host "📝 Inicializando repositório Git..." -ForegroundColor Yellow
            git init
            git add .
            git commit -m "🚀 Initial commit - E.I.O System"
            Write-Host "✅ Repositório Git inicializado" -ForegroundColor Green
        }
        else {
            Write-Host "✅ Repositório Git já existe" -ForegroundColor Green
        }
        
        # Criar repositório no GitHub
        Write-Host ""
        $createRepo = Read-Host "Deseja criar repositório no GitHub? (s/n)"
        if ($createRepo -eq 's') {
            $repoName = Read-Host "Nome do repositório (padrão: eio-system)"
            if ([string]::IsNullOrWhiteSpace($repoName)) {
                $repoName = "eio-system"
            }
            
            $visibility = Read-Host "Repositório público ou privado? (pub/priv)"
            $visFlag = if ($visibility -eq 'pub') { '--public' } else { '--private' }
            
            Write-Host "📤 Criando repositório '$repoName'..." -ForegroundColor Yellow
            gh repo create $repoName $visFlag --source=. --remote=origin --push
            
            Write-Host "✅ Repositório criado e código enviado!" -ForegroundColor Green
            Write-Host "   URL: https://github.com/$(gh api user -q .login)/$repoName" -ForegroundColor Cyan
        }
    }
}

# ═══════════════════════════════════════════════════════════
# PARTE 2: VERCEL
# ═══════════════════════════════════════════════════════════

if (-not $SkipVercel) {
    Write-Host ""
    Write-Host "🌐 PARTE 2: Configurando Vercel..." -ForegroundColor Yellow
    Write-Host ""
    
    # Verificar se Vercel CLI está instalado
    try {
        $vercelVersion = vercel --version
        Write-Host "✅ Vercel CLI instalado: v$vercelVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Vercel CLI não encontrado. Instalando..." -ForegroundColor Yellow
        npm install -g vercel
        Write-Host "✅ Vercel CLI instalado" -ForegroundColor Green
    }
    
    # Login na Vercel
    Write-Host "🔐 Fazendo login na Vercel..." -ForegroundColor Yellow
    Write-Host "   (Uma janela do navegador será aberta)" -ForegroundColor White
    vercel login
    
    # Deploy inicial
    Write-Host ""
    Write-Host "🚀 Realizando deploy inicial..." -ForegroundColor Yellow
    Write-Host "   Responda as perguntas do Vercel:" -ForegroundColor White
    vercel
    
    Write-Host ""
    Write-Host "✅ Deploy inicial concluído!" -ForegroundColor Green
    
    # Configurar variáveis de ambiente
    Write-Host ""
    $configEnv = Read-Host "Deseja configurar variáveis de ambiente agora? (s/n)"
    if ($configEnv -eq 's') {
        Write-Host "📝 Configurando variáveis de ambiente..." -ForegroundColor Yellow
        
        # Ler .env
        if (Test-Path ".\backend\.env") {
            $envContent = Get-Content ".\backend\.env"
            
            Write-Host "   Adicionando variáveis na Vercel..." -ForegroundColor White
            
            # Variáveis críticas
            $criticalVars = @(
                'SUPABASE_URL',
                'SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_KEY',
                'JWT_SECRET',
                'NODE_ENV',
                'TRIAL_DAYS',
                'SUPPORT_EMAIL'
            )
            
            foreach ($var in $criticalVars) {
                $line = $envContent | Where-Object { $_ -match "^$var=" }
                if ($line) {
                    $value = ($line -split '=', 2)[1].Trim()
                    Write-Host "   • $var" -ForegroundColor Cyan
                    echo $value | vercel env add $var production
                }
            }
            
            Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️ Arquivo .env não encontrado em backend/" -ForegroundColor Yellow
        }
    }
    
    # Deploy de produção
    Write-Host ""
    $deployProd = Read-Host "Deseja fazer deploy de produção agora? (s/n)"
    if ($deployProd -eq 's') {
        Write-Host "🚀 Fazendo deploy de produção..." -ForegroundColor Yellow
        vercel --prod
        Write-Host "✅ Deploy de produção concluído!" -ForegroundColor Green
    }
}

# ═══════════════════════════════════════════════════════════
# PARTE 3: FIREBASE
# ═══════════════════════════════════════════════════════════

if (-not $SkipFirebase) {
    Write-Host ""
    Write-Host "🔥 PARTE 3: Configurando Firebase..." -ForegroundColor Yellow
    Write-Host ""
    
    # Instalar Firebase SDK
    Write-Host "📦 Instalando Firebase SDK..." -ForegroundColor Yellow
    cd backend
    npm install firebase firebase-admin
    cd ..
    Write-Host "✅ Firebase SDK instalado" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📋 PRÓXIMOS PASSOS PARA FIREBASE:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Acesse: https://console.firebase.google.com" -ForegroundColor White
    Write-Host "2. Crie um novo projeto chamado 'eio-system'" -ForegroundColor White
    Write-Host "3. Adicione um Web App" -ForegroundColor White
    Write-Host "4. Copie as credenciais" -ForegroundColor White
    Write-Host "5. Edite backend/firebase-config.js com as credenciais" -ForegroundColor White
    Write-Host "6. Edite frontend/firebase-messaging-sw.js com as credenciais" -ForegroundColor White
    Write-Host "7. Adicione as variáveis FIREBASE_* no .env" -ForegroundColor White
    Write-Host ""
    Write-Host "Veja o guia completo em: GUIA_DEPLOY_COMPLETO.md" -ForegroundColor Cyan
}

# ═══════════════════════════════════════════════════════════
# RESUMO FINAL
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipGitHub) {
    Write-Host "✅ GitHub: Repositório criado e código enviado" -ForegroundColor Green
}

if (-not $SkipVercel) {
    Write-Host "✅ Vercel: Deploy realizado" -ForegroundColor Green
    Write-Host "   Acesse: vercel ls para ver a URL" -ForegroundColor White
}

if (-not $SkipFirebase) {
    Write-Host "⚠️ Firebase: SDK instalado (configure manualmente)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📄 Documentação completa: GUIA_DEPLOY_COMPLETO.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 TESTAR APLICAÇÃO:" -ForegroundColor Yellow
Write-Host "   vercel ls                    # Ver URL do deploy" -ForegroundColor White
Write-Host "   curl [URL]/api/health        # Testar API" -ForegroundColor White
Write-Host ""
Write-Host "📊 MONITORAR:" -ForegroundColor Yellow
Write-Host "   vercel logs                  # Ver logs em tempo real" -ForegroundColor White
Write-Host "   vercel inspect [URL]         # Detalhes do deploy" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
