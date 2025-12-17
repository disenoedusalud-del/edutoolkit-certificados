#!/bin/bash

# Script para desplegar índices de Firestore
# Requiere: firebase-tools instalado globalmente
# Uso: ./scripts/deploy-indexes.sh

echo "🚀 Desplegando índices de Firestore..."
echo ""

# Verificar que firebase-tools esté instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: firebase-tools no está instalado."
    echo "   Instala con: npm install -g firebase-tools"
    exit 1
fi

# Verificar que el archivo de índices existe
if [ ! -f "firestore.indexes.json" ]; then
    echo "❌ Error: firestore.indexes.json no existe en la raíz del proyecto."
    exit 1
fi

# Desplegar índices
echo "📦 Desplegando índices desde firestore.indexes.json..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Índices desplegados correctamente!"
    echo "   Los índices pueden tardar varios minutos en construirse."
    echo "   Revisa el estado en: https://console.firebase.google.com/"
else
    echo ""
    echo "❌ Error al desplegar índices."
    exit 1
fi

