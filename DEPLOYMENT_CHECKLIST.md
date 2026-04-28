# AWS + Kubernetes Deployment Checklist

## Pre-Deployment Checklist

### Account & Credentials
- [ ] AWS Account created
- [ ] IAM User created with programmatic access
- [ ] AWS Access Key ID obtained
- [ ] AWS Secret Access Key obtained
- [ ] AWS credentials configured locally (`aws configure`)
- [ ] AWS CLI can authenticate (`aws sts get-caller-identity`)

### Local Tools Installed
- [ ] Docker installed and running
- [ ] kubectl installed (`kubectl version --client`)
- [ ] AWS CLI v2 installed (`aws --version`)
- [ ] eksctl installed (`eksctl version`)
- [ ] helm installed (optional) (`helm version`)
- [ ] git installed (`git --version`)

### Code Repository
- [ ] Project cloned locally
- [ ] All Dockerfiles exist in services
- [ ] docker-compose.yml works locally
- [ ] Kubernetes manifests exist in k8s/ directory
- [ ] Environment variables configured

### AWS Account Setup
- [ ] Region selected (e.g., us-east-1)
- [ ] VPC quota increased if needed (default: 5)
- [ ] EKS quota checked (min 1, recommended 2+)
- [ ] EC2 quota checked for desired node count
- [ ] IAM permissions verified for:
  - [ ] EKS (eks:*)
  - [ ] EC2 (ec2:*, iam:*)
  - [ ] ECR (ecr:*)
  - [ ] CloudWatch (logs:*)

---

## Phase 1: Docker & Registry Setup (15-30 minutes)

### Step 1: Create AWS Environment Variables
- [ ] Set AWS_REGION environment variable
- [ ] Get AWS_ACCOUNT_ID
- [ ] Set ECR_REGISTRY variable
- [ ] Save to aws_env.sh for later use

