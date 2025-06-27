# Git-Based Deployment Guide

## 🚀 Quick Setup for Git-Based Deployment

### Step 1: Prepare Your Repository
1. **Create a new repository** on GitHub/GitLab
2. **From your Windows development machine:**
   ```bash
   cd c:\Users\kenan\source\repos\prahestate-service
   
   # Initialize git if not already done
   git init
   
   # Add all files
   git add .
   
   # Commit
   git commit -m "Initial PrahEstate service setup"
   
   # Add your remote repository
   git remote add origin https://github.com/YOUR-USERNAME/prahestate-service.git
   
   # Push to repository
   git push -u origin main
   ```

### Step 2: Update Deployment Script
**Edit `truenas-deploy.sh` on lines 7-8:**
```bash
GIT_REPO="https://github.com/YOUR-USERNAME/prahestate-service.git"
GIT_BRANCH="main"
```

**Then commit and push the change:**
```bash
git add truenas-deploy.sh
git commit -m "Update repository URL for deployment"
git push
```

### Step 3: Deploy on TrueNAS SCALE
**SSH into your TrueNAS and run:**
```bash
# Download deployment script
curl -sSL https://raw.githubusercontent.com/YOUR-USERNAME/prahestate-service/main/truenas-deploy.sh -o truenas-deploy.sh

# Make executable
chmod +x truenas-deploy.sh

# Edit to set your pool name (if not 'tank')
nano truenas-deploy.sh
# Change line 9: POOL_NAME="your-pool-name"

# Deploy everything
./truenas-deploy.sh deploy
```

## 🔄 Development Workflow

### On Windows (Development):
```bash
# Make changes to your code
# ... edit files ...

# Test locally
npm run dev

# Commit and push changes
git add .
git commit -m "Add new feature"
git push
```

### On TrueNAS (Production):
```bash
# Update to latest version
./truenas-deploy.sh update
```

## 📊 Service Management

### Check Status:
```bash
./truenas-deploy.sh status
```

### View Logs:
```bash
./truenas-deploy.sh logs
```

### Create Backup:
```bash
./truenas-deploy.sh backup
```

### Restart Services:
```bash
./truenas-deploy.sh restart
```

## 🎯 Access Your Service

After deployment, your service will be available at:
- **API:** `http://your-truenas-ip:3000`
- **Database Admin:** `http://your-truenas-ip:8080`
- **Health Check:** `http://your-truenas-ip:3000/health`
- **Estate API:** `http://your-truenas-ip:3000/api/estates`

## 📝 Configuration

### Environment Variables
The deployment script automatically creates a `.env` file with:
- Random secure database password
- Production configuration
- Sync enabled every 6 hours

### Custom Configuration
Edit `.env` on TrueNAS at:
```
/mnt/your-pool/apps/prahestate/.env
```

### Database Access
- **Host:** `your-truenas-ip`
- **Port:** `5432`
- **Database:** `prahestate`
- **Username:** `postgres`
- **Password:** (check `.env` file)

## 🛠️ Troubleshooting

### Common Issues:
1. **Repository URL not updated:** Edit `truenas-deploy.sh` with correct repo
2. **Permission denied:** Run `chmod +x truenas-deploy.sh`
3. **Pool name wrong:** Edit `POOL_NAME` variable in script
4. **Port conflicts:** Check if ports 3000/8080 are available

### Debug Commands:
```bash
# Check docker containers
docker ps

# Check logs
./truenas-deploy.sh logs

# Check git repository
cd /mnt/your-pool/apps/prahestate
git status
git log --oneline -5
```

## 🔐 Security Notes

### Repository Security:
- Use **private repositories** for production
- Never commit `.env` files with real passwords
- Consider using **deploy keys** for private repos

### TrueNAS Security:
- Change default passwords
- Configure firewall rules
- Regular security updates
- Monitor access logs

## 📈 Monitoring

### Health Checks:
```bash
# API health
curl http://your-truenas-ip:3000/health

# Service stats
curl http://your-truenas-ip:3000/api/stats

# Sync status
curl http://your-truenas-ip:3000/api/sync/status
```

### Automated Monitoring:
Set up cron jobs for:
- Regular health checks
- Automatic backups
- Log rotation
- Update notifications

---

**That's it!** You now have a fully automated Git-based deployment system for your TrueNAS SCALE server. 🎉
