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
npm ci

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting application..."
npm start