**Commands:**
```bash
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

### Step 2: Create ECR Repositories
- [ ] Create ECR repo for user-service
- [ ] Create ECR repo for restaurant-service
- [ ] Create ECR repo for restaurant-owner-service
- [ ] Create ECR repo for review-service
- [ ] Create ECR repo for frontend
- [ ] Verify all repos created in AWS Console

**Command:**
```bash
aws ecr create-repository --repository-name yelp/user-service --region $AWS_REGION
```

### Step 3: Login to ECR
- [ ] Login Docker to ECR
- [ ] Verify login successful

**Command:**
```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY
```

### Step 4: Build Docker Images
- [ ] Build user-service image
- [ ] Build restaurant-service image
- [ ] Build restaurant-owner-service image
- [ ] Build review-service image
- [ ] Build frontend image
- [ ] Tag all images with v1.0.0

### Step 5: Push Images to ECR
- [ ] Push user-service to ECR
- [ ] Push restaurant-service to ECR
- [ ] Push restaurant-owner-service to ECR
- [ ] Push review-service to ECR
- [ ] Push frontend to ECR
- [ ] Verify all images in ECR Console

---

## Phase 2: AWS Infrastructure (20-40 minutes)

### Step 1: Create VPC
- [ ] Create VPC with 10.0.0.0/16 CIDR
- [ ] Enable DNS hostnames
- [ ] Enable DNS support
- [ ] Create Internet Gateway
- [ ] Attach IGW to VPC

### Step 2: Create Subnets
- [ ] Create public subnet 1 (10.0.1.0/24) in AZ-a
- [ ] Create public subnet 2 (10.0.2.0/24) in AZ-b
- [ ] Create route table
- [ ] Add route to IGW (0.0.0.0/0)
- [ ] Associate subnets with route table

### Step 3: Create Security Group
- [ ] Create security group for EKS
- [ ] Allow ingress on port 80 (HTTP)
- [ ] Allow ingress on port 443 (HTTPS)
- [ ] Allow ingress on port 27017 (MongoDB) from VPC
- [ ] Allow ingress on port 9092 (Kafka) from VPC

### Step 4: Create IAM Roles
- [ ] Create EKS cluster IAM role
- [ ] Attach AmazonEKSClusterPolicy
- [ ] Create node IAM role
- [ ] Attach AmazonEKSWorkerNodePolicy
- [ ] Attach AmazonEKS_CNI_Policy
- [ ] Attach AmazonEC2ContainerRegistryReadOnly

### Step 5: Save Infrastructure Details
- [ ] Save VPC ID
- [ ] Save Subnet IDs
- [ ] Save Security Group ID
- [ ] Save IAM Role ARNs
- [ ] Update aws_env.sh with all details

---

## Phase 3: EKS Cluster Creation (15-20 minutes)

### Option A: Using eksctl (Recommended)
- [ ] Run eksctl create cluster command
- [ ] Wait for cluster creation (10-15 minutes)
- [ ] Verify cluster is ACTIVE in AWS Console
- [ ] Update kubeconfig: `aws eks update-kubeconfig --name yelp-cluster --region $AWS_REGION`
- [ ] Verify kubectl access: `kubectl cluster-info`
- [ ] Check nodes: `kubectl get nodes`

### Option B: Using AWS CLI
- [ ] Create cluster via AWS CLI
- [ ] Wait for ACTIVE status
- [ ] Create node group
- [ ] Wait for nodes to be ready
- [ ] Update kubeconfig
- [ ] Verify kubectl access

### Step 2: Enable OIDC Provider (Optional but recommended)
- [ ] Enable OIDC provider for cluster
- [ ] Verify provider in IAM Console

### Step 3: Verify Cluster
- [ ] Cluster status is ACTIVE
- [ ] All nodes are Ready
- [ ] kube-system pods are running
- [ ] Can run: `kubectl get pods -n kube-system`

---

## Phase 4: Kubernetes Deployment (30-45 minutes)

### Step 1: Create Namespace
- [ ] Create yelp namespace: `kubectl create namespace yelp`
- [ ] Verify namespace: `kubectl get namespace yelp`

### Step 2: Create ECR Secret
- [ ] Create docker-registry secret for ECR access
- [ ] Verify secret: `kubectl get secret -n yelp`
- [ ] Update Kubernetes manifests to use imagePullSecrets

### Step 3: Update Kubernetes Manifests
- [ ] Update all image references to ECR URLs
- [ ] Verify image paths in YAML files
- [ ] Update container image registry references

### Step 4: Create ConfigMap
- [ ] Create app-config ConfigMap with:
  - [ ] MONGO_URI
  - [ ] MONGO_DB_NAME
  - [ ] KAFKA_BROKER
  - [ ] CORS_ORIGINS
- [ ] Verify ConfigMap: `kubectl get configmap -n yelp`

### Step 5: Create Secrets
- [ ] Generate JWT_SECRET_KEY
- [ ] Create app-secrets with:
  - [ ] JWT_SECRET_KEY
  - [ ] TAVILY_API_KEY
  - [ ] GEMINI_API_KEY
  - [ ] HF_API_TOKEN
- [ ] Verify Secrets: `kubectl get secret -n yelp`

### Step 6: Deploy Infrastructure Services
- [ ] Deploy MongoDB (deployment, service, PVC)
- [ ] Verify MongoDB: `kubectl get pods -n yelp | grep mongodb`
- [ ] Wait for MongoDB to be ready
- [ ] Deploy Zookeeper (deployment, service)
- [ ] Verify Zookeeper: `kubectl get pods -n yelp | grep zookeeper`
- [ ] Deploy Kafka (deployment, service)
- [ ] Verify Kafka: `kubectl get pods -n yelp | grep kafka`

### Step 7: Deploy Application Services
- [ ] Deploy user-service
- [ ] Deploy restaurant-service
- [ ] Deploy restaurant-owner-service
- [ ] Deploy review-service
- [ ] Verify all services running: `kubectl get pods -n yelp`

### Step 8: Deploy Frontend
- [ ] Deploy frontend deployment
- [ ] Deploy frontend service (LoadBalancer)
- [ ] Wait for external IP: `kubectl get svc frontend -n yelp`

### Step 9: (Optional) Deploy Ingress
- [ ] Install NGINX Ingress Controller
- [ ] Create Ingress resource
- [ ] Verify Ingress: `kubectl get ingress -n yelp`
- [ ] Get Ingress IP/hostname

---

## Phase 5: Verification & Testing (15-30 minutes)

### Step 1: Check Cluster Health
- [ ] All pods running: `kubectl get pods -n yelp`
- [ ] All services created: `kubectl get svc -n yelp`
- [ ] No pods in CrashLoopBackOff state
- [ ] No ImagePullBackOff errors

### Step 2: Check Service Connectivity
- [ ] MongoDB accessible from services
- [ ] Kafka accessible from services
- [ ] Services can communicate with each other

**Test:**
```bash
kubectl exec -it <pod-name> -n yelp -- nslookup mongodb
```

### Step 3: Port Forward & Test Endpoints
- [ ] Port forward user-service
- [ ] Test /health endpoint
- [ ] Test /docs endpoint (Swagger)
- [ ] Port forward other services
- [ ] Test all health endpoints

### Step 4: Test API Endpoints
- [ ] Sign up endpoint works
- [ ] Login endpoint works
- [ ] Get restaurants endpoint works
- [ ] Get reviews endpoint works

### Step 5: Get Frontend URL
- [ ] Frontend LoadBalancer has external IP
- [ ] Frontend accessible via browser
- [ ] Frontend communicates with API

### Step 6: Monitor Logs
- [ ] Check MongoDB logs
- [ ] Check service logs
- [ ] Look for any errors
- [ ] Verify Kafka topics created

**Commands:**
```bash
kubectl logs deployment/user-service -n yelp
kubectl logs deployment/mongodb -n yelp
```

---

## Phase 6: Post-Deployment (Optional)

### Step 1: Setup Monitoring
- [ ] Enable CloudWatch Container Insights
- [ ] Create CloudWatch dashboards
- [ ] Setup CloudWatch alarms

### Step 2: Setup Backups
- [ ] Configure MongoDB backups
- [ ] Setup snapshot schedule

### Step 3: Setup Auto-Scaling
- [ ] Install Metrics Server
- [ ] Create HPA for services
- [ ] Set CPU/Memory thresholds

### Step 4: Setup SSL/TLS
- [ ] Request certificate from ACM
- [ ] Setup certificate in LoadBalancer
- [ ] Force HTTPS redirect

### Step 5: Setup CI/CD
- [ ] Configure GitHub Actions or CodePipeline
- [ ] Setup automated builds
- [ ] Setup automated deployments

---

## Troubleshooting Checklist

### If Images Fail to Pull
- [ ] Verify ECR login
- [ ] Check image URL format
- [ ] Verify imagePullSecrets exists
- [ ] Check IAM permissions

### If Services Can't Start
- [ ] Check pod logs: `kubectl logs <pod-name> -n yelp`
- [ ] Check pod events: `kubectl describe pod <pod-name> -n yelp`
- [ ] Check image exists in ECR
- [ ] Check resource limits

### If Services Can't Communicate
- [ ] Verify DNS: `kubectl exec -it <pod-name> -- nslookup service-name`
- [ ] Check network policy
- [ ] Verify service selectors
- [ ] Check security groups

### If Database Connection Fails
- [ ] Verify MongoDB pod is running
- [ ] Port forward to MongoDB
- [ ] Test connection with mongosh
- [ ] Check MONGO_URI in ConfigMap

### If Frontend Can't Load
- [ ] Check frontend pod logs
- [ ] Verify API base URL configuration
- [ ] Check CORS settings
- [ ] Verify LoadBalancer has external IP

---

## Cost Estimation

### Monthly AWS Costs (Approximate)
- EKS Cluster: $0.10/hour (~$73/month)
- EC2 Nodes (3x t3.medium): ~$0.04/hour each (~$90/month)
- MongoDB Storage (20GB): ~$2/month
- Kafka Brokers: included in EC2
- Data Transfer: ~$0.02/GB (varies)
- CloudWatch Logs: ~$0.50-$5/month

**Total Estimated: $200-300/month for small deployment**

### Cost Optimization
- Use spot instances for cost reduction
- Scale down nodes during off-hours
- Use RDS for MongoDB instead of EC2 deployment
- Use managed Kafka from MSK instead

---

## Cleanup Commands

When done with testing:

```bash
# Delete namespace (deletes all resources in it)
kubectl delete namespace yelp

