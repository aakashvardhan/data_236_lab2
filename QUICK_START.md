# Yelp Microservices - Deployment Guide Summary

## Overview

Your **DATA_236_LAB2** project is a Yelp-like microservices application with:

### Current Architecture
```
Frontend (React + Redux)
    ↓ HTTP
    ↓
    +-- User Service (FastAPI)           :8001
    +-- Restaurant Service (FastAPI)     :8002
    +-- Restaurant-Owner Service         :8003
    +-- Review Service (FastAPI)         :8004
    ↓
    +-- MongoDB                          :27017
    +-- Kafka + Zookeeper                :9092
```

### Tech Stack
- **Frontend**: React 19, Redux, TailwindCSS, Vite
- **Backend**: Python 3.11, FastAPI, motor (async MongoDB)
- **Database**: MongoDB 7
- **Messaging**: Apache Kafka 7.5.0 + Zookeeper
- **AI**: LangChain + Google Gemini + Tavily
- **Containers**: Docker + Docker Compose
- **Orchestration**: Kubernetes (EKS on AWS)

---

## Quick Start - Three Options

### Option 1: Automated Quick Deploy (RECOMMENDED - 30-40 minutes)
```bash
cd /Users/khushidonda/Documents/semester-2/distrubuted\ systems/homeworks/data_236_lab2
chmod +x quick-deploy.sh
./quick-deploy.sh
```
**What it does:**
- ✓ Checks prerequisites
- ✓ Creates ECR repositories
- ✓ Builds and pushes Docker images
- ✓ Creates EKS cluster
- ✓ Deploys all services
- ✓ Verifies deployment

### Option 2: Interactive Menu Script (10-40 minutes)
```bash
chmod +x deploy.sh
./deploy.sh
# Select options 1-8 from the menu
# Choose option 8 for full deployment
```

### Option 3: Manual Step-by-Step (1-2 hours)
Follow the detailed guide in **DEPLOYMENT_GUIDE.md** with 5 phases:
1. Docker Setup & Registry
2. AWS Infrastructure
3. Kubernetes Cluster
4. Deploy to EKS
5. Verification & Monitoring

---

## Pre-Deployment Requirements

### AWS Setup
1. **Create AWS Account** (or use existing one)
2. **Create IAM User** with these permissions:
   - EKS (eks:*)
   - EC2 (ec2:*, iam:*)
   - ECR (ecr:*)
   - VPC (ec2:Describe*)

3. **Get AWS Credentials**:
   ```bash
   aws configure
   # Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1)
   ```

### Local Tools (Install on macOS)
```bash
# Docker
brew install docker-desktop  # Download from Docker website

# kubectl
brew install kubectl

# AWS CLI v2
brew install awscliv2

# eksctl
brew install weaveworks/tap/eksctl

# Verify installations
docker --version
kubectl version --client
aws --version
eksctl version
```

---

## Estimated Timeline

| Phase | Duration | What's Happening |
|-------|----------|------------------|
| Prerequisites Check | 5 min | Verify tools installed |
| AWS Setup | 10 min | Configure credentials, create repos |
| Docker Build & Push | 15-20 min | Build and upload images to ECR |
| EKS Cluster Creation | 15-20 min | **LONGEST STEP** - Wait for cluster |
| Kubernetes Deploy | 10-15 min | Deploy services to cluster |
| Verification | 5-10 min | Test everything is working |
| **TOTAL** | **60-90 minutes** | Full deployment |

---

## Cost Breakdown (AWS)

| Service | Monthly Cost |
|---------|-------------|
| EKS Cluster | ~$73 |
| 3x t3.medium EC2 nodes | ~$90 |
| MongoDB Storage | ~$2 |
| Data Transfer | ~$5 |
| CloudWatch Logs | ~$2 |
| **TOTAL** | **~$170/month** |

**Cost Optimization Tips:**
- Use Spot Instances for nodes (-70% cost)
- Scale down nodes at night
- Delete cluster when not in use

---

## Architecture After Deployment

### Local Development (docker-compose)
```bash
docker-compose up --build
# Services available at localhost:PORT
```

### AWS EKS Deployment
```
AWS Cloud
  ├── VPC (10.0.0.0/16)
  │   ├── Public Subnets (2)
  │   ├── Internet Gateway
  │   └── Security Groups
  │
  ├── EKS Cluster
  │   ├── Control Plane (AWS-managed)
  │   ├── Worker Nodes (3x t3.medium EC2)
  │   │
  │   └── Kubernetes Namespace: yelp
  │       ├── user-service
  │       ├── restaurant-service
  │       ├── restaurant-owner-service
  │       ├── review-service
  │       ├── frontend (LoadBalancer)
  │       ├── MongoDB (StatefulSet)
  │       ├── Kafka (Deployment)
  │       └── Zookeeper (Deployment)
  │
  ├── ECR (Container Registry)
  │   ├── yelp/user-service:latest
  │   ├── yelp/restaurant-service:latest
  │   ├── yelp/restaurant-owner-service:latest
  │   ├── yelp/review-service:latest
  │   └── yelp/frontend:latest
  │
  └── CloudWatch (Monitoring & Logs)
```

