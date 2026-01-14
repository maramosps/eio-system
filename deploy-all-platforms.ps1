# 🚀 DEPLOY AUTOMÁTICO - Todas as Plataformas
# Este script faz deploy do E.I.O em Vercel, Firebase, Cloudflare e Supabase

Write-Host "🚀 Iniciando deploy em todas as plataformas..." -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
$projectRoot = "C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo"
if (-not (Test-Path $projectRoot)) {
    Write-Host "❌ Diretório do projeto não encontrado!" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

# ============================================
# 1. VERCEL DEPLOY
# ============================================
Write-Host "📦 [1/4] Fazendo deploy no Vercel..." -ForegroundColor Yellow
try {
    # Verificar se Vercel CLI está instalado
    $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
    if (-not $vercelInstalled) {
        Write-Host "   Instalando Vercel CLI..." -ForegroundColor Gray
        npm install -g vercel
    }
    
    # Deploy no Vercel
    Set-Location frontend
    Write-Host "   Executando: vercel --prod --yes" -ForegroundColor Gray
    vercel --prod --yes
    Set-Location ..
    
    Write-Host "   ✅ Deploy no Vercel concluído!" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Erro no deploy do Vercel: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================
# 2. FIREBASE DEPLOY
# ============================================
Write-Host "🔥 [2/4] Fazendo deploy no Firebase..." -ForegroundColor Yellow
try {
    # Verificar se Firebase CLI está instalado
    $firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue
    if (-not $firebaseInstalled) {
        Write-Host "   Instalando Firebase CLI..." -ForegroundColor Gray
        npm install -g firebase-tools
    }
    
    # Login no Firebase (se necessário)
    Write-Host "   Verificando autenticação..." -ForegroundColor Gray
    firebase login --no-localhost
    
    # Deploy no Firebase
    Write-Host "   Executando: firebase deploy --only hosting" -ForegroundColor Gray
    firebase deploy --only hosting
    
    Write-Host "   ✅ Deploy no Firebase concluído!" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Erro no deploy do Firebase: $_" -ForegroundColor Red
    Write-Host "   💡 Execute manualmente: firebase login && firebase deploy" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 3. CLOUDFLARE PAGES DEPLOY
# ============================================
Write-Host "☁️  [3/4] Fazendo deploy no Cloudflare Pages..." -ForegroundColor Yellow
try {
    # Verificar se Wrangler está instalado
    $wranglerInstalled = Get-Command wrangler -ErrorAction SilentlyContinue
    if (-not $wranglerInstalled) {
        Write-Host "   Instalando Wrangler CLI..." -ForegroundColor Gray
        npm install -g wrangler
    }
    
    # Deploy no Cloudflare Pages
    Write-Host "   Executando: wrangler pages deploy frontend" -ForegroundColor Gray
    wrangler pages deploy frontend --project-name=eio-system
    
    Write-Host "   ✅ Deploy no Cloudflare concluído!" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Erro no deploy do Cloudflare: $_" -ForegroundColor Red
    Write-Host "   💡 Execute manualmente: wrangler login && wrangler pages deploy frontend" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 4. SUPABASE STORAGE UPLOAD
# ============================================
Write-Host "🗄️  [4/4] Fazendo upload no Supabase Storage..." -ForegroundColor Yellow
try {
    # Verificar se Supabase CLI está instalado
    $supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
    if (-not $supabaseInstalled) {
        Write-Host "   Instalando Supabase CLI..." -ForegroundColor Gray
        npm install -g supabase
    }
    
    Write-Host "   ⚠️  Supabase Storage requer configuração manual" -ForegroundColor Yellow
    Write-Host "   💡 Acesse: https://supabase.com/dashboard" -ForegroundColor Cyan
    Write-Host "   💡 Vá em Storage > Buckets > Upload Files" -ForegroundColor Cyan
    Write-Host "   💡 Faça upload da pasta 'frontend'" -ForegroundColor Cyan
    
}
catch {
    Write-Host "   ⚠️  Erro no Supabase: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================
# RESUMO FINAL
# ============================================
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 URLs de Acesso:" -ForegroundColor Yellow
Write-Host "   🔹 Vercel:      https://eio-system.vercel.app" -ForegroundColor White
Write-Host "   🔹 Firebase:    https://eio-system.web.app" -ForegroundColor White
Write-Host "   🔹 Cloudflare:  https://eio-system.pages.dev" -ForegroundColor White
Write-Host "   🔹 Supabase:    (Configure manualmente)" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Próximos Passos:" -ForegroundColor Yellow
Write-Host "   1. Aguarde 2-3 minutos para propagação" -ForegroundColor Gray
Write-Host "   2. Limpe cache do navegador (Ctrl + Shift + Delete)" -ForegroundColor Gray
Write-Host "   3. Acesse as URLs com ?v=2 no final" -ForegroundColor Gray
Write-Host "   4. Teste todas as funcionalidades" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

# Abrir URLs no navegador
Write-Host ""
$openBrowser = Read-Host "Deseja abrir as URLs no navegador? (S/N)"
if ($openBrowser -eq "S" -or $openBrowser -eq "s") {
    Start-Process "https://eio-system.vercel.app?v=2"
    Start-Sleep -Seconds 2
    Start-Process "https://eio-system.web.app?v=2"
    Start-Sleep -Seconds 2
    Start-Process "https://eio-system.pages.dev?v=2"
}

Write-Host ""
Write-Host "🎉 Deploy finalizado! Bons testes!" -ForegroundColor Green
