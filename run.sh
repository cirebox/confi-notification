#!/bin/bash

echo "🚀 Iniciando aplicação de notificações..."

# Verificar se Meteor está instalado
if ! command -v meteor &> /dev/null; then
    echo "❌ Meteor não encontrado. Instalando..."
    curl https://install.meteor.com/ | sh
fi

# Instalar dependências
echo "📦 Instalando dependências..."
meteor npm install

# Iniciar aplicação
echo "✅ Iniciando servidor..."
meteor run --settings settings.json
