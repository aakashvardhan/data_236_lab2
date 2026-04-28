# Yelp Prototype - Docker + AWS + Kubernetes Deployment Guide

This guide provides step-by-step instructions to deploy the Yelp microservices application to AWS using Kubernetes.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Docker Setup & Registry](#phase-1-docker-setup--registry)
3. [Phase 2: AWS Infrastructure Setup](#phase-2-aws-infrastructure-setup)
4. [Phase 3: Kubernetes Cluster Setup](#phase-3-kubernetes-cluster-setup)
5. [Phase 4: Deploy to EKS](#phase-4-deploy-to-eks)
6. [Phase 5: Verification & Monitoring](#phase-5-verification--monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Tools
- **AWS Account** with appropriate IAM permissions
- **Docker Desktop** or Docker Engine installed
- **kubectl** installed (`brew install kubectl` on macOS)
- **AWS CLI v2** installed (`brew install awscliv2` on macOS)
- **eksctl** installed (`brew install weaveworks/tap/eksctl` on macOS)
- **helm** installed (`brew install helm` on macOS) - optional but recommended
- **Git** for version control

### Verify Installations
```bash
docker --version
kubectl version --client
aws --version
eksctl version
aws configure  # Set up AWS credentials (AWS Access Key ID, Secret Access Key, region)
```

---

## Phase 1: Docker Setup & Registry

### Step 1.1: Create AWS ECR (Elastic Container Registry)
Create a private Docker registry in AWS to store your container images.

```bash
# Set variables
AWS_REGION="us-east-1"  # Change to your preferred region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Create ECR repositories for each service
aws ecr create-repository --repository-name yelp/user-service --region $AWS_REGION
aws ecr create-repository --repository-name yelp/restaurant-service --region $AWS_REGION
aws ecr create-repository --repository-name yelp/restaurant-owner-service --region $AWS_REGION
aws ecr create-repository --repository-name yelp/review-service --region $AWS_REGION
aws ecr create-repository --repository-name yelp/frontend --region $AWS_REGION
```

### Step 1.2: Login to ECR
```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY
```

### Step 1.3: Build and Push Docker Images

**Build all services:**

```bash
# Set project root
PROJECT_ROOT="/Users/khushidonda/Documents/semester-2/distrubuted systems/homeworks/data_236_lab2"
cd "$PROJECT_ROOT"

# Build and push each service
echo "Building and pushing User Service..."
docker build -t $ECR_REGISTRY/yelp/user-service:latest ./services/user-service
docker push $ECR_REGISTRY/yelp/user-service:latest

echo "Building and pushing Restaurant Service..."
docker build -t $ECR_REGISTRY/yelp/restaurant-service:latest ./services/restaurant-service
docker push $ECR_REGISTRY/yelp/restaurant-service:latest

echo "Building and pushing Restaurant Owner Service..."
docker build -t $ECR_REGISTRY/yelp/restaurant-owner-service:latest ./services/restaurant-owner-service
docker push $ECR_REGISTRY/yelp/restaurant-owner-service:latest

echo "Building and pushing Review Service..."
docker build -t $ECR_REGISTRY/yelp/review-service:latest ./services/review-service
docker push $ECR_REGISTRY/yelp/review-service:latest

echo "Building and pushing Frontend..."
docker build -t $ECR_REGISTRY/yelp/frontend:latest ./frontend
docker push $ECR_REGISTRY/yelp/frontend:latest

# Tag images with version
for service in user-service restaurant-service restaurant-owner-service review-service; do
  docker tag $ECR_REGISTRY/yelp/$service:latest $ECR_REGISTRY/yelp/$service:v1.0.0
  docker push $ECR_REGISTRY/yelp/$service:v1.0.0
done

docker tag $ECR_REGISTRY/yelp/frontend:latest $ECR_REGISTRY/yelp/frontend:v1.0.0
docker push $ECR_REGISTRY/yelp/frontend:v1.0.0
```

**Verify images in ECR:**
```bash
aws ecr describe-repositories --region $AWS_REGION
aws ecr list-images --repository-name yelp/user-service --region $AWS_REGION
```

---

## Phase 2: AWS Infrastructure Setup

### Step 2.1: Create VPC (Virtual Private Cloud)

```bash
# Create VPC with CIDR block
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --region $AWS_REGION \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC Created: $VPC_ID"

# Enable DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --region $AWS_REGION \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION

# Create Public Subnets (2 for HA)
SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ${AWS_REGION}a \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ${AWS_REGION}b \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Subnets Created: $SUBNET_1, $SUBNET_2"

# Create Route Table
RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $AWS_REGION

# Associate subnets with route table
aws ec2 associate-route-table --subnet-id $SUBNET_1 --route-table-id $RT_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $SUBNET_2 --route-table-id $RT_ID --region $AWS_REGION

# Save variables for later
cat > aws_env.sh << EOF
export AWS_REGION=$AWS_REGION
export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
export ECR_REGISTRY=$ECR_REGISTRY
export VPC_ID=$VPC_ID
export SUBNET_1=$SUBNET_1
export SUBNET_2=$SUBNET_2
EOF

source aws_env.sh
```

### Step 2.2: Create Security Groups

```bash
# Security Group for EKS cluster
SG_ID=$(aws ec2 create-security-group \
  --group-name yelp-eks-sg \
  --description "Security group for Yelp EKS cluster" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

# Allow ingress from anywhere (adjust for production!)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 27017 \
  --cidr 10.0.0.0/16 \
  --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 9092 \
  --cidr 10.0.0.0/16 \
  --region $AWS_REGION

echo "Security Group Created: $SG_ID"
```

### Step 2.3: Create IAM Role for EKS

```bash
# Create IAM role for EKS cluster
cat > eks-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "eks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

EKS_ROLE_ARN=$(aws iam create-role \
  --role-name yelp-eks-cluster-role \
  --assume-role-policy-document file://eks-trust-policy.json \
  --query 'Role.Arn' \
  --output text)

# Attach required policies
aws iam attach-role-policy \
  --role-name yelp-eks-cluster-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

echo "EKS Role ARN: $EKS_ROLE_ARN"
```

---

## Phase 3: Kubernetes Cluster Setup

### Step 3.1: Create EKS Cluster

**Method 1: Using eksctl (Recommended - Simpler)**

```bash
# Create cluster with eksctl
eksctl create cluster \
  --name yelp-cluster \
  --region $AWS_REGION \
  --nodegroup-name yelp-nodes \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed \
  --with-oidc

# Wait for cluster creation (takes 10-15 minutes)
echo "Cluster creation started. Waiting for completion..."
sleep 300  # Wait 5 minutes

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

**Method 2: Using AWS CLI (More Control)**

```bash
# Create EKS cluster
CLUSTER_NAME="yelp-cluster"

aws eks create-cluster \
  --name $CLUSTER_NAME \
  --version 1.28 \
  --role-arn $EKS_ROLE_ARN \
  --resources-vpc-config subnetIds=$SUBNET_1,$SUBNET_2,securityGroupIds=$SG_ID \
  --region $AWS_REGION

# Wait for cluster to be ACTIVE
aws eks wait cluster-created --name $CLUSTER_NAME --region $AWS_REGION
echo "Cluster created successfully!"

# Update kubeconfig
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Verify cluster connection
kubectl cluster-info
```

### Step 3.2: Create Node Group (if using AWS CLI method)

```bash
# Create IAM role for worker nodes
cat > node-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

NODE_ROLE_ARN=$(aws iam create-role \
  --role-name yelp-eks-node-role \
  --assume-role-policy-document file://node-trust-policy.json \
  --query 'Role.Arn' \
  --output text)

# Attach policies
for policy in AmazonEKSWorkerNodePolicy AmazonEKS_CNI_Policy AmazonEC2ContainerRegistryReadOnly; do
  aws iam attach-role-policy --role-name yelp-eks-node-role --policy-arn arn:aws:iam::aws:policy/$policy
done

# Create node group
aws eks create-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name yelp-nodes \
  --scaling-config minSize=2,maxSize=5,desiredSize=3 \
  --subnets $SUBNET_1 $SUBNET_2 \
  --node-role arn:aws:iam::$AWS_ACCOUNT_ID:role/yelp-eks-node-role \
  --node-type t3.medium \
  --region $AWS_REGION

# Wait for nodes to be ready
aws eks wait nodegroup-active \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name yelp-nodes \
  --region $AWS_REGION

# Verify nodes
kubectl get nodes -w
```

### Step 3.3: Configure RBAC and IAM Integration

```bash
# Create service account for ECR access
kubectl create namespace yelp

cat > ecr-secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ecr-secret
  namespace: yelp
type: kubernetes.io/dockercfg
data:
  .dockercfg: $(aws ecr get-login-password --region $AWS_REGION | docker run --rm -i stedolan/jq -Rs '{auths: {("$ECR_REGISTRY"): {auth: (input | @base64)}}}' | base64 -w0)
EOF

kubectl apply -f ecr-secret.yaml

# Verify secret
kubectl get secret -n yelp
```

---

## Phase 4: Deploy to EKS

### Step 4.1: Prepare Kubernetes Manifests

Update the image references in your Kubernetes manifests to point to ECR:

```bash
cd "$PROJECT_ROOT/k8s"

# Update all image references in manifests
for file in *.yaml; do
  sed -i '' "s|image:.*yelp/|image: $ECR_REGISTRY/yelp/|g" "$file"
done

# Verify changes
grep "image:" *.yaml
```

### Step 4.2: Create ConfigMap and Secrets

```bash
# Create ConfigMap for environment variables
kubectl create configmap app-config \
  --from-literal=MONGO_URI=mongodb://mongodb:27017 \
  --from-literal=MONGO_DB_NAME=yelp_db \
  --from-literal=KAFKA_BROKER=kafka:9092 \
  --from-literal=CORS_ORIGINS=* \
  -n yelp

# Create Secret for sensitive data
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))") \
  --from-literal=TAVILY_API_KEY=your-tavily-key \
  --from-literal=GEMINI_API_KEY=your-gemini-key \
  --from-literal=HF_API_TOKEN=your-huggingface-token \
  -n yelp

# Verify
kubectl get configmap -n yelp
kubectl get secret -n yelp
```

### Step 4.3: Deploy Infrastructure (MongoDB, Kafka, Zookeeper)

```bash
# Apply MongoDB deployment
kubectl apply -f mongodb-pvc.yaml -n yelp
kubectl apply -f mongodb-deployment.yaml -n yelp
kubectl apply -f mongodb-service.yaml -n yelp

# Wait for MongoDB to be ready
kubectl rollout status deployment/mongodb -n yelp

# Apply Zookeeper
kubectl apply -f zookeeper-deployment.yaml -n yelp
kubectl apply -f zookeeper-service.yaml -n yelp
kubectl rollout status deployment/zookeeper -n yelp

# Apply Kafka
kubectl apply -f kafka-deployment.yaml -n yelp
kubectl apply -f kafka-service.yaml -n yelp
kubectl rollout status deployment/kafka -n yelp

# Verify all pods are running
kubectl get pods -n yelp
```

### Step 4.4: Deploy Application Services

```bash
# Apply configuration
kubectl apply -f configmap.yaml -n yelp

# Deploy all backend services
kubectl apply -f user-service-deployment.yaml -n yelp
kubectl apply -f restaurant-service-deployment.yaml -n yelp
kubectl apply -f restaurant-owner-service-deployment.yaml -n yelp
kubectl apply -f review-service-deployment.yaml -n yelp

# Deploy frontend
kubectl apply -f frontend-deployment.yaml -n yelp
kubectl apply -f frontend-service.yaml -n yelp

# Verify deployments
kubectl get deployments -n yelp
kubectl get pods -n yelp -w

# Wait for all services to be ready
kubectl rollout status deployment/user-service -n yelp
kubectl rollout status deployment/restaurant-service -n yelp
kubectl rollout status deployment/restaurant-owner-service -n yelp
kubectl rollout status deployment/review-service -n yelp
kubectl rollout status deployment/frontend -n yelp
```

### Step 4.5: Create LoadBalancer for Frontend

```bash
# Check if LoadBalancer is created
kubectl get svc -n yelp

# Get the external IP (may take a few minutes)
kubectl get svc frontend -n yelp -w

# Once you see an EXTERNAL-IP:
FRONTEND_URL=$(kubectl get svc frontend -n yelp -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Frontend URL: http://$FRONTEND_URL"
```

### Step 4.6: Setup Ingress (Optional but Recommended)

```bash
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Create Ingress resource
cat > ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yelp-ingress
  namespace: yelp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 8001
      - path: /api/restaurants
        pathType: Prefix
        backend:
          service:
            name: restaurant-service
            port:
              number: 8002
      - path: /api/owner
        pathType: Prefix
        backend:
          service:
            name: restaurant-owner-service
            port:
              number: 8003
      - path: /api/reviews
        pathType: Prefix
        backend:
          service:
            name: review-service
            port:
              number: 8004
EOF

kubectl apply -f ingress.yaml -n yelp

# Get Ingress URL
kubectl get ingress -n yelp -w
```

---

## Phase 5: Verification & Monitoring

### Step 5.1: Verify Services

```bash
# Check all pods
kubectl get pods -n yelp

# Check service endpoints
kubectl get svc -n yelp

# Port forward to test services locally
kubectl port-forward svc/user-service 8001:8001 -n yelp &
kubectl port-forward svc/restaurant-service 8002:8002 -n yelp &
kubectl port-forward svc/review-service 8004:8004 -n yelp &

# Test health endpoints
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8004/health

# Stop port forwards
jobs
kill %1 %2 %3
```

### Step 5.2: Check Logs

```bash
# View logs for specific service
kubectl logs deployment/user-service -n yelp --tail=100
kubectl logs deployment/restaurant-service -n yelp --tail=100

# Stream logs in real-time
kubectl logs -f deployment/user-service -n yelp

# View logs from all pods in deployment
kubectl logs -l app=user-service -n yelp --all-containers=true --timestamps=true
```

### Step 5.3: Monitor Resources

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n yelp

# View events
kubectl get events -n yelp --sort-by='.lastTimestamp'

# Describe a pod (troubleshooting)
kubectl describe pod <pod-name> -n yelp
```

### Step 5.4: Database Initialization

```bash
# Port forward to MongoDB
kubectl port-forward svc/mongodb 27017:27017 -n yelp &

# Run migration script (if needed)
# You may need to adjust paths based on your setup
python3 scripts/migrate_mysql_to_mongo.py

# Create Kafka topics
kubectl exec -it deployment/kafka -n yelp -- bash /scripts/create_kafka_topics.sh
```

### Step 5.5: Test API Endpoints

```bash
# Get frontend URL
FRONTEND_URL=$(kubectl get svc frontend -n yelp -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test signup
curl -X POST "http://$FRONTEND_URL/api/users/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Test login
curl -X POST "http://$FRONTEND_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get restaurants
curl "http://$FRONTEND_URL/api/restaurants"
```

### Step 5.6: Setup CloudWatch Monitoring

```bash
# Enable CloudWatch Container Insights
aws eks update-cluster-logging \
  --cluster-name $CLUSTER_NAME \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}' \
  --region $AWS_REGION

# View CloudWatch logs in AWS Console:
# - Navigate to CloudWatch > Log Groups
# - Look for: /aws/eks/$CLUSTER_NAME/cluster
```

---

## Cleanup (When Done)

```bash
# Delete all Kubernetes resources
kubectl delete namespace yelp

# Delete EKS cluster
eksctl delete cluster --name yelp-cluster --region $AWS_REGION

# Or using AWS CLI:
aws eks delete-nodegroup --cluster-name yelp-cluster --nodegroup-name yelp-nodes --region $AWS_REGION
aws eks delete-cluster --name yelp-cluster --region $AWS_REGION

# Delete VPC resources
aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION
aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID --region $AWS_REGION
aws ec2 delete-vpc --vpc-id $VPC_ID --region $AWS_REGION

# Delete ECR repositories
aws ecr delete-repository --repository-name yelp/user-service --force --region $AWS_REGION
aws ecr delete-repository --repository-name yelp/restaurant-service --force --region $AWS_REGION
aws ecr delete-repository --repository-name yelp/restaurant-owner-service --force --region $AWS_REGION
aws ecr delete-repository --repository-name yelp/review-service --force --region $AWS_REGION
aws ecr delete-repository --repository-name yelp/frontend --force --region $AWS_REGION

# Delete IAM roles
aws iam detach-role-policy --role-name yelp-eks-cluster-role --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
aws iam delete-role --role-name yelp-eks-cluster-role
aws iam detach-role-policy --role-name yelp-eks-node-role --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
aws iam delete-role --role-name yelp-eks-node-role
```

---

## Troubleshooting

### Common Issues

**Issue: Pod stuck in ImagePullBackOff**
```bash
# Check image pull errors
kubectl describe pod <pod-name> -n yelp

# Verify ECR credentials
kubectl get secret ecr-secret -n yelp -o yaml

# Re-create secret if needed
kubectl delete secret ecr-secret -n yelp
# Then re-create as shown in Step 3.3
```

**Issue: MongoDB connection failing**
```bash
# Port forward and test
kubectl port-forward svc/mongodb 27017:27017 -n yelp &
mongosh mongodb://localhost:27017

# Check MongoDB pod logs
kubectl logs deployment/mongodb -n yelp
```

**Issue: Services can't communicate**
```bash
# Check service DNS
kubectl exec -it <pod-name> -n yelp -- nslookup mongodb

# Test service connectivity
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
# Inside pod: curl http://user-service:8001/health
```

**Issue: LoadBalancer stuck in Pending**
```bash
# This is normal for EC2-based EKS
# Use kubectl port-forward instead:
kubectl port-forward svc/frontend 80:80 -n yelp &

# Or configure an Ingress (see Phase 4.6)
```

### Debug Commands

```bash
# Full cluster diagnostics
kubectl cluster-info dump --all-namespaces

# Check all resources in namespace
kubectl get all -n yelp

# Describe specific resource
kubectl describe deployment user-service -n yelp

# Get previous logs (if pod crashed)
kubectl logs deployment/user-service -n yelp --previous

# Execute command in pod
kubectl exec -it <pod-name> -n yelp -- /bin/bash

# Port forward to service
kubectl port-forward svc/<service-name> <local-port>:<service-port> -n yelp
```

---

## Next Steps

1. **Implement Kafka wiring** - Complete producer/consumer code in services
2. **Add Redux** - Set up Redux store and slices in frontend
3. **Performance testing** - Run JMeter tests against EKS deployment
4. **CI/CD Pipeline** - Set up AWS CodePipeline or GitHub Actions
5. **Auto-scaling** - Configure HPA (Horizontal Pod Autoscaler)
6. **SSL/TLS** - Add Certificate Manager and HTTPS
7. **Backup & DR** - Configure MongoDB backups and disaster recovery

---

## Quick Reference

### Port Mapping
| Service | Internal | External | Protocol |
|---------|----------|----------|----------|
| Frontend | 80 | LoadBalancer | HTTP |
| User Service | 8001 | ClusterIP | HTTP |
| Restaurant Service | 8002 | ClusterIP | HTTP |
| Owner Service | 8003 | ClusterIP | HTTP |
| Review Service | 8004 | ClusterIP | HTTP |
| MongoDB | 27017 | ClusterIP | TCP |
| Kafka | 9092 | ClusterIP | TCP |

### Useful Environment Variables
```bash
export KUBECONFIG=$HOME/.kube/config
export AWS_REGION=us-east-1
export CLUSTER_NAME=yelp-cluster
export NAMESPACE=yelp
```

---

## Additional Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [eksctl User Guide](https://eksctl.io/)
