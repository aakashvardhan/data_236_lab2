#!/bin/bash

# Quick Start Script - One-Command Deployment
# This script runs through the full deployment process automatically

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-yelp-cluster}"
NAMESPACE="${NAMESPACE:-yelp}"
NODE_COUNT="${NODE_COUNT:-3}"
NODE_TYPE="${NODE_TYPE:-t3.medium}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Step counter
STEP=0
TOTAL_STEPS=8

run_step() {
    STEP=$((STEP + 1))
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ STEP $STEP/$TOTAL_STEPS: $1"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    run_step "Checking Prerequisites"
    
    local tools=("docker" "kubectl" "aws" "eksctl" "python3")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed. Please install it first."
        fi
        log_success "$tool installed"
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
    fi
    log_success "AWS credentials configured"
}

# Setup AWS environment
setup_aws() {
    run_step "Setting Up AWS Environment"
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    log_info "AWS Region: $AWS_REGION"
    log_info "AWS Account ID: $AWS_ACCOUNT_ID"
    log_info "ECR Registry: $ECR_REGISTRY"
    
    export AWS_ACCOUNT_ID
    export ECR_REGISTRY
}

# Setup Docker & ECR
setup_docker_ecr() {
    run_step "Setting Up Docker & ECR"
    
    log_info "Creating ECR repositories..."
    
    for service in user-service restaurant-service restaurant-owner-service review-service frontend; do
        aws ecr create-repository \
            --repository-name yelp/$service \
            --region $AWS_REGION 2>/dev/null || true
        log_success "Repository: yelp/$service"
    done
    
    log_info "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REGISTRY
    
    log_success "Docker logged into ECR"
}

# Build and push images
build_push_images() {
    run_step "Building and Pushing Docker Images"
    
    cd "$PROJECT_ROOT"
    
    local services=("user-service" "restaurant-service" "restaurant-owner-service" "review-service")
    
    for service in "${services[@]}"; do
        log_info "Building $service..."
        docker build -t $ECR_REGISTRY/yelp/$service:latest \
                     -t $ECR_REGISTRY/yelp/$service:v1.0.0 \
                     ./services/$service > /dev/null 2>&1
        
        log_info "Pushing $service..."
        docker push $ECR_REGISTRY/yelp/$service:latest > /dev/null 2>&1
        docker push $ECR_REGISTRY/yelp/$service:v1.0.0 > /dev/null 2>&1
        
        log_success "$service built and pushed"
    done
    
    log_info "Building frontend..."
    docker build -t $ECR_REGISTRY/yelp/frontend:latest \
                 -t $ECR_REGISTRY/yelp/frontend:v1.0.0 \
                 ./frontend > /dev/null 2>&1
    
    log_info "Pushing frontend..."
    docker push $ECR_REGISTRY/yelp/frontend:latest > /dev/null 2>&1
    docker push $ECR_REGISTRY/yelp/frontend:v1.0.0 > /dev/null 2>&1
    
    log_success "Frontend built and pushed"
}

# Create EKS cluster
create_cluster() {
    run_step "Creating EKS Cluster"
    
    log_warning "Creating cluster (this may take 10-15 minutes)..."
    
    eksctl create cluster \
        --name $CLUSTER_NAME \
        --region $AWS_REGION \
        --nodegroup-name yelp-nodes \
        --node-type $NODE_TYPE \
        --nodes $NODE_COUNT \
        --nodes-min 2 \
        --nodes-max $((NODE_COUNT + 2)) \
        --managed \
        --with-oidc
    
    log_success "EKS cluster created"
    
    # Update kubeconfig
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION
    
    # Verify cluster
    kubectl cluster-info
    kubectl get nodes
}

