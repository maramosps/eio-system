# Script para empacotar a extensão E.I.O para distribuição
# MS Assessoria Digital - msasdigital@gmail.com

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  E.I.O System - Empacotamento" -ForegroundColor Cyan
Write-Host "  MS Assessoria Digital" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Definir caminhos
$extensionPath = "extension"
$outputPath = "dist"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "EIO_Extension_$timestamp.zip"

# Criar pasta de saída se não existir
if (!(Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath | Out-Null
    Write-Host "✓ Pasta de saída criada: $outputPath" -ForegroundColor Green
}

# Arquivos e pastas a incluir
$filesToInclude = @(
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "background.js",
    "content.js",
    "content.css",
    "license-manager.js",
    "flow-management.js",
    "flow-builder-integration.js",
    "settings-handler.js",
    "flow-builder-styles.css"
)

$foldersToInclude = @(
    "icons",
    "public"
)

Write-Host "📦 Preparando arquivos para empacotamento..." -ForegroundColor Yellow
Write-Host ""

# Verificar se todos os arquivos existem
$allFilesExist = $true
foreach ($file in $filesToInclude) {
    $fullPath = Join-Path $extensionPath $file
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (NÃO ENCONTRADO)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

# Verificar pastas
foreach ($folder in $foldersToInclude) {
    $fullPath = Join-Path $extensionPath $folder
    if (Test-Path $fullPath) {
        $fileCount = (Get-ChildItem -Path $fullPath -Recurse -File).Count
        Write-Host "  ✓ $folder/ ($fileCount arquivos)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $folder/ (NÃO ENCONTRADO)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

if (!$allFilesExist) {
    Write-Host "❌ Alguns arquivos estão faltando. Verifique a estrutura da extensão." -ForegroundColor Red
    exit 1
}

# Criar arquivo ZIP
Write-Host "🗜️  Criando arquivo ZIP..." -ForegroundColor Yellow

try {
    # Criar pasta temporária
    $tempPath = Join-Path $env:TEMP "eio_extension_temp"
    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempPath | Out-Null

    # Copiar arquivos
    foreach ($file in $filesToInclude) {
        $source = Join-Path $extensionPath $file
        $dest = Join-Path $tempPath $file
        Copy-Item -Path $source -Destination $dest
    }

    # Copiar pastas
    foreach ($folder in $foldersToInclude) {
        $source = Join-Path $extensionPath $folder
        $dest = Join-Path $tempPath $folder
        Copy-Item -Path $source -Destination $dest -Recurse
    }

    # Criar ZIP
    $zipPath = Join-Path $outputPath $zipName
    Compress-Archive -Path "$tempPath\*" -DestinationPath $zipPath -Force

    # Limpar pasta temporária
    Remove-Item -Path $tempPath -Recurse -Force

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ EMPACOTAMENTO CONCLUÍDO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Arquivo criado:" -ForegroundColor Cyan
    Write-Host "   $zipPath" -ForegroundColor White
    Write-Host ""
    
    $fileSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "📊 Tamanho: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "   1. Fazer upload para Google Drive (msasdigital@gmail.com)" -ForegroundColor White
    Write-Host "   2. Obter link compartilhável" -ForegroundColor White
    Write-Host "   3. Enviar email ao cliente com o link" -ForegroundColor White
    Write-Host ""
    Write-Host "📧 Email de suporte: msasdigital@gmail.com" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Erro ao criar arquivo ZIP:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
