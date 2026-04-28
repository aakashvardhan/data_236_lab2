#!/bin/bash

# Yelp Microservices - Automated AWS + Kubernetes Deployment Script
# This script automates the deployment process to AWS EKS

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing=0
    
    tools=("docker" "kubectl" "aws" "eksctl")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            print_error "$tool is not installed"
            missing=$((missing + 1))
        else
            print_success "$tool is installed"
        fi
    done
    
    if [ $missing -gt 0 ]; then
        print_error "Please install missing tools"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    print_success "AWS credentials configured"
}

# Setup AWS environment
setup_aws_env() {
    print_header "Setting Up AWS Environment"
    
    read -p "Enter AWS Region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    print_success "AWS Region: $AWS_REGION"
    print_success "AWS Account ID: $AWS_ACCOUNT_ID"
    print_success "ECR Registry: $ECR_REGISTRY"
    
    # Save to file
    cat > aws_env.sh << EOF
export AWS_REGION=$AWS_REGION
export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
export ECR_REGISTRY=$ECR_REGISTRY
EOF
    
    source aws_env.sh
}

# Create ECR repositories
create_ecr_repositories() {
    print_header "Creating ECR Repositories"
    
    local services=("user-service" "restaurant-service" "restaurant-owner-service" "review-service" "frontend")
    
    for service in "${services[@]}"; do
        print_info "Creating repository: yelp/$service"
        aws ecr create-repository \
            --repository-name yelp/$service \
            --region $AWS_REGION 2>/dev/null || print_warning "Repository already exists: yelp/$service"
    done
    
    # Login to ECR
    print_info "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REGISTRY
    
    print_success "ECR repositories created and logged in"
}

# Build and push Docker images
build_and_push_images() {
    print_header "Building and Pushing Docker Images"
    
    cd "$PROJECT_ROOT"
    
    local services=(
        "user-service"
        "restaurant-service"
        "restaurant-owner-service"
        "review-service"
    )
    
    # Build backend services
    for service in "${services[@]}"; do
        print_info "Building $service..."
        docker build -t $ECR_REGISTRY/yelp/$service:latest \
                     -t $ECR_REGISTRY/yelp/$service:v1.0.0 \
                     ./services/$service
        
        print_info "Pushing $service to ECR..."
        docker push $ECR_REGISTRY/yelp/$service:latest
        docker push $ECR_REGISTRY/yelp/$service:v1.0.0
        
        print_success "$service built and pushed"
    done
    
    # Build frontend
    print_info "Building frontend..."
    docker build -t $ECR_REGISTRY/yelp/frontend:latest \
                 -t $ECR_REGISTRY/yelp/frontend:v1.0.0 \
                 ./frontend
    
    print_info "Pushing frontend to ECR..."
    docker push $ECR_REGISTRY/yelp/frontend:latest
    docker push $ECR_REGISTRY/yelp/frontend:v1.0.0
    
    print_success "All images built and pushed"
}

# Create EKS cluster
create_eks_cluster() {
    print_header "Creating EKS Cluster"
    
    read -p "Enter cluster name (default: yelp-cluster): " CLUSTER_NAME
    CLUSTER_NAME=${CLUSTER_NAME:-yelp-cluster}
    
    read -p "Enter number of nodes (default: 3): " NODE_COUNT
    NODE_COUNT=${NODE_COUNT:-3}
    
    read -p "Enter node type (default: t3.medium): " NODE_TYPE
    NODE_TYPE=${NODE_TYPE:-t3.medium}
    
    print_info "Creating EKS cluster: $CLUSTER_NAME"
    print_warning "This may take 10-15 minutes..."
    
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
    
    print_success "EKS cluster created successfully"
    
    # Update kubeconfig
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION
    
    # Verify cluster
    kubectl cluster-info
    kubectl get nodes
    
    print_success "Cluster verified"
}

