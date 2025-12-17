# Script para desplegar índices de Firestore (PowerShell)
# Requiere: firebase-tools instalado globalmente
# Uso: .\scripts\deploy-indexes.ps1

Write-Host "🚀 Desplegando índices de Firestore..." -ForegroundColor Cyan
Write-Host ""

# Verificar que firebase-tools esté instalado
try {
    $null = Get-Command firebase -ErrorAction Stop
} catch {
    Write-Host "❌ Error: firebase-tools no está instalado." -ForegroundColor Red
    Write-Host "   Instala con: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Verificar que el archivo de índices existe
if (-not (Test-Path "firestore.indexes.json")) {
    Write-Host "❌ Error: firestore.indexes.json no existe en la raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Desplegar índices
Write-Host "📦 Desplegando índices desde firestore.indexes.json..." -ForegroundColor Cyan
firebase deploy --only firestore:indexes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Índices desplegados correctamente!" -ForegroundColor Green
    Write-Host "   Los índices pueden tardar varios minutos en construirse." -ForegroundColor Yellow
    Write-Host "   Revisa el estado en: https://console.firebase.google.com/" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Error al desplegar índices." -ForegroundColor Red
    exit 1
}