# Delete EKS cluster
eksctl delete cluster --name yelp-cluster --region us-east-1

# Delete ECR repositories
aws ecr delete-repository --repository-name yelp/user-service --force

# Delete VPC
aws ec2 delete-vpc --vpc-id vpc-xxxxx

# Delete IAM roles
aws iam delete-role --role-name yelp-eks-cluster-role
```

---

## Quick Reference Commands

### Kubernetes Commands
```bash
# View all resources
kubectl get all -n yelp

# View specific resource type
kubectl get pods -n yelp
kubectl get svc -n yelp
kubectl get deployment -n yelp

# View resource details
kubectl describe pod <pod-name> -n yelp
kubectl describe svc <service-name> -n yelp

# View logs
kubectl logs deployment/user-service -n yelp
kubectl logs -f deployment/user-service -n yelp  # stream

# Execute command in pod
kubectl exec -it <pod-name> -n yelp -- /bin/bash

# Port forward
kubectl port-forward svc/user-service 8001:8001 -n yelp

# Apply manifests
kubectl apply -f k8s/

# Delete resources
kubectl delete -f k8s/

# Scale deployment
kubectl scale deployment/user-service --replicas=3 -n yelp
```

### AWS Commands
```bash
# EKS
aws eks list-clusters --region us-east-1
aws eks describe-cluster --name yelp-cluster --region us-east-1

# ECR
aws ecr list-images --repository-name yelp/user-service --region us-east-1

# EC2
aws ec2 describe-instances --region us-east-1

# IAM
aws iam list-roles
aws iam list-policies
```

### Docker Commands
```bash
# Build image
docker build -t repo/image:tag .

# Push image
docker push repo/image:tag

# Login to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY

# View images
docker image ls

# Remove image
docker image rm image:tag
```

---

## Support & Resources

### Documentation
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [eksctl Documentation](https://eksctl.io/)

### Useful Links
- AWS Console: https://console.aws.amazon.com/
- EKS Pricing: https://aws.amazon.com/eks/pricing/
- EC2 Pricing: https://aws.amazon.com/ec2/pricing/

### Common Issues
- ImagePullBackOff: Usually ECR login or permissions issue
- CrashLoopBackOff: Check pod logs and env variables
- Pending pods: Usually waiting for resources or image pull
- Connection refused: Usually service not ready or wrong port

---

## Sign-Off

- [ ] All checklist items completed
- [ ] Application deployed successfully
- [ ] All services running and healthy
- [ ] Frontend accessible and functional
- [ ] API endpoints responding correctly
- [ ] Monitoring and logging configured
- [ ] Documentation updated
- [ ] Team notified of deployment

**Deployment Date:** ________________
**Deployed By:** ________________
**Notes:** ____________________________________________________________________
