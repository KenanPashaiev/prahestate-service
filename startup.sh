#!/bin/sh
set -e

echo "🔧 Installing git..."
apk add --no-cache git

echo "📥 Setting up repository..."
if [ -d "/app/.git" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd /app
    git pull origin main
else
    echo "Cloning repository..."
    rm -rf /app
    git clone https://github.com/KenanPashaiev/prahestate-service.git /app
    cd /app
fi

echo "📦 Installing dependencies..."
npm install --include=dev
echo "📦 Dependencies installed successfully"

echo "🔧 Generating Prisma client..."
npm run db:generate

echo "🗄️ Setting up database schema..."
npx prisma db push --accept-data-loss

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting application..."
npm start
