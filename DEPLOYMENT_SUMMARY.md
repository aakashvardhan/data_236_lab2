# DATA_236_LAB2 - Deployment Guide Executive Summary

## What You Have

A **Yelp-like microservices application** with:
- 5 microservices (user, restaurant, owner, review, frontend)
- MongoDB database
- Apache Kafka messaging
- Docker containerization
- Kubernetes orchestration ready

---

## What You Need to Deploy to AWS

### 1. AWS Account
- Create free account at aws.amazon.com
- Set up billing (free tier for 12 months)

### 2. Local Tools (5 minutes to install)
```bash
brew install docker-desktop awscliv2 kubectl weaveworks/tap/eksctl
```

### 3. Configure AWS
```bash
aws configure
# Enter: AWS Access Key ID, Secret Access Key, default region (us-east-1)
```

---

## Three Ways to Deploy

### ⚡ OPTION 1: Quick Auto-Deploy (RECOMMENDED)
```bash
cd /Users/khushidonda/Documents/semester-2/distrubuted\ systems/homeworks/data_236_lab2
chmod +x quick-deploy.sh
./quick-deploy.sh
```
**Time:** 60-90 minutes (mostly automatic)  
**Cost:** ~$5-10 for testing  
**Effort:** Minimal

---

### 📋 OPTION 2: Interactive Menu
```bash
chmod +x deploy.sh
./deploy.sh
# Choose option 8 for full deployment, or pick individual steps
```
**Time:** 60-90 minutes  
**Cost:** ~$5-10 for testing  
**Effort:** Follow menu prompts

---

### 📖 OPTION 3: Manual Step-by-Step
Follow **DEPLOYMENT_GUIDE.md** - 5 phases with detailed commands

**Time:** 1-2 hours  
**Cost:** ~$5-10 for testing  
**Effort:** Manual commands required

---

## What Gets Created

```
AWS Cloud
├── ECR Registry (container images)
├── VPC (networking)
├── EKS Cluster with 3 EC2 nodes
├── Kubernetes Namespace with:
│   ├── User Service
│   ├── Restaurant Service
│   ├── Owner Service
│   ├── Review Service
│   ├── Frontend (with LoadBalancer)
│   ├── MongoDB
│   ├── Kafka
│   └── Zookeeper
└── CloudWatch (monitoring)
```

---

## Timeline

| Step | Duration | What |
|------|----------|------|
| Prerequisites | 5 min | Check tools |
| Docker build & push | 15 min | Build container images |
| EKS cluster creation | **20 min** | ⏳ Longest step |
| Deploy services | 15 min | Deploy to Kubernetes |
| Verification | 10 min | Test everything |
| **TOTAL** | **60-90 min** | One-time setup |

---

## Cost

**For Testing:** $5-10 per session (1-2 hours)

**Monthly (if left running):** ~$170/month
- EKS: $73
- 3 EC2 nodes: $90
- Storage/Data: $7

**Cost Optimization Available:** Reduce to $40-50/month (see AWS_COST_OPTIMIZATION.md)

---

## Files You Need

### Start Here 👇
1. **QUICK_START.md** ← Read this first for overview
2. **DEPLOYMENT_GUIDE.md** ← Complete step-by-step guide
3. **DEPLOYMENT_CHECKLIST.md** ← Track your progress

### Scripts
4. **quick-deploy.sh** ← Run this (automated)
5. **deploy.sh** ← Or this (interactive menu)

### Reference
6. **AWS_COST_OPTIMIZATION.md** ← Save money
7. This file (executive summary)

---

## Before You Start

- [ ] AWS account created
- [ ] AWS credentials configured (`aws configure`)
- [ ] Docker, kubectl, AWS CLI, eksctl installed
- [ ] Have 1-2 hours available
- [ ] Ready to spend $5-10 on testing

---

## Quick Start (5-step overview)

**Step 1: Login to AWS**
```bash
aws configure
```

**Step 2: Create Container Registry (ECR)**
```bash
aws ecr create-repository --repository-name yelp/user-service
aws ecr create-repository --repository-name yelp/restaurant-service
# ... (done automatically by deploy script)
```

**Step 3: Build & Push Docker Images**
```bash
docker build -t <registry>/yelp/user-service ./services/user-service
docker push <registry>/yelp/user-service
# ... (done automatically by deploy script)
```

**Step 4: Create Kubernetes Cluster**
```bash
eksctl create cluster --name yelp-cluster --nodes 3
# Takes ~15 minutes
```

**Step 5: Deploy Services**
```bash
kubectl apply -f k8s/
# All services automatically deployed
```

---

## After Deployment

### Get Frontend URL
```bash
kubectl get svc frontend -n yelp
# Copy the "EXTERNAL-IP" and visit in browser
```

### Test Health Endpoints
```bash
kubectl port-forward svc/user-service 8001:8001 -n yelp &
curl http://localhost:8001/health
```

### View Logs
```bash
kubectl logs deployment/user-service -n yelp
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `aws: command not found` | Run `aws configure` first |
| `ImagePullBackOff` | ECR login issue, re-run `aws ecr get-login...` |
| `Pending` pods | Waiting for resources, check `kubectl describe pod` |
| `Connection refused` | Port forward: `kubectl port-forward svc/... PORT:PORT` |

---

## Cleanup (Important!)

When done testing:

```bash
# Delete cluster (stops all charges immediately)
eksctl delete cluster --name yelp-cluster --region us-east-1

