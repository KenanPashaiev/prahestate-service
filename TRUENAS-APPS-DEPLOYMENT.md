# TrueNAS SCALE Custom App Deployment Guide

## Overview
Deploy PrahEstate Service using TrueNAS SCALE's Custom App functionality with Git-based deployment.

## Prerequisites
- TrueNAS SCALE 22.12 or newer
- Git repository with your code (GitHub, GitLab, etc.)
- At least 2GB RAM available
- 10GB+ storage for database

## Method 1: Custom App via TrueNAS Web Interface (Recommended)

### Step 1: Push Code to Repository
1. **Initialize git repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/prahestate-service.git
   git push -u origin main
   ```

2. **Ensure your repository includes:**
   - `Dockerfile`
   - `docker-compose.truenas.yml`
   - `.env.production` (template)
   - All source code

### Step 2: Deploy Custom App in TrueNAS

#### A. Access TrueNAS Apps
1. Open TrueNAS SCALE web interface
2. Navigate to **Apps**
3. Click **Discover Apps**
4. Click **Custom App**

#### B. Configure Application Settings

**Application Name:** `prahestate-service`

**Image and Policies:**
- **Image repository:** `node`
- **Image tag:** `18-alpine`
- **Pull Policy:** `Always`
- **Restart Policy:** `unless-stopped`

**Container Configuration:**
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

#### C. Configure Networking
- **Host Network:** `Disabled`
- **Container Port:** `3000`
- **Node Port:** `30000` (or any available port)
- **Protocol:** `TCP`

#### D. Configure Storage
**Host Path Volumes:**
1. **App Data Volume:**
   - **Host Path:** `/mnt/your-pool/apps/prahestate/data`
   - **Mount Path:** `/app/data`
   - **Read Only:** `No`

2. **Logs Volume:**
   - **Host Path:** `/mnt/your-pool/apps/prahestate/logs`
   - **Mount Path:** `/app/logs`
   - **Read Only:** `No`

#### E. Configure Environment Variables
Add these environment variables:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:your_password@postgresql-postgresql:5432/prahestate
PORT=3000
SYNC_ENABLED=true
SYNC_SCHEDULE=0 */6 * * *
API_REQUEST_DELAY_MS=2000
SYNC_BATCH_SIZE=50
SREALITY_API_URL=https://www.sreality.cz/api/en/v2/estates
API_PER_PAGE=20
API_MAX_PAGES=100
```

**Note:** The database host `postgresql-postgresql` is the default service name for the official PostgreSQL app. You can verify the exact service name in TrueNAS → Apps → Installed Apps → PostgreSQL → View Details.

#### F. Resource Limits (Optional)
- **CPU Limit:** `1000m` (1 CPU core)
- **Memory Limit:** `2Gi`
- **CPU Request:** `250m`
- **Memory Request:** `512Mi`

### Step 3: Deploy PostgreSQL Database (Using Official App)

#### A. Install PostgreSQL from App Catalog
1. **Apps → Discover Apps**
2. **Search for:** `PostgreSQL`
3. **Click:** Install on the official PostgreSQL app

#### B. PostgreSQL Configuration
**Application Name:** `postgresql` (or `prahestate-postgres`)

**PostgreSQL Configuration:**
- **Postgres Database:** `prahestate`
- **Postgres User:** `postgres`
- **Postgres Password:** `your_secure_password_here`
- **Postgres Host Auth Method:** `scram-sha-256`

**Storage Configuration:**
- **Data Storage:** 
  - **Type:** ixVolume (recommended) or Host Path
  - **Size:** 20Gi or more
  - **Host Path (if using):** `/mnt/your-pool/apps/prahestate/postgres-data`

**Network Configuration:**
- **Host Network:** Disabled
- **Service Type:** NodePort
- **Node Port:** `30432` (or leave default for random port)

**Resource Limits:**
- **CPU Limit:** 1000m (1 CPU core)
- **Memory Limit:** 2Gi
- **Storage:** 20Gi+

### Step 4: Deploy Database Admin (Optional)

#### A. Create Adminer Custom App
1. **Apps → Custom App**
2. **Application Name:** `prahestate-adminer`

#### B. Adminer Configuration
**Image and Policies:**
- **Image repository:** `adminer`
- **Image tag:** `latest`

**Environment Variables:**
```
ADMINER_DEFAULT_SERVER=your-truenas-ip:30432
```

**Networking:**
- **Container Port:** `8080`
- **Node Port:** `30080`

### Step 5: Initialize Database

1. **Find the PostgreSQL service name:**
   - **TrueNAS UI → Apps → Installed Apps**
   - **Click on PostgreSQL app → View Details**
   - **Note the service name** (usually `postgresql-postgresql` or similar)

2. **Update DATABASE_URL if needed:**
   - If service name is different, update your environment variables
   - Format: `postgresql://postgres:password@SERVICE-NAME:5432/prahestate`

3. **SSH into TrueNAS:**
   ```bash
   ssh admin@your-truenas-ip
   ```

4. **Find the app container:**
   ```bash
   k3s kubectl get pods -A | grep prahestate
   ```

5. **Initialize database schema:**
   ```bash
   k3s kubectl exec -it prahestate-service-xxxxx-xxxxx -- npm run db:push
   ```

## Accessing Your Application

After deployment, your services will be available at:
- **API Service:** `http://your-truenas-ip:30000`
- **Database Admin:** `http://your-truenas-ip:30080`
- **Health Check:** `http://your-truenas-ip:30000/health`

