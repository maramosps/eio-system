# ===========================================================
# E.I.O SYSTEM - EMPACOTADOR DE EXTENSAO (PowerShell)
# Cria arquivo .zip da extensao para download
# ===========================================================

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  EMPACOTANDO EXTENSAO E.I.O" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

$extensionDir = Join-Path $PSScriptRoot "extension"
$outputDir = Join-Path $PSScriptRoot "frontend\downloads"
$outputFile = Join-Path $outputDir "eio-extension.zip"

# Criar diretorio de saida se nao existir
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "Diretorio criado: $outputDir" -ForegroundColor Green
}

# Remover arquivo antigo se existir
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
    Write-Host "Arquivo antigo removido" -ForegroundColor Yellow
}

Write-Host "Compactando extensao..." -ForegroundColor Cyan

try {
    # Usar Compress-Archive do PowerShell
    Compress-Archive -Path "$extensionDir\*" -DestinationPath $outputFile -CompressionLevel Optimal -Force
    
    # Obter informacoes do arquivo
    $fileInfo = Get-Item $outputFile
    $sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host "  EXTENSAO EMPACOTADA COM SUCESSO!" -ForegroundColor Green
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Arquivo: $outputFile" -ForegroundColor White
    Write-Host "  Tamanho: $sizeInMB MB" -ForegroundColor White
    Write-Host "  Total de bytes: $($fileInfo.Length)" -ForegroundColor White
    Write-Host ""
    Write-Host "  URL de download: /downloads/eio-extension.zip" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host ""
    
}
catch {
    Write-Host ""
    Write-Host "ERRO ao criar arquivo ZIP:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