# Delete container images
aws ecr delete-repository --repository-name yelp/user-service --force
# (repeat for other services)
```

**Cost after cleanup: $0/month** ✓

---

## Success Criteria

✅ Deployment is successful when:
- All 8 pods running: `kubectl get pods -n yelp`
- All services accessible: `kubectl get svc -n yelp`
- Frontend loads in browser
- API health checks pass: `curl http://<service>/health`
- Database connected: MongoDB queries work
- Logs clean: No error messages

---

## Next Steps After Deployment

1. **Test the app** - Sign up, create restaurants, add reviews
2. **Run JMeter** - Performance testing scripts available
3. **Implement Kafka** - Add producer/consumer code
4. **Add Redux** - State management in frontend
5. **Monitor** - Check CloudWatch for performance

---

## Support Resources

| Resource | Purpose |
|----------|---------|
| DEPLOYMENT_GUIDE.md | Detailed step-by-step instructions |
| DEPLOYMENT_CHECKLIST.md | Track progress through deployment |
| AWS_COST_OPTIMIZATION.md | Save money on AWS |
| deploy.sh | Interactive menu deployment |
| quick-deploy.sh | One-command deployment |

---

## Key Points to Remember

🔑 **Important:**
1. **Always delete cluster** when not in use (or charges continue)
2. **AWS charges by the second** - don't leave idle
3. **Deployment takes 60-90 minutes** (mostly automatic)
4. **First deployment is longest** - subsequent updates faster
5. **Test locally first** with `docker-compose up`

📊 **Budget:**
- Lab/testing: $5-10 per session
- Monthly (full time): $170/month
- Optimized: $40-50/month

⏱️ **Timeline:**
- Setup tools: 15 minutes
- Deployment: 60-90 minutes
- Testing: 30 minutes
- Cleanup: 5 minutes

✨ **Result:** Fully deployed microservices app on AWS EKS!

---

## Decision Matrix

**Choose QUICK-DEPLOY if:**
- First time deploying
- Want minimal setup effort
- Don't care about learning each step

**Choose INTERACTIVE MENU (deploy.sh) if:**
- Want to choose which steps to run
- May repeat specific steps
- Want to learn gradually

**Choose MANUAL if:**
- Want complete control
- Learning/educational purpose
- Need to customize behavior

---

## One-Line Summary

**Deploy your entire microservices stack to AWS Kubernetes in 90 minutes with 1 script.**

```bash
./quick-deploy.sh
```

---

## Questions?

### Common Q&A

**Q: Do I need an AWS account?**
A: Yes, but free tier covers testing costs.

**Q: Can I run locally first?**
A: Yes! `docker-compose up` works perfectly for local testing.

**Q: What if deployment fails?**
A: Check logs with `kubectl logs`, see troubleshooting in DEPLOYMENT_GUIDE.md.

**Q: How much will it cost me?**
A: $5-10 for 1-2 hours of testing. Delete cluster after testing.

**Q: Can I scale up later?**
A: Yes! Modify manifests in k8s/ directory and reapply.

**Q: Do I need to run this every time?**
A: No, only for initial deployment. Just redeploy updated images.

---

## Recommended Reading Order

1. **This file** (5 min) - Overview
2. **QUICK_START.md** (10 min) - Quick reference
3. **DEPLOYMENT_CHECKLIST.md** (5 min) - Print and track
4. **Run quick-deploy.sh** or **deploy.sh** (60-90 min)
5. **DEPLOYMENT_GUIDE.md** (reference during deployment)
6. **AWS_COST_OPTIMIZATION.md** (5 min) - Save money

---

## Final Checklist

**Before Running Deployment:**
- [ ] AWS account created and configured
- [ ] `aws configure` completed
- [ ] Tools installed (docker, kubectl, aws, eksctl)
- [ ] Project code available locally
- [ ] Have time available (60-90 minutes)
- [ ] Budget approved (~$5-10)
- [ ] Read QUICK_START.md

**After Deployment:**
- [ ] Cluster created and running
- [ ] All pods healthy
- [ ] Services accessible
- [ ] Frontend loads
- [ ] APIs responding
- [ ] Logs checked for errors
- [ ] Cluster deleted (to save costs)

---

## Quick Reference Commands

```bash
# Deployment
./quick-deploy.sh                    # Full automatic deployment
./deploy.sh                          # Interactive menu
kubectl apply -f k8s/                # Manual deployment

# Monitoring
kubectl get pods -n yelp             # View pods
kubectl get svc -n yelp              # View services
kubectl logs deployment/user-service -n yelp  # View logs

# Access
kubectl port-forward svc/user-service 8001:8001 -n yelp &
curl http://localhost:8001/health    # Test health

# Cleanup
eksctl delete cluster --name yelp-cluster --region us-east-1
```

---

## Summary Table

| Item | Details |
|------|---------|
| **App Type** | Microservices (5 services) |
| **Deployment Target** | AWS EKS (Kubernetes) |
| **Setup Time** | 60-90 minutes |
| **Setup Cost** | $5-10 per session |
| **Monthly Cost** | $170 (can optimize to $40-50) |
| **Prerequisite** | AWS account + local tools |
| **Recommended Method** | Run quick-deploy.sh |
| **Documentation** | DEPLOYMENT_GUIDE.md |
| **Checklist** | DEPLOYMENT_CHECKLIST.md |
| **Optimization** | AWS_COST_OPTIMIZATION.md |

---

**Ready to deploy? Start with QUICK_START.md → then run quick-deploy.sh**

🚀 Good luck with your deployment!
