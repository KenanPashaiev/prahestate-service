#!/bin/bash

# PrahEstate Service Deployment Script for TrueNAS SCALE
# Usage: ./deploy.sh [method]
# Methods: docker, k8s, build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
}

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
}

# Build Docker image
build_image() {
    log "Building Docker image..."
    docker build -t prahestate-service:latest .
    log "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_docker() {
    log "Deploying with Docker Compose..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            warn "Copied .env.production to .env. Please review and update passwords!"
        else
            error ".env file not found. Please create one based on .env.example"
            exit 1
        fi
    fi
    
    # Check if docker-compose or docker compose is available
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        error "Docker Compose is not available"
        exit 1
    fi
    
    log "Starting services..."
    $COMPOSE_CMD -f docker-compose.prod.yml up -d
    
    log "Waiting for database to be ready..."
    sleep 30
    
    log "Setting up database schema..."
    $COMPOSE_CMD -f docker-compose.prod.yml exec -T prahestate-app npm run db:push || true
    
    log "Deployment completed!"
    log "Services are accessible at:"
    log "  - API: http://$(hostname -I | awk '{print $1}'):3000"
    log "  - Adminer: http://$(hostname -I | awk '{print $1}'):8080"
    log "  - Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
}

# Deploy with Kubernetes
deploy_k8s() {
    log "Deploying with Kubernetes..."
    check_kubectl
    
    log "Applying Kubernetes manifests..."
    kubectl apply -f k8s/
    
    log "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/postgres -n prahestate
    kubectl wait --for=condition=available --timeout=300s deployment/prahestate-app -n prahestate
    
    log "Setting up database schema..."
    kubectl exec -n prahestate deployment/prahestate-app -- npm run db:push || true
    
    log "Deployment completed!"
    log "Service is accessible at:"
    log "  - API: http://$(hostname -I | awk '{print $1}'):30000"
}

# Stop services
stop_services() {
    log "Stopping services..."
    
    if [ -f "docker-compose.prod.yml" ]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.prod.yml down
        elif docker compose version &> /dev/null; then
            docker compose -f docker-compose.prod.yml down
        fi
    fi
    
    if command -v kubectl &> /dev/null; then
        kubectl delete namespace prahestate --ignore-not-found=true
    fi
    
    log "Services stopped"
}

# Show status
show_status() {
    log "Service Status:"
    
    echo "Docker Compose:"
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "  Not running"
    elif docker compose version &> /dev/null; then
        docker compose -f docker-compose.prod.yml ps 2>/dev/null || echo "  Not running"
    else
        echo "  Docker Compose not available"
    fi
    
    echo ""
    echo "Kubernetes:"
    if command -v kubectl &> /dev/null; then
        kubectl get pods -n prahestate 2>/dev/null || echo "  Not running"
    else
        echo "  kubectl not available"
    fi
}

# Show logs
show_logs() {
    log "Showing logs..."
    
    if [ -f "docker-compose.prod.yml" ]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.prod.yml logs -f prahestate-app
        elif docker compose version &> /dev/null; then
            docker compose -f docker-compose.prod.yml logs -f prahestate-app
        fi
    fi
}

# Main script
case "${1:-docker}" in
    "build")
        check_docker
        build_image
        ;;
    "docker")
        check_docker
        build_image
        deploy_docker
        ;;
    "k8s"|"kubernetes")
        check_docker
        check_kubectl
        build_image
        deploy_k8s
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [method]"
        echo ""
        echo "Methods:"
        echo "  build     - Build Docker image only"
        echo "  docker    - Deploy with Docker Compose (default)"
        echo "  k8s       - Deploy with Kubernetes"
        echo "  stop      - Stop all services"
        echo "  status    - Show service status"
        echo "  logs      - Show application logs"
        echo "  help      - Show this help"
        ;;
    *)
        error "Unknown deployment method: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