## Updating Your Application

### For Git-based Deployment:
1. **Push changes to your repository**
2. **Restart the app container:**
   ```bash
   k3s kubectl delete pod prahestate-service-xxxxx-xxxxx
   ```
3. **The app will automatically pull latest code on restart**

### TrueNAS Configuration
1. **Enable Docker** in TrueNAS SCALE:
   - **Apps → Settings → Docker** → Enable
   
2. **Create dataset** (optional but recommended):
   - **Storage → Pools → Add Dataset**
   - Name: `apps/prahestate`

### Deployment Commands

#### Full Deployment
```bash
# Deploy everything from scratch
./truenas-deploy.sh deploy
```

#### Update Application
```bash
# Pull latest changes and restart
./truenas-deploy.sh update
```

#### Management Commands
```bash
# Show service status
./truenas-deploy.sh status

# View live logs
./truenas-deploy.sh logs

# Create database backup
./truenas-deploy.sh backup

# Restart services
./truenas-deploy.sh restart

# Stop services
./truenas-deploy.sh stop

# Show service URLs
./truenas-deploy.sh info
```

## Alternative: Manual Git Deployment

### Step 1: Clone Repository
```bash
# On TrueNAS SCALE
cd /mnt/your-pool/apps
git clone https://github.com/your-username/prahestate-service.git prahestate
cd prahestate
```

### Step 2: Configure Environment
```bash
# Copy and edit environment file
cp .env.production .env
nano .env

# Set secure database password
POSTGRES_PASSWORD=your_secure_password_here
```

### Step 3: Deploy with Docker Compose
```bash
# Deploy services
docker-compose -f docker-compose.truenas.yml up -d

# Initialize database
docker-compose -f docker-compose.truenas.yml exec app npm run db:push
```

## Using TrueNAS Apps Interface with Git

### Option 1: Custom App with Git Clone
1. **Apps → Available Applications → Launch Docker Image**
2. **Configure Git-enabled container:**
   - **Image:** `node:18-alpine`
   - **Command:** `sh`
   - **Args:** `-c "apk add git && git clone https://github.com/your-username/prahestate-service.git /app && cd /app && npm install && npm run build && npm start"`
   - **Working Dir:** `/app`
   - **Ports:** `3000:3000`

### Option 2: Init Container Pattern
1. **Create init container** that clones repo
2. **Share volume** with main application container
3. **Main container** runs the application

## Continuous Deployment

### Webhook Setup (Advanced)
1. **Create webhook endpoint** in your app
2. **Configure repository webhooks** to trigger updates
3. **Automatic deployment** on git push

### Scheduled Updates
```bash
# Add to TrueNAS cron
# System → Advanced → Cron Jobs
# Command: /mnt/your-pool/apps/truenas-deploy.sh update
# Schedule: Daily at 3 AM
0 3 * * * /mnt/your-pool/apps/truenas-deploy.sh update
```

## Benefits of Git-Based Deployment

### ✅ **Advantages:**
- **Version control** - Track all changes
- **Easy updates** - Single command to update
- **Rollback capability** - Revert to previous versions
- **Collaboration** - Multiple developers can contribute
- **Backup** - Code is stored remotely
- **CI/CD ready** - Can integrate with automated testing

### 🔧 **Update Workflow:**
1. **Develop locally** on Windows
2. **Push changes** to repository
3. **Run update command** on TrueNAS:
   ```bash
   ./truenas-deploy.sh update
   ```

### 🔄 **Maintenance:**
```bash
# Regular maintenance commands
./truenas-deploy.sh backup    # Weekly database backups
./truenas-deploy.sh update    # Update when needed
./truenas-deploy.sh status    # Check health
```

## Troubleshooting

### Common Issues
1. **Git not found:** Script will install git automatically
2. **Permission denied:** Ensure script is executable (`chmod +x`)
3. **Repository access:** Use HTTPS URLs for public repos
4. **Port conflicts:** Check if ports 3000/8080 are available

### Debug Commands
```bash
# Check logs
./truenas-deploy.sh logs

# Check service status
./truenas-deploy.sh status

# Manual container inspection
cd /mnt/your-pool/apps/prahestate
docker-compose -f docker-compose.truenas.yml ps
docker-compose -f docker-compose.truenas.yml logs app
```

## Finding PostgreSQL Service Information

### Method 1: TrueNAS Web Interface
1. **Apps → Installed Apps**
2. **Click on PostgreSQL app**
3. **View Details** tab shows:
   - Service names
   - Internal ports
   - External access details

### Method 2: Command Line
```bash
# SSH to TrueNAS
ssh admin@your-truenas-ip

# List all services
k3s kubectl get services -A | grep postgres

# Get service details
k3s kubectl describe service postgresql-postgresql -n ix-postgresql

# Test connectivity from your app
k3s kubectl exec -it prahestate-service-xxxxx-xxxxx -- ping postgresql-postgresql
```

### Common Service Names
- **Official PostgreSQL app:** `postgresql-postgresql`
- **Custom app:** `prahestate-db`
- **With custom name:** `[your-app-name]-postgresql`

### Database URL Examples
```bash
# Official PostgreSQL app (default)
DATABASE_URL=postgresql://postgres:password@postgresql-postgresql:5432/prahestate

# Custom PostgreSQL app
DATABASE_URL=postgresql://postgres:password@prahestate-db:5432/prahestate

# External access (if NodePort configured)
DATABASE_URL=postgresql://postgres:password@your-truenas-ip:30432/prahestate
```
