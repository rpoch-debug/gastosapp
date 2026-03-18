#!/bin/bash
set -e

echo "================================"
echo "  App de Gastos — Setup"
echo "================================"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
  echo "❌ Error: debes correr este script desde la carpeta gastosapp"
  echo "   cd gastosapp && bash setup.sh"
  exit 1
fi

# Verificar Node.js
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Error: necesitas Node.js 20 o superior"
  echo "   Instala con: brew install node"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# Instalar dependencias
echo ""
echo "→ Instalando dependencias..."
npm install --ignore-scripts --silent

# Compilar better-sqlite3
echo "→ Compilando better-sqlite3..."
npm rebuild better-sqlite3 --silent

# Compilar open-banking-chile
echo "→ Compilando open-banking-chile..."
TSC="./node_modules/.bin/tsc"
if [ ! -f "$TSC" ]; then
  echo "❌ Error: no se encontró tsc en node_modules"
  exit 1
fi
node "$TSC" \
  --project node_modules/open-banking-chile/tsconfig.json \
  --noEmitOnError false 2>/dev/null || true

echo ""
echo "================================"
echo "  ✅ Setup completado"
echo "================================"
echo ""
echo "Para correr la app:"
echo "  npm run dev"
echo ""
echo "Luego abre: http://localhost:3000"
echo "y haz click en 🏦 para configurar tu banco."
echo ""
