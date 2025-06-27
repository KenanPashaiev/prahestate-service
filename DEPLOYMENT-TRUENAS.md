# TrueNAS SCALE Deployment Guide

## Prerequisites
- TrueNAS SCALE 22.12 or newer
- Docker and Docker Compose enabled
- At least 2GB RAM available for the application
- 10GB+ storage for database

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### Step 1: Prepare the System
1. **Enable Docker in TrueNAS SCALE:**
   - Go to **Apps** → **Settings** → **Docker**
   - Enable Docker service
   - Set Docker dataset location

2. **Create a dataset for the application:**
   - Go to **Storage** → **Pools**
   - Create new dataset: `apps/prahestate`
   - Set appropriate permissions

#### Step 2: Upload Files
1. **SSH into your TrueNAS:**
   ```bash
   ssh admin@your-truenas-ip
   ```

2. **Navigate to your apps dataset:**
   ```bash
   cd /mnt/your-pool/apps/prahestate
   ```

3. **Upload your project files** (via SCP, SFTP, or git clone):
   ```bash
   # Option 1: Clone from git
   git clone https://github.com/your-username/prahestate-service.git .
   
   # Option 2: Upload files manually via TrueNAS web interface
   # Go to Storage → Browse → Upload files
   ```

#### Step 3: Configure Environment
1. **Copy environment file:**
   ```bash
   cp .env.production .env
   ```

2. **Edit configuration:**
   ```bash
   nano .env
   ```
   
   Set a strong database password:
   ```env
   POSTGRES_PASSWORD=your_very_secure_password_123!
   DATABASE_URL=postgresql://postgres:your_very_secure_password_123!@prahestate-db:5432/prahestate
   ```

#### Step 4: Deploy
1. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Initialize database:**
   ```bash
   # Wait for services to start, then run migrations
   docker-compose -f docker-compose.prod.yml exec prahestate-app npm run db:push
   ```

3. **Check status:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f prahestate-app
   ```

#### Step 5: Verify Deployment
- **API Health:** http://your-truenas-ip:3000/health
- **Database Admin:** http://your-truenas-ip:8080
- **Prometheus Metrics:** http://your-truenas-ip:9090

### Method 2: TrueNAS SCALE Apps (Using TrueCharts)

#### Option A: Custom App
1. **Go to Apps → Available Applications**
2. **Click "Launch Docker Image"**
3. **Configure:**
   - **Image:** `your-registry/prahestate-service:latest`
   - **Container Name:** `prahestate-service`
   - **Restart Policy:** `unless-stopped`

#### Option B: Create Custom Chart
1. **Create Helm chart structure:**
   ```
   prahestate-chart/
   ├── Chart.yaml
   ├── values.yaml
   └── templates/
       ├── deployment.yaml
       ├── service.yaml
       └── configmap.yaml
   ```

2. **Install via TrueNAS Apps interface**

### Method 3: Kubernetes Deployment

#### Step 1: Create Kubernetes Manifests
```bash
# Create namespace
kubectl create namespace prahestate

# Apply manifests
kubectl apply -f k8s/ -n prahestate
```

## Network Configuration

### Port Mapping
- **3000** - Main API service
- **5432** - PostgreSQL database
- **8080** - Adminer (database admin)
- **9090** - Prometheus monitoring

### Firewall Rules
Add firewall rules in TrueNAS to allow access:
1. **System** → **General** → **GUI**
2. Add rules for ports 3000, 8080, 9090

## Storage Configuration

### Recommended Dataset Structure
```
/mnt/your-pool/apps/prahestate/
├── app-data/          # Application files
├── postgres-data/     # Database storage
├── logs/             # Application logs
└── backups/          # Database backups
```

### Volume Mounts
- **Database:** `/mnt/your-pool/apps/prahestate/postgres-data`
- **Logs:** `/mnt/your-pool/apps/prahestate/logs`
- **Backups:** `/mnt/your-pool/apps/prahestate/backups`

## Backup Strategy

### Database Backups
```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/your-pool/apps/prahestate/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec -T prahestate-db pg_dump -U postgres prahestate > "$BACKUP_DIR/prahestate_$DATE.sql"
# Keep only last 30 days
find "$BACKUP_DIR" -name "prahestate_*.sql" -mtime +30 -delete
EOF

chmod +x backup-db.sh
```

### Schedule Backups
```bash
# Add to crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * /mnt/your-pool/apps/prahestate/backup-db.sh
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:3000/health

# Check database
docker-compose -f docker-compose.prod.yml exec prahestate-db pg_isready -U postgres

# View logs
docker-compose -f docker-compose.prod.yml logs -f prahestate-app
```

### Updates
```bash
# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update database schema
docker-compose -f docker-compose.prod.yml exec prahestate-app npm run db:migrate
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed:**
   ```bash
   # Check database status
   docker-compose -f docker-compose.prod.yml logs prahestate-db
   
   # Verify environment variables
   docker-compose -f docker-compose.prod.yml exec prahestate-app env | grep DATABASE_URL
   ```

2. **App Won't Start:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs prahestate-app
   
   # Restart services
   docker-compose -f docker-compose.prod.yml restart
   ```

3. **Out of Memory:**
   ```bash
   # Check resource usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

### Performance Tuning

1. **Database Optimization:**
   - Adjust PostgreSQL configuration
   - Monitor query performance
   - Regular VACUUM and ANALYZE

2. **Application Tuning:**
   - Adjust sync batch size
   - Increase API request delays
   - Monitor memory usage

## Security Considerations

1. **Change default passwords**
2. **Use strong database passwords**
3. **Enable firewall rules**
4. **Regular security updates**
5. **Monitor access logs**
6. **Use reverse proxy for HTTPS**

## Support

For issues:
1. Check logs first
2. Verify network connectivity
3. Check TrueNAS system resources
4. Review configuration files
5. Consult TrueNAS SCALE documentation