# Deploy to Kubernetes
deploy_kubernetes() {
    run_step "Deploying to Kubernetes"
    
    cd "$PROJECT_ROOT/k8s"
    
    # Create namespace
    log_info "Creating namespace..."
    kubectl create namespace $NAMESPACE 2>/dev/null || true
    
    # Create ECR secret
    log_info "Creating ECR secret..."
    kubectl delete secret ecr-secret -n $NAMESPACE 2>/dev/null || true
    
    kubectl create secret docker-registry ecr-secret \
        --docker-server=$ECR_REGISTRY \
        --docker-username=AWS \
        --docker-password=$(aws ecr get-login-password --region $AWS_REGION) \
        -n $NAMESPACE
    
    # Update image references
    log_info "Updating image references..."
    for file in *.yaml; do
        sed -i '' "s|image: .*yelp/|image: $ECR_REGISTRY/yelp/|g" "$file" 2>/dev/null || true
    done
    
    # Create ConfigMap
    log_info "Creating ConfigMap..."
    kubectl create configmap app-config \
        --from-literal=MONGO_URI=mongodb://mongodb:27017 \
        --from-literal=MONGO_DB_NAME=yelp_db \
        --from-literal=KAFKA_BROKER=kafka:9092 \
        --from-literal=CORS_ORIGINS='*' \
        -n $NAMESPACE 2>/dev/null || true
    
    # Create Secrets
    log_info "Creating application secrets..."
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    
    kubectl create secret generic app-secrets \
        --from-literal=JWT_SECRET_KEY="$JWT_SECRET" \
        --from-literal=TAVILY_API_KEY='' \
        --from-literal=GEMINI_API_KEY='' \
        --from-literal=HF_API_TOKEN='' \
        -n $NAMESPACE 2>/dev/null || true
    
    # Deploy infrastructure
    log_info "Deploying MongoDB..."
    kubectl apply -f mongodb-pvc.yaml -n $NAMESPACE
    kubectl apply -f mongodb-deployment.yaml -n $NAMESPACE
    kubectl apply -f mongodb-service.yaml -n $NAMESPACE
    kubectl rollout status deployment/mongodb -n $NAMESPACE --timeout=5m
    log_success "MongoDB deployed"
    
    log_info "Deploying Zookeeper..."
    kubectl apply -f zookeeper-deployment.yaml -n $NAMESPACE
    kubectl apply -f zookeeper-service.yaml -n $NAMESPACE
    kubectl rollout status deployment/zookeeper -n $NAMESPACE --timeout=5m
    log_success "Zookeeper deployed"
    
    log_info "Deploying Kafka..."
    kubectl apply -f kafka-deployment.yaml -n $NAMESPACE
    kubectl apply -f kafka-service.yaml -n $NAMESPACE
    kubectl rollout status deployment/kafka -n $NAMESPACE --timeout=5m
    log_success "Kafka deployed"
    
    # Deploy application services
    log_info "Deploying application services..."
    kubectl apply -f configmap.yaml -n $NAMESPACE 2>/dev/null || true
    kubectl apply -f user-service-deployment.yaml -n $NAMESPACE
    kubectl apply -f restaurant-service-deployment.yaml -n $NAMESPACE
    kubectl apply -f restaurant-owner-service-deployment.yaml -n $NAMESPACE
    kubectl apply -f review-service-deployment.yaml -n $NAMESPACE
    
    kubectl rollout status deployment/user-service -n $NAMESPACE --timeout=5m
    kubectl rollout status deployment/restaurant-service -n $NAMESPACE --timeout=5m
    kubectl rollout status deployment/restaurant-owner-service -n $NAMESPACE --timeout=5m
    kubectl rollout status deployment/review-service -n $NAMESPACE --timeout=5m
    log_success "Application services deployed"
    
    # Deploy frontend
    log_info "Deploying frontend..."
    kubectl apply -f frontend-deployment.yaml -n $NAMESPACE
    kubectl apply -f frontend-service.yaml -n $NAMESPACE
    kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=5m
    log_success "Frontend deployed"
}

# Verify deployment
verify_deployment() {
    run_step "Verifying Deployment"
    
    log_info "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    log_info "Checking services..."
    kubectl get svc -n $NAMESPACE
    
    log_info "Checking deployments..."
    kubectl get deployments -n $NAMESPACE
    
    # Wait for LoadBalancer
    log_info "Waiting for LoadBalancer external IP (this may take a minute)..."
    sleep 10
    
    FRONTEND_URL=$(kubectl get svc frontend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    
    if [ -z "$FRONTEND_URL" ]; then
        log_warning "LoadBalancer IP not yet assigned"
        log_info "To get the URL later, run:"
        echo "  kubectl get svc frontend -n $NAMESPACE"
    else
        log_success "Frontend URL: http://$FRONTEND_URL"
    fi
}

# Display summary
display_summary() {
    run_step "Deployment Summary"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           DEPLOYMENT COMPLETED SUCCESSFULLY!               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Cluster Information:"
    echo "  Cluster Name: $CLUSTER_NAME"
    echo "  Region: $AWS_REGION"
    echo "  Namespace: $NAMESPACE"
    echo "  Nodes: $NODE_COUNT x $NODE_TYPE"
    echo ""
    echo "Useful Commands:"
    echo "  View all resources:     kubectl get all -n $NAMESPACE"
    echo "  View pods:              kubectl get pods -n $NAMESPACE"
    echo "  View services:          kubectl get svc -n $NAMESPACE"
    echo "  View logs:              kubectl logs deployment/<service> -n $NAMESPACE"
    echo "  Port forward:           kubectl port-forward svc/<service> <port>:<port> -n $NAMESPACE"
    echo "  Scale deployment:       kubectl scale deployment/<service> --replicas=3 -n $NAMESPACE"
    echo ""
    echo "API Endpoints (port forward to access):"
    echo "  User Service:           http://localhost:8001"
    echo "  Restaurant Service:     http://localhost:8002"
    echo "  Owner Service:          http://localhost:8003"
    echo "  Review Service:         http://localhost:8004"
    echo ""
    echo "Next Steps:"
    echo "  1. Get the frontend URL: kubectl get svc frontend -n $NAMESPACE"
    echo "  2. Test health endpoints"
    echo "  3. Monitor logs: kubectl logs -f deployment/<service> -n $NAMESPACE"
    echo "  4. Run performance tests with JMeter"
    echo ""
    echo "To cleanup resources when done:"
    echo "  eksctl delete cluster --name $CLUSTER_NAME --region $AWS_REGION"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   Yelp Microservices - AWS EKS Deployment Script           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    setup_aws
    setup_docker_ecr
    build_push_images
    create_cluster
    deploy_kubernetes
    verify_deployment
    display_summary
}

# Run main
main "$@"
