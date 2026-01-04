# ═══════════════════════════════════════════════════════════
# E.I.O SYSTEM - DEPLOY RÁPIDO MANUAL
# Execute estes comandos um por um
# ═══════════════════════════════════════════════════════════

# 1. CONFIGURAR GIT (primeira vez)
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# 2. INSTALAR GITHUB CLI
winget install --id GitHub.cli
# FECHAR E REABRIR O TERMINAL AQUI

# 3. LOGIN NO GITHUB
gh auth login
# Seguir instruções no browser

# 4. INICIALIZAR GIT
git init
git add .
git commit -m "🚀 Initial commit - E.I.O System"

# 5. CRIAR REPOSITÓRIO NO GITHUB (escolha um)
gh repo create eio-system --private --source=. --remote=origin --push
# OU
gh repo create eio-system --public --source=. --remote=origin --push

# 6. INSTALAR VERCEL CLI
npm install -g vercel

# 7. LOGIN NA VERCEL
vercel login
# Seguir instruções no browser

# 8. DEPLOY INICIAL
vercel
# Responder as perguntas:
# - Set up and deploy? Yes
# - Which scope? [Sua conta]
# - Link to existing project? No
# - Project name? eio-system
# - Directory? ./
# - Override settings? No

# 9. CONFIGURAR VARIÁVEIS DE AMBIENTE
vercel env add SUPABASE_URL production
# Colar: https://zupnyvnrmwoyqajecxmm.supabase.co

vercel env add SUPABASE_ANON_KEY production
# Colar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc0MTUsImV4cCI6MjA4MjQzMzQxNX0.j_kNf6oUjY65DXIdIVtDKOHlkktlZvzqHuo_SlEzUvY

vercel env add SUPABASE_SERVICE_KEY production
# Colar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1NzQxNSwiZXhwIjoyMDgyNDMzNDE1fQ.IfnFeaJgOGVQrV0NXZaahztmfTnBB8A-F2skQILeRUY

vercel env add JWT_SECRET production
# Colar: eio_super_secret_jwt_key_2024_production

vercel env add NODE_ENV production
# Digitar: production

vercel env add TRIAL_DAYS production
# Digitar: 5

vercel env add SUPPORT_EMAIL production
# Digitar: msasdigital@gmail.com

# 10. DEPLOY DE PRODUÇÃO
vercel --prod

# 11. VER URL DO DEPLOY
vercel ls

# 12. TESTAR API
# Substitua [URL] pela URL que apareceu no passo anterior
curl https://eio-system-xxx.vercel.app/api/health

# ═══════════════════════════════════════════════════════════
# PRONTO! SEU SISTEMA ESTÁ ONLINE! 🚀
# ═══════════════════════════════════════════════════════════