---

## Step-by-Step Deployment Process

### Phase 1: ECR & Docker (15 min)
**File**: `DEPLOYMENT_GUIDE.md` - Phase 1

1. Get AWS Account ID and create ECR repositories
2. Build Docker images for all services
3. Push images to AWS ECR registry

**Key Command:**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com
```

### Phase 2: AWS Infrastructure (20 min)
**File**: `DEPLOYMENT_GUIDE.md` - Phase 2

1. Create VPC with subnets and Internet Gateway
2. Create Security Groups
3. Create IAM roles for EKS

**Can be skipped** if using `eksctl` which handles this automatically.

### Phase 3: EKS Cluster (15 min)
**File**: `DEPLOYMENT_GUIDE.md` - Phase 3

**Easiest way:**
```bash
eksctl create cluster \
  --name yelp-cluster \
  --region us-east-1 \
  --nodegroup-name yelp-nodes \
  --node-type t3.medium \
  --nodes 3 \
  --managed \
  --with-oidc
```

### Phase 4: Deploy Services (15 min)
**File**: `DEPLOYMENT_GUIDE.md` - Phase 4

1. Create namespace
2. Create ConfigMap and Secrets
3. Deploy MongoDB, Kafka, Zookeeper
4. Deploy 4 backend services
5. Deploy frontend with LoadBalancer

**Deploy all:**
```bash
kubectl create namespace yelp
kubectl apply -f k8s/ -n yelp
```

### Phase 5: Verify (10 min)
**File**: `DEPLOYMENT_GUIDE.md` - Phase 5

1. Check all pods are running
2. Port forward and test health endpoints
3. Get frontend URL
4. Test API endpoints

**Quick verification:**
```bash
kubectl get pods -n yelp          # Should show all running
kubectl get svc -n yelp           # Should show all services
kubectl port-forward svc/user-service 8001:8001 -n yelp &
curl http://localhost:8001/health # Should return 200
```

---

## Important Files Created

### Documentation
1. **`DEPLOYMENT_GUIDE.md`** - Comprehensive 5-phase guide with all commands
2. **`DEPLOYMENT_CHECKLIST.md`** - Detailed checklist to track progress
3. **`ARCHITECTURE.md`** - Architecture and design patterns (in progress)

### Scripts
1. **`quick-deploy.sh`** - One-command full deployment
2. **`deploy.sh`** - Interactive menu with individual steps

### Kubernetes Manifests (Already exist in `k8s/`)
- `configmap.yaml` - Environment configuration
- `secrets.yaml` - Sensitive data
- `mongodb-*.yaml` - MongoDB deployment
- `kafka-*.yaml` - Kafka deployment
- `zookeeper-*.yaml` - Zookeeper deployment
- `*-service-*.yaml` - Application services (user, restaurant, owner, review)
- `frontend-*.yaml` - Frontend deployment

---

## Common Commands After Deployment

### View Resources
```bash
# All pods
kubectl get pods -n yelp

# All services
kubectl get svc -n yelp

# Specific deployment
kubectl describe deployment/user-service -n yelp

# All events (debugging)
kubectl get events -n yelp --sort-by='.lastTimestamp'
```

### View Logs
```bash
# Last 100 lines
kubectl logs deployment/user-service -n yelp --tail=100

# Stream in real-time
kubectl logs -f deployment/user-service -n yelp

# Previous logs (if pod crashed)
kubectl logs deployment/user-service -n yelp --previous
```

### Access Services
```bash
# Port forward to service
kubectl port-forward svc/user-service 8001:8001 -n yelp &

# Test health
curl http://localhost:8001/health

# Stop port forward
fg
# Press Ctrl+C
```

### Scale Services
```bash
# Scale to 3 replicas
kubectl scale deployment/user-service --replicas=3 -n yelp

# Check status
kubectl get deployment/user-service -n yelp
```

---

## Testing the Deployment

### 1. Test Health Endpoints
```bash
# Port forward each service
kubectl port-forward svc/user-service 8001:8001 -n yelp &
kubectl port-forward svc/restaurant-service 8002:8002 -n yelp &

# Test
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### 2. Test API Endpoints
```bash
# Get frontend URL
kubectl get svc frontend -n yelp

# Visit in browser or use curl
curl http://<FRONTEND_URL>
```

### 3. View Service Logs
```bash
kubectl logs deployment/user-service -n yelp
kubectl logs deployment/mongodb -n yelp
kubectl logs deployment/kafka -n yelp
```

### 4. Connect to Database
```bash
# Port forward MongoDB
kubectl port-forward svc/mongodb 27017:27017 -n yelp &

# Connect with mongosh
mongosh mongodb://localhost:27017/yelp_db
```

---

## Troubleshooting

### Problem: Pods stuck in ImagePullBackOff
**Solution:**
```bash
# Check pod details
kubectl describe pod <pod-name> -n yelp

# Fix: Verify ECR secret
kubectl get secret ecr-secret -n yelp -o yaml

# Recreate if needed
kubectl delete secret ecr-secret -n yelp
# Re-create with correct credentials
```

