# TrueNAS SCALE Custom App Deployment Checklist

## ✅ Pre-Deployment Checklist

### Code Repository
- [ ] Code is pushed to a Git repository (GitHub, GitLab, etc.)
- [ ] Repository is public OR you have access credentials configured
- [ ] All required files are present:
  - [ ] `Dockerfile`
  - [ ] `package.json` with all dependencies
  - [ ] `src/` directory with application code
  - [ ] `prisma/schema.prisma`
  - [ ] `tsconfig.json`

### TrueNAS SCALE Preparation
- [ ] TrueNAS SCALE 22.12+ is running
- [ ] Apps feature is enabled (**Apps → Settings**)
- [ ] Sufficient resources available:
  - [ ] At least 2GB RAM
  - [ ] 10GB+ storage space
- [ ] Network ports are available:
  - [ ] Port 30000 for the application
  - [ ] Port 30432 for PostgreSQL
  - [ ] Port 30080 for Adminer (optional)

## 🗄️ Database Deployment

### Step 1: Deploy PostgreSQL (Using Official App)
1. **Navigate to:** TrueNAS Web UI → **Apps** → **Discover Apps**
2. **Search for:** `PostgreSQL`
3. **Click:** Install on the official PostgreSQL app
4. **Fill in configuration:**
   ```
   Application Name: postgresql (or prahestate-postgres)
   Postgres Database: prahestate
   Postgres User: postgres
   Postgres Password: YourSecurePassword123!
   Postgres Host Auth Method: scram-sha-256
   ```
5. **Storage Configuration:**
   ```
   Data Storage Type: ixVolume (recommended)
   Size: 20Gi or more
   OR
   Host Path: /mnt/[your-pool]/apps/prahestate/postgres-data
   ```
6. **Network Configuration:**
   ```
   Host Network: Disabled
   Service Type: NodePort (optional, for external access)
   Node Port: 30432 (optional)
   ```
7. **Click:** Install
8. **Wait for:** Status = Running

## 🚀 Application Deployment

### Step 2: Deploy PrahEstate Service
1. **Navigate to:** TrueNAS Web UI → **Apps** → **Custom App**
2. **Fill in configuration:**
   ```
   Application Name: prahestate-service
   Image Repository: node
   Image Tag: 18-alpine
   Restart Policy: unless-stopped
   ```
3. **Container Configuration:**
   ```
   Command: /bin/sh
   Arguments: 
   -c
   ```
   ```
   apk add --no-cache git && 
   git clone https://github.com/[USERNAME]/prahestate-service.git /app && 
   cd /app && 
   npm install && 
   npm run build && 
   npm start
   ```
4. **Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:YourSecurePassword123!@postgresql-postgresql:5432/prahestate
   PORT=3000
   SYNC_ENABLED=true
   SYNC_SCHEDULE=0 */6 * * *
   API_REQUEST_DELAY_MS=2000
   SYNC_BATCH_SIZE=50
   ```
   **Note:** The database host `postgresql-postgresql` is the default service name. You can verify this in TrueNAS → Apps → Installed Apps → PostgreSQL → View Details.
5. **Networking:**
   ```
   Container Port: 3000
   Node Port: 30000
   Protocol: TCP
   ```
6. **Storage (Optional):**
   ```
   Host Path: /mnt/[your-pool]/apps/prahestate/logs
   Mount Path: /app/logs
   ```
7. **Click:** Deploy
8. **Wait for:** Status = Running

## 🔧 Database Initialization

### Step 3: Initialize Database Schema
1. **SSH to TrueNAS:**
   ```bash
   ssh admin@[TRUENAS-IP]
   ```
2. **Find the app pod:**
   ```bash
   k3s kubectl get pods -A | grep prahestate
   ```
3. **Initialize database:**
   ```bash
   k3s kubectl exec -it prahestate-service-[POD-ID] -- npm run db:push
   ```

## 🧪 Testing & Verification

### Step 4: Verify Deployment
- [ ] **Health Check:** Visit `http://[TRUENAS-IP]:30000/health`
  - Expected: `{"status":"ok","timestamp":"..."}`
- [ ] **API Test:** Visit `http://[TRUENAS-IP]:30000/api/estates`
  - Expected: JSON response with estates data
- [ ] **Database Connection:** Check logs for successful database connection
  ```bash
  k3s kubectl logs prahestate-service-[POD-ID]
  ```

## 🎯 Optional Components

### Step 5: Deploy Adminer (Database Admin)
1. **Navigate to:** TrueNAS Web UI → **Apps** → **Custom App**
2. **Configuration:**
   ```
   Application Name: prahestate-adminer
   Image Repository: adminer
   Image Tag: latest
   Container Port: 8080
   Node Port: 30080
   ```
3. **Test:** Visit `http://[TRUENAS-IP]:30080`

## 🔄 Update Process

### How to Update Your Application
1. **Push changes to your Git repository:**
   ```bash
   git add .
   git commit -m "Update description"
   git push
   ```
2. **Restart the app container in TrueNAS:**
   ```bash
   k3s kubectl delete pod prahestate-service-[POD-ID]
   ```
   *The pod will automatically restart and pull the latest code*

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### App Won't Start
- [ ] **Check logs:** `k3s kubectl logs prahestate-service-[POD-ID]`
- [ ] **Verify Git repository** is accessible
- [ ] **Check environment variables** are set correctly
- [ ] **Ensure database** is running and accessible

#### Database Connection Failed
- [ ] **Verify DATABASE_URL** format and credentials
- [ ] **Check if PostgreSQL pod** is running
- [ ] **Test network connectivity** between containers
- [ ] **Verify port 30432** is accessible

#### Sync Not Working
- [ ] **Check SYNC_ENABLED** is set to `true`
- [ ] **Verify SYNC_SCHEDULE** format (cron expression)
- [ ] **Check logs** for sync-related errors
- [ ] **Test manual sync** via API: `POST /api/sync`

### Useful Commands
```bash
# View all apps
k3s kubectl get pods -A

# View app logs
k3s kubectl logs -f prahestate-service-[POD-ID]

# Execute shell in app
k3s kubectl exec -it prahestate-service-[POD-ID] -- /bin/sh

# Restart app
k3s kubectl delete pod prahestate-service-[POD-ID]

# View services and ports
k3s kubectl get services -A
```

## 📋 Post-Deployment

### Recommended Next Steps
- [ ] **Set up regular database backups**
- [ ] **Monitor application logs** for errors
- [ ] **Configure firewall rules** if needed
- [ ] **Set up domain name** and SSL (optional)
- [ ] **Create monitoring alerts** (optional)

### Security Recommendations
- [ ] **Change default passwords** regularly
- [ ] **Limit network access** to required ports only
- [ ] **Keep TrueNAS SCALE** updated
- [ ] **Monitor container logs** for security issues

## 📞 Support

If you encounter issues:
1. **Check this checklist** for missed steps
2. **Review logs** for error messages
3. **Consult TrueNAS documentation** for platform-specific issues
4. **Check project README** for application-specific troubleshooting

---

**Your deployment URLs:**
- **API Service:** `http://[TRUENAS-IP]:30000`
- **Health Check:** `http://[TRUENAS-IP]:30000/health`
- **Database Admin:** `http://[TRUENAS-IP]:30080` (if deployed)
- **API Documentation:** `http://[TRUENAS-IP]:30000/api/estates`
