#!/bin/bash

# TrueNAS SCALE Deployment Script for PrahEstate Service
# Run this script on your TrueNAS SCALE system

set -e

# Configuration - UPDATE THESE VALUES
GIT_REPO="https://github.com/your-username/prahestate-service.git"  # Change to your repo URL
GIT_BRANCH="main"  # Change if using different branch
POOL_NAME="tank"  # Change this to your pool name
APP_NAME="prahestate-service"
APP_PATH="/mnt/${POOL_NAME}/apps/prahestate"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[NOTE]${NC} $1"
}

# Check if running on TrueNAS
check_system() {
    log "Checking system requirements..."
    
    if [ ! -f "/etc/truenas-release" ]; then
        error "This script is designed for TrueNAS SCALE"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not available. Please enable Docker in TrueNAS Apps settings."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        error "Git is not available. Installing git..."
        apt update && apt install -y git
    fi
    
    log "System check passed ✓"
}

# Create directory structure
setup_directories() {
    log "Setting up directory structure..."
    
    mkdir -p "$APP_PATH"
    mkdir -p "$APP_PATH/data"
    mkdir -p "$APP_PATH/logs"
    mkdir -p "$APP_PATH/backups"
    
    log "Directories created at $APP_PATH ✓"
}

# Clone or update repository
setup_repository() {
    log "Setting up repository..."
    
    if [ -z "$GIT_REPO" ] || [ "$GIT_REPO" = "https://github.com/your-username/prahestate-service.git" ]; then
        error "Please update the GIT_REPO variable in this script with your actual repository URL"
        exit 1
    fi
    
    cd "$(dirname "$APP_PATH")"
    
    if [ -d "$APP_PATH/.git" ]; then
        log "Repository exists, updating..."
        cd "$APP_PATH"
        git fetch origin
        git reset --hard "origin/$GIT_BRANCH"
        git clean -fd
    else
        log "Cloning repository..."
        rm -rf "$APP_PATH"
        git clone -b "$GIT_BRANCH" "$GIT_REPO" "$APP_PATH"
        cd "$APP_PATH"
    fi
    
    log "Repository setup completed ✓"
}

# Set environment variables
setup_environment() {
    log "Setting up environment..."
    
    cd "$APP_PATH"
    
    if [ ! -f ".env" ]; then
        log "Creating environment file..."
        cat > ".env" << EOF
# Database Configuration
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d /=+ | cut -c -25)

# Application Configuration
NODE_ENV=production
PORT=3000

# Database URL (will be set automatically)
DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@db:5432/prahestate

# Sreality API Configuration
SREALITY_API_URL=https://www.sreality.cz/api/en/v2/estates
API_PER_PAGE=20
API_MAX_PAGES=100
API_REQUEST_DELAY_MS=2000

# Sync Configuration
SYNC_ENABLED=true
SYNC_SCHEDULE=0 */6 * * *
SYNC_BATCH_SIZE=50
EOF
        log "Environment file created with secure random password ✓"
    else
        warn "Environment file already exists, keeping current configuration"
    fi
}

