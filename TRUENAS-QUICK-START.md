# TrueNAS SCALE Custom App - Quick Start Guide

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- [ ] TrueNAS SCALE 22.12+ running
- [ ] Git repository with this code (GitHub/GitLab)
- [ ] 2GB+ RAM available
- [ ] Apps feature enabled in TrueNAS

### 2. Push Code to Repository
```bash
# If not already done
git init
git add .
git commit -m "Initial PrahEstate Service"
git remote add origin https://github.com/yourusername/prahestate-service.git
git push -u origin main
```

### 3. Deploy Database (First)
**TrueNAS Web UI → Apps → Custom App**

**App Name:** `prahestate-db`
- **Image:** `postgres:15-alpine`
- **Container Port:** `5432` → **Node Port:** `30432`
- **Environment Variables:**
  ```
  POSTGRES_DB=prahestate
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=YourSecurePassword123!
  ```
- **Storage:** `/mnt/your-pool/apps/prahestate/postgres-data` → `/var/lib/postgresql/data`

### 4. Deploy Main App
**TrueNAS Web UI → Apps → Custom App**

**App Name:** `prahestate-service`
- **Image:** `node:18-alpine`
- **Command:** `/bin/sh`
- **Arguments:**
  ```
  -c
  ```
  ```
  apk add --no-cache git && 
  git clone https://github.com/yourusername/prahestate-service.git /app && 
  cd /app && 
  npm install && 
  npm run build && 
  npm start
  ```
- **Container Port:** `3000` → **Node Port:** `30000`
- **Environment Variables:**
  ```
  NODE_ENV=production
  DATABASE_URL=postgresql://postgres:YourSecurePassword123!@your-truenas-ip:30432/prahestate
  PORT=3000
  SYNC_ENABLED=true
  SYNC_SCHEDULE=0 */6 * * *
  ```

### 5. Initialize Database
```bash
# SSH to TrueNAS
ssh admin@your-truenas-ip

# Find the app pod
k3s kubectl get pods -A | grep prahestate

# Initialize database
k3s kubectl exec -it prahestate-service-xxxxx-xxxxx -- npm run db:push
```

### 6. Test Access
- **API:** `http://your-truenas-ip:30000/health`
- **Estates:** `http://your-truenas-ip:30000/api/estates`

## 🔄 Update Workflow

### When you make code changes:
1. **Push to repository:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

2. **Restart app in TrueNAS:**
   ```bash
   k3s kubectl delete pod prahestate-service-xxxxx-xxxxx
   ```
   *App will auto-restart and pull latest code*

## 📋 Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Runtime environment |
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@IP:30432/prahestate` | Database connection |
| `PORT` | `3000` | Application port |
| `SYNC_ENABLED` | `true` | Enable scheduled sync |
| `SYNC_SCHEDULE` | `0 */6 * * *` | Sync every 6 hours |
| `API_REQUEST_DELAY_MS` | `2000` | Delay between API calls |
| `SYNC_BATCH_SIZE` | `50` | Estates per batch |

## 🛠️ Troubleshooting

### App won't start:
```bash
# Check logs
k3s kubectl logs prahestate-service-xxxxx-xxxxx

# Check if database is accessible
k3s kubectl exec -it prahestate-service-xxxxx-xxxxx -- ping your-truenas-ip
```

### Database connection issues:
- Verify database app is running
- Check DATABASE_URL format
- Ensure passwords match
- Confirm ports are correct

### Git clone issues:
- Verify repository URL is correct and accessible
- For private repos, consider using SSH keys or access tokens
- Check if repository is public

## 🔗 Useful Commands

```bash
# View all pods
k3s kubectl get pods -A

# View app logs
k3s kubectl logs -f prahestate-service-xxxxx-xxxxx

# Execute commands in app
k3s kubectl exec -it prahestate-service-xxxxx-xxxxx -- /bin/sh

# View services
k3s kubectl get services -A

# Restart app (delete pod, it will recreate)
k3s kubectl delete pod prahestate-service-xxxxx-xxxxx
```

## 📚 Next Steps

1. **Set up monitoring** (optional)
2. **Configure backup schedule** for database
3. **Set up domain name** and reverse proxy (optional)
4. **Add CI/CD pipeline** for automated deployments (optional)

For detailed documentation, see `TRUENAS-APPS-DEPLOYMENT.md`.
