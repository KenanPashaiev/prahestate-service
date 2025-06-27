#!/bin/sh
set -e

echo "🔧 Installing git..."
apk add --no-cache git

echo "📥 Cloning repository..."
git clone https://github.com/KenanPashaiev/prahestate-service.git /app

echo "📁 Changing to app directory..."
cd /app

echo "📦 Installing dependencies..."
npm ci

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting application..."
npm start