# Deploy the application
deploy_app() {
    log "Deploying application..."
    
    cd "$APP_PATH"
    
    # Use the TrueNAS-optimized docker-compose file
    if [ -f "docker-compose.truenas.yml" ]; then
        COMPOSE_FILE="docker-compose.truenas.yml"
    elif [ -f "docker-compose.prod.yml" ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    else
        error "No suitable docker-compose file found"
        exit 1
    fi
    
    log "Using compose file: $COMPOSE_FILE"
    
    # Pull latest images and build
    docker-compose -f "$COMPOSE_FILE" pull || true
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "Waiting for services to start..."
    sleep 45
    
    # Check if services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        error "Services failed to start. Checking logs..."
        docker-compose -f "$COMPOSE_FILE" logs
        exit 1
    fi
    
    # Initialize database
    log "Initializing database..."
    local retries=0
    while [ $retries -lt 5 ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T app npm run db:push; then
            log "Database initialized successfully ✓"
            break
        else
            retries=$((retries + 1))
            warn "Database initialization attempt $retries failed, retrying in 10 seconds..."
            sleep 10
        fi
    done
    
    if [ $retries -eq 5 ]; then
        warn "Database initialization failed after 5 attempts. You may need to run it manually."
    fi
    
    log "Deployment completed! 🎉"
}

# Show service information
show_info() {
    local IP=$(hostname -I | awk '{print $1}')
    
    log "🚀 Services are running:"
    echo "  📊 API Service: http://${IP}:3000"
    echo "     - Health: http://${IP}:3000/health"
    echo "     - Estates: http://${IP}:3000/api/estates"
    echo "     - Stats: http://${IP}:3000/api/stats"
    echo "  🗄️  Database Admin: http://${IP}:8080"
    echo "  📁 Data Location: $APP_PATH"
    echo ""
    
    info "📚 Quick commands:"
    echo "  View logs: docker-compose -f $APP_PATH/$(ls $APP_PATH/docker-compose*.yml | head -1 | xargs basename) logs -f"
    echo "  Restart: $0 restart"
    echo "  Update: $0 update"
    echo "  Stop: $0 stop"
    echo "  Backup: $0 backup"
}

# Update application
update_app() {
    log "Updating application..."
    
    cd "$APP_PATH"
    
    # Pull latest code
    git fetch origin
    git reset --hard "origin/$GIT_BRANCH"
    git clean -fd
    
    # Rebuild and restart
    COMPOSE_FILE=$(ls docker-compose*.yml | head -1)
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Run any new migrations
    log "Running database migrations..."
    sleep 15
    docker-compose -f "$COMPOSE_FILE" exec -T app npm run db:push || warn "Migration failed"
    
    log "Update completed ✓"
}

# Backup database
backup_database() {
    log "Creating database backup..."
    
    cd "$APP_PATH"
    COMPOSE_FILE=$(ls docker-compose*.yml | head -1)
    BACKUP_FILE="$APP_PATH/backups/prahestate_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U postgres prahestate > "$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    
    # Keep only last 30 days of backups
    find "$APP_PATH/backups" -name "prahestate_*.sql.gz" -mtime +30 -delete
    
    log "Backup created: ${BACKUP_FILE}.gz ✓"
}

# Show status
show_status() {
    log "Service Status:"
    cd "$APP_PATH" 2>/dev/null || { error "App not found at $APP_PATH"; exit 1; }
    COMPOSE_FILE=$(ls docker-compose*.yml | head -1)
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log "Recent logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=10 app
}

# Show help
show_help() {
    echo "TrueNAS SCALE Deployment Script for PrahEstate Service"
    echo ""
    echo "Usage: $0 {setup|deploy|update|status|backup|logs|restart|stop|info|help}"
    echo ""
    echo "Commands:"
    echo "  setup   - Create directories and clone repository"
    echo "  deploy  - Full deployment (setup + build + start)"
    echo "  update  - Update from repository and restart"
    echo "  status  - Show service status and recent logs"
    echo "  backup  - Create database backup"
    echo "  logs    - Show live application logs"
    echo "  restart - Restart services"
    echo "  stop    - Stop services"
    echo "  info    - Show service information and URLs"
    echo "  help    - Show this help"
    echo ""
    echo "Configuration:"
    echo "  Repository: $GIT_REPO"
    echo "  Branch: $GIT_BRANCH"
    echo "  Install Path: $APP_PATH"
}

# Main execution
case "${1:-help}" in
    "setup")
        check_system
        setup_directories
        setup_repository
        setup_environment
        log "Setup completed. Run '$0 deploy' to start the application."
        ;;
    "deploy")
        check_system
        setup_directories
        setup_repository
        setup_environment
        deploy_app
        show_info
        ;;
    "update")
        check_system
        update_app
        show_info
        ;;
    "status")
        show_status
        ;;
    "backup")
        backup_database
        ;;
    "logs")
        cd "$APP_PATH"
        COMPOSE_FILE=$(ls docker-compose*.yml | head -1)
        docker-compose -f "$COMPOSE_FILE" logs -f app
        ;;
    "restart")
        cd "$APP_PATH"
        COMPOSE_FILE=$(ls docker-compose*.yml | head -1)
        docker-compose -f "$COMPOSE_FILE" restart
        log "Services restarted ✓"
        ;;
    "stop")
        cd "$APP_PATH"
        COMPOSE_FILE=$(ls docker-compose*.yml | head -1)
        docker-compose -f "$COMPOSE_FILE" down
        log "Services stopped ✓"
        ;;
    "info")
        show_info
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