# Deploy to EKS
deploy_to_eks() {
    print_header "Deploying to EKS"
    
    cd "$PROJECT_ROOT/k8s"
    
    # Create namespace
    print_info "Creating namespace..."
    kubectl create namespace yelp 2>/dev/null || print_warning "Namespace already exists"
    
    # Create ECR secret
    print_info "Creating ECR secret..."
    kubectl delete secret ecr-secret -n yelp 2>/dev/null || true
    
    # Create dockerconfig for ECR
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REGISTRY
    
    kubectl create secret docker-registry ecr-secret \
        --docker-server=$ECR_REGISTRY \
        --docker-username=AWS \
        --docker-password=$(aws ecr get-login-password --region $AWS_REGION) \
        -n yelp
    
    print_success "ECR secret created"
    
    # Update image references in manifests
    print_info "Updating image references..."
    for file in *.yaml; do
        sed -i '' "s|image:.*yelp/|image: $ECR_REGISTRY/yelp/|g" "$file" 2>/dev/null || true
    done
    
    # Create ConfigMap
    print_info "Creating ConfigMap..."
    kubectl create configmap app-config \
        --from-literal=MONGO_URI=mongodb://mongodb:27017 \
        --from-literal=MONGO_DB_NAME=yelp_db \
        --from-literal=KAFKA_BROKER=kafka:9092 \
        --from-literal=CORS_ORIGINS='*' \
        -n yelp 2>/dev/null || print_warning "ConfigMap already exists"
    
    # Create Secrets
    print_info "Creating application secrets..."
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    
    kubectl create secret generic app-secrets \
        --from-literal=JWT_SECRET_KEY="$JWT_SECRET" \
        --from-literal=TAVILY_API_KEY='' \
        --from-literal=GEMINI_API_KEY='' \
        --from-literal=HF_API_TOKEN='' \
        -n yelp 2>/dev/null || print_warning "Secrets already exist"
    
    # Deploy infrastructure
    print_info "Deploying MongoDB..."
    kubectl apply -f mongodb-pvc.yaml -n yelp
    kubectl apply -f mongodb-deployment.yaml -n yelp
    kubectl apply -f mongodb-service.yaml -n yelp
    kubectl rollout status deployment/mongodb -n yelp --timeout=5m
    print_success "MongoDB deployed"
    
    print_info "Deploying Zookeeper..."
    kubectl apply -f zookeeper-deployment.yaml -n yelp
    kubectl apply -f zookeeper-service.yaml -n yelp
    kubectl rollout status deployment/zookeeper -n yelp --timeout=5m
    print_success "Zookeeper deployed"
    
    print_info "Deploying Kafka..."
    kubectl apply -f kafka-deployment.yaml -n yelp
    kubectl apply -f kafka-service.yaml -n yelp
    kubectl rollout status deployment/kafka -n yelp --timeout=5m
    print_success "Kafka deployed"
    
    # Deploy application services
    print_info "Deploying application services..."
    kubectl apply -f configmap.yaml -n yelp
    kubectl apply -f user-service-deployment.yaml -n yelp
    kubectl apply -f restaurant-service-deployment.yaml -n yelp
    kubectl apply -f restaurant-owner-service-deployment.yaml -n yelp
    kubectl apply -f review-service-deployment.yaml -n yelp
    
    print_info "Waiting for services to be ready..."
    kubectl rollout status deployment/user-service -n yelp --timeout=5m
    kubectl rollout status deployment/restaurant-service -n yelp --timeout=5m
    kubectl rollout status deployment/restaurant-owner-service -n yelp --timeout=5m
    kubectl rollout status deployment/review-service -n yelp --timeout=5m
    
    print_success "Application services deployed"
    
    # Deploy frontend
    print_info "Deploying frontend..."
    kubectl apply -f frontend-deployment.yaml -n yelp
    kubectl apply -f frontend-service.yaml -n yelp
    kubectl rollout status deployment/frontend -n yelp --timeout=5m
    
    print_success "Frontend deployed"
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    # Check all pods
    print_info "Checking pods..."
    kubectl get pods -n yelp
    
    # Check services
    print_info "Checking services..."
    kubectl get svc -n yelp
    
    # Get frontend URL
    print_info "Waiting for LoadBalancer to assign external IP..."
    sleep 10
    
    FRONTEND_URL=$(kubectl get svc frontend -n yelp -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    
    if [ -z "$FRONTEND_URL" ]; then
        print_warning "LoadBalancer IP not yet assigned. Using port-forward instead."
        print_info "Run: kubectl port-forward svc/frontend 80:80 -n yelp"
    else
        print_success "Frontend URL: http://$FRONTEND_URL"
    fi
    
    # Test health endpoints
    print_info "Testing service health endpoints..."
    
    kubectl port-forward svc/user-service 8001:8001 -n yelp &
    local pf_pid=$!
    sleep 2
    
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_success "User service is healthy"
    else
        print_error "User service is not responding"
    fi
    
    kill $pf_pid 2>/dev/null || true
}

# Main menu
show_menu() {
    echo ""
    print_header "Yelp Microservices - Deployment Menu"
    echo "1. Check prerequisites"
    echo "2. Setup AWS environment"
    echo "3. Create ECR repositories"
    echo "4. Build and push Docker images"
    echo "5. Create EKS cluster"
    echo "6. Deploy to EKS"
    echo "7. Verify deployment"
    echo "8. Full deployment (all steps)"
    echo "9. Cleanup resources"
    echo "0. Exit"
    echo ""
}

cleanup_resources() {
    print_header "Cleanup AWS Resources"
    
    read -p "Are you sure you want to delete all resources? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Cleanup cancelled"
        return
    fi
    
    CLUSTER_NAME=${CLUSTER_NAME:-yelp-cluster}
    
    print_info "Deleting Kubernetes namespace..."
    kubectl delete namespace yelp 2>/dev/null || true
    
    print_info "Deleting EKS cluster..."
    eksctl delete cluster --name $CLUSTER_NAME --region $AWS_REGION
    
    print_info "Deleting ECR repositories..."
    for service in user-service restaurant-service restaurant-owner-service review-service frontend; do
        aws ecr delete-repository --repository-name yelp/$service --force --region $AWS_REGION 2>/dev/null || true
    done
    
    print_success "Cleanup completed"
}

# Main script
main() {
    # Get project root
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    while true; do
        show_menu
        read -p "Select an option: " choice
        
        case $choice in
            1)
                check_prerequisites
                ;;
            2)
                setup_aws_env
                ;;
            3)
                create_ecr_repositories
                ;;
            4)
                if [ -z "$ECR_REGISTRY" ]; then
                    setup_aws_env
                fi
                build_and_push_images
                ;;
            5)
                if [ -z "$AWS_REGION" ]; then
                    setup_aws_env
                fi
                create_eks_cluster
                ;;
            6)
                if [ -z "$ECR_REGISTRY" ]; then
                    setup_aws_env
                fi
                deploy_to_eks
                ;;
            7)
                verify_deployment
                ;;
            8)
                check_prerequisites
                setup_aws_env
                create_ecr_repositories
                build_and_push_images
                create_eks_cluster
                deploy_to_eks
                verify_deployment
                ;;
            9)
                cleanup_resources
                ;;
            0)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Run main function
main