### Problem: Services can't connect
**Solution:**
```bash
# Test DNS resolution
kubectl exec -it <pod-name> -n yelp -- nslookup mongodb

# Check service endpoints
kubectl get endpoints -n yelp

# View service config
kubectl get svc mongodb -n yelp -o yaml
```

### Problem: Frontend loads but API calls fail
**Solution:**
```bash
# Check CORS settings in ConfigMap
kubectl get configmap app-config -n yelp -o yaml

# Check frontend logs
kubectl logs deployment/frontend -n yelp

# Test API directly
kubectl port-forward svc/user-service 8001:8001 -n yelp &
curl http://localhost:8001/
```

### Problem: LoadBalancer stuck in Pending
**Solution:**
```bash
# This is normal on some AWS configurations
# Use port forward instead
kubectl port-forward svc/frontend 80:80 -n yelp

# Or setup Ingress (see DEPLOYMENT_GUIDE.md Phase 4.6)
```

---

## Cleanup When Done

```bash
# Delete all Kubernetes resources
kubectl delete namespace yelp

# Delete EKS cluster (takes ~10 minutes)
eksctl delete cluster --name yelp-cluster --region us-east-1

# Delete ECR repositories
aws ecr delete-repository --repository-name yelp/user-service --force --region us-east-1

# Delete other AWS resources (VPC, IAM, etc.) if created manually
```

---

## Next Steps After Deployment

1. **Implement Kafka Producers/Consumers**
   - Add actual producer/consumer code in services
   - Test async message processing

2. **Add Redux to Frontend**
   - Create Redux store
   - Implement 4 slices: auth, restaurant, review, favourites

3. **Performance Testing**
   - Run JMeter tests (available in `jmeter/`)
   - Test with 100-500 concurrent users

4. **Setup CI/CD Pipeline**
   - GitHub Actions or AWS CodePipeline
   - Automate builds and deployments

5. **Add Monitoring & Alerts**
   - CloudWatch dashboards
   - Automated alerts for failures

6. **Setup SSL/TLS**
   - AWS Certificate Manager
   - HTTPS for frontend

---

## Files Reference

### Main Deployment Files
```
data_236_lab2/
├── DEPLOYMENT_GUIDE.md           ← Start here (comprehensive guide)
├── DEPLOYMENT_CHECKLIST.md       ← Track your progress
├── quick-deploy.sh               ← Run this for automatic deployment
├── deploy.sh                     ← Run this for interactive menu
├── docker-compose.yml            ← Local development
└── k8s/
    ├── configmap.yaml
    ├── secrets.yaml.example
    ├── mongodb-*.yaml
    ├── kafka-*.yaml
    ├── zookeeper-*.yaml
    ├── user-service-*.yaml
    ├── restaurant-service-*.yaml
    ├── restaurant-owner-service-*.yaml
    ├── review-service-*.yaml
    └── frontend-*.yaml
```

### Application Files
```
services/
├── user-service/                 ← Auth, profiles, favorites, AI
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
├── restaurant-service/           ← Restaurant CRUD
│   ├── Dockerfile
│   └── app/
├── restaurant-owner-service/     ← Owner dashboard
│   ├── Dockerfile
│   └── app/
├── review-service/               ← Review CRUD
│   ├── Dockerfile
│   └── app/
└── workers/                      ← Kafka consumers (stubs)
    ├── review-worker/
    ├── restaurant-worker/
    └── user-worker/

frontend/
├── Dockerfile
├── src/
└── public/
```

---

## Support & Resources

### AWS Documentation
- [AWS EKS](https://docs.aws.amazon.com/eks/)
- [AWS ECR](https://docs.aws.amazon.com/ecr/)
- [AWS EC2](https://docs.aws.amazon.com/ec2/)

### Kubernetes Documentation
- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

### Tools
- [eksctl User Guide](https://eksctl.io/)
- [Docker Documentation](https://docs.docker.com/)

---

## Video Walkthrough (Recommended)

If you have time, watch these AWS tutorials:
1. "Getting started with Amazon EKS" - 10 min
2. "ECR push/pull" - 5 min
3. "kubectl basics" - 15 min

---

## Quick Checklist Before Deployment

- [ ] AWS account created and configured
- [ ] `aws configure` run with credentials
- [ ] Docker installed and running
- [ ] kubectl, AWS CLI, eksctl installed
- [ ] Project cloned locally
- [ ] All Dockerfiles exist
- [ ] k8s/ directory has manifests
- [ ] Have 1-2 hours available
- [ ] Budget for ~$200/month during deployment

---

## Final Notes

- **First deployment takes 60-90 minutes** (mostly waiting for EKS to create)
- **Subsequent deployments are faster** (just redeploy images)
- **Always verify health endpoints** after deployment
- **Keep monitoring logs** for any issues
- **Delete cluster when done testing** to avoid unexpected charges

Good luck with your deployment! 🚀

For more details, see **DEPLOYMENT_GUIDE.md** and **DEPLOYMENT_CHECKLIST.md**
