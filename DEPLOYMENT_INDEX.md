# 🚀 DATA_236_LAB2 - Complete Docker + AWS + Kubernetes Deployment Guide

## Welcome! Start Here 👇

This guide provides everything you need to deploy your Yelp microservices application to AWS using Docker and Kubernetes.

---

## 📚 Documentation Structure

### 🎯 START HERE (Choose Your Path)

#### Path 1: I want to deploy NOW (Fastest ⚡)
1. Read: **DEPLOYMENT_SUMMARY.md** (5 min)
2. Run: **./quick-deploy.sh** (60-90 min)
3. Done! ✓

#### Path 2: I want to understand what I'm doing (Learning 📖)
1. Read: **QUICK_START.md** (10 min)
2. Follow: **DEPLOYMENT_GUIDE.md** (Reference as you go)
3. Check: **DEPLOYMENT_CHECKLIST.md** (Track progress)
4. Deploy manually or run scripts

#### Path 3: I want full control (Advanced 🔧)
1. Read: **DEPLOYMENT_GUIDE.md** (Complete reference)
2. Follow step-by-step with your own commands
3. Use **DEPLOYMENT_CHECKLIST.md** to verify each step

---

## 📖 Documentation Files

### Executive Summaries (Read First!)
| File | Purpose | Read Time |
|------|---------|-----------|
| **DEPLOYMENT_SUMMARY.md** | Quick overview and decision matrix | 5 min |
| **QUICK_START.md** | Quick reference guide | 10 min |

### Detailed Guides (Reference While Deploying)
| File | Purpose | Use When |
|------|---------|----------|
| **DEPLOYMENT_GUIDE.md** | Complete 5-phase deployment guide | Following manual path |
| **DEPLOYMENT_CHECKLIST.md** | Detailed progress checklist | Tracking each step |
| **AWS_COST_OPTIMIZATION.md** | Cost saving strategies | Optimizing budget |

---

## 🛠️ Deployment Scripts

### Quick Deploy (One Command)
```bash
./quick-deploy.sh
```
- ✅ Fully automated
- ✅ Handles all steps
- ✅ Progress updates
- ⏱️ 60-90 minutes total

### Interactive Menu (Choose Steps)
```bash
./deploy.sh
```
- ✅ Choose individual steps
- ✅ Can skip or repeat
- ✅ More control
- ⏱️ 60-90 minutes total

### Manual (Full Control)
- Follow DEPLOYMENT_GUIDE.md
- Run commands yourself
- ⏱️ 1-2 hours total

---

## 🏗️ Your Application Architecture

```
Frontend (React)
    ↓ HTTP
    ↓ (nginx reverse proxy)
    ↓
    +-- User Service         (Port 8001)
    +-- Restaurant Service   (Port 8002)
    +-- Owner Service        (Port 8003)
    +-- Review Service       (Port 8004)
    ↓
    +-- MongoDB              (Port 27017)
    +-- Kafka                (Port 9092)
    +-- Zookeeper            (Port 2181)
```

### Services
- **User Service**: Authentication, profiles, favorites, AI assistant
- **Restaurant Service**: Restaurant CRUD and search
- **Owner Service**: Owner dashboard and analytics
- **Review Service**: Review CRUD and rating aggregation
- **Frontend**: React + Redux + TailwindCSS
- **Databases**: MongoDB (all data)
- **Messaging**: Kafka + Zookeeper (async events)

---

## ⏱️ Timeline & Effort

| Phase | Time | Effort |
|-------|------|--------|
| Setup tools | 15 min | Install 4 tools |
| AWS setup | 10 min | Configure credentials |
| Docker build | 15 min | Build container images |
| EKS cluster | 15 min | ⏳ Automated, just wait |
| Deploy services | 15 min | Deploy to Kubernetes |
| Verify | 10 min | Test everything |
| **TOTAL** | **90 min** | **Mostly automated** |

---

## 💰 Cost Analysis

### For Testing (Recommended)
- **Duration**: 1-2 hours
- **Cost**: $5-10
- **How**: Deploy, test, delete immediately

### If Left Running All Month
- **Cost**: ~$170/month
- **Breakdown**:
  - EKS: $73
  - 3 EC2 nodes: $90
  - Storage: $7
- **How to optimize**: See AWS_COST_OPTIMIZATION.md

### Cost-Saving Strategies
- Use spot instances: -70%
- Auto-scaling: -50%
- Shutdown at night: -50%
- **Combined savings: -75% possible!**

---

## ✅ Prerequisites Checklist

### AWS Account
- [ ] AWS account created
- [ ] AWS credentials generated (Access Key ID + Secret Key)
- [ ] `aws configure` run locally
- [ ] Can run `aws sts get-caller-identity` successfully

### Local Tools (macOS)
```bash
# Check installations
docker --version          # Required
kubectl version --client  # Required
aws --version            # Required (v2)
eksctl version          # Required
python3 --version       # Required (for scripts)

# Install missing tools
brew install docker-desktop awscliv2 kubectl weaveworks/tap/eksctl
```

### Project Files
- [ ] Repository cloned locally
- [ ] All Dockerfiles present in services/
- [ ] k8s/ directory with manifests
- [ ] docker-compose.yml exists
- [ ] Scripts: quick-deploy.sh, deploy.sh

### Time & Budget
- [ ] Have 1-2 hours available
- [ ] Budget approved ($5-10 for testing)
- [ ] Internet connection available

---

## 🚀 Getting Started (3 Steps)

### Step 1: Prepare
```bash
# Navigate to project
cd "/Users/khushidonda/Documents/semester-2/distrubuted systems/homeworks/data_236_lab2"

# Verify tools
aws --version
kubectl version --client
docker --version
eksctl version

# Configure AWS
aws configure
# Enter: Access Key ID, Secret Access Key, Default region (us-east-1)
```

### Step 2: Deploy
Choose ONE:

**Option A: Automatic (Fastest)**
```bash
./quick-deploy.sh
# Sit back and watch - fully automated!
```

**Option B: Interactive Menu**
```bash
./deploy.sh
# Follow menu prompts, can choose individual steps
```

**Option C: Manual (Most Control)**
1. Read DEPLOYMENT_GUIDE.md
2. Follow step-by-step commands

### Step 3: Verify & Test
```bash
# Check pods
kubectl get pods -n yelp

# Check services
kubectl get svc -n yelp

# Get frontend URL
kubectl get svc frontend -n yelp

# Test health endpoint
kubectl port-forward svc/user-service 8001:8001 -n yelp &
curl http://localhost:8001/health
```

---

## 🎯 What Gets Deployed

### In AWS
```
AWS Account (Region: us-east-1)
├── ECR Repositories (5)
│   ├── yelp/user-service
│   ├── yelp/restaurant-service
│   ├── yelp/restaurant-owner-service
│   ├── yelp/review-service
│   └── yelp/frontend
│
├── VPC (Virtual Private Cloud)
│   ├── Subnets (2)
│   ├── Internet Gateway
│   └── Security Groups
│
├── EKS Cluster: yelp-cluster
│   ├── Control Plane (AWS-managed)
│   ├── 3x EC2 Worker Nodes (t3.medium)
│   │
│   └── Kubernetes Namespace: yelp
│       ├── Deployments (4 backend services)
│       ├── Frontend (LoadBalancer service)
│       ├── MongoDB (StatefulSet)
│       ├── Kafka (Deployment)
│       ├── Zookeeper (Deployment)
│       ├── ConfigMap (Environment variables)
│       └── Secrets (Credentials)
│
└── CloudWatch
    ├── Cluster logs
    ├── Application logs
    └── Performance metrics
```

---

## 📊 Success Criteria

✅ **Deployment successful when:**

```bash
# All checks pass:
kubectl get pods -n yelp                    # All pods RUNNING
kubectl get svc -n yelp                     # All services created
kubectl port-forward svc/user-service 8001:8001 -n yelp &
curl http://localhost:8001/health           # Returns 200
curl http://localhost:8001/docs              # Swagger UI loads
kubectl logs deployment/user-service -n yelp # No error messages
```

**Frontend test:**
- [ ] Frontend URL accessible in browser
- [ ] Can sign up
- [ ] Can login
- [ ] Can view restaurants
- [ ] Can add review

---

## 🔧 Common Commands

### View Resources
```bash
kubectl get pods -n yelp
kubectl get svc -n yelp
kubectl get deployment -n yelp
kubectl get all -n yelp
```

### View Logs
```bash
kubectl logs deployment/user-service -n yelp
kubectl logs -f deployment/user-service -n yelp      # Stream
kubectl logs deployment/user-service -n yelp --tail=50
```

### Access Services
```bash
# Port forward
kubectl port-forward svc/user-service 8001:8001 -n yelp

# Execute command in pod
kubectl exec -it <pod-name> -n yelp -- bash

# Describe pod (debugging)
kubectl describe pod <pod-name> -n yelp
```

### Scale Services
```bash
kubectl scale deployment/user-service --replicas=3 -n yelp
```

---

## ❌ Cleanup (Very Important!)

**ALWAYS cleanup when done to avoid unexpected charges!**

```bash
# Option 1: Delete namespace (faster)
kubectl delete namespace yelp

# Option 2: Delete entire cluster (complete)
eksctl delete cluster --name yelp-cluster --region us-east-1

# Option 3: Delete everything (nuclear option)
eksctl delete cluster --name yelp-cluster --region us-east-1
aws ecr delete-repository --repository-name yelp/user-service --force --region us-east-1
# (repeat for other repositories)
```

**After cleanup: No charges! ✓**

---

## 🐛 Troubleshooting Quick Links

### Issue: Pods not starting
- Check pod logs: `kubectl logs <pod-name> -n yelp`
- Check pod status: `kubectl describe pod <pod-name> -n yelp`
- See DEPLOYMENT_GUIDE.md → Troubleshooting section

### Issue: Services can't communicate
- Test DNS: `kubectl exec -it <pod-name> -n yelp -- nslookup mongodb`
- Check endpoints: `kubectl get endpoints -n yelp`
- See DEPLOYMENT_GUIDE.md → Troubleshooting section

### Issue: Frontend can't load
- Check frontend logs: `kubectl logs deployment/frontend -n yelp`
- Check LoadBalancer status: `kubectl get svc frontend -n yelp`
- See DEPLOYMENT_GUIDE.md → Troubleshooting section

### Issue: Over budget
- Delete cluster immediately
- See AWS_COST_OPTIMIZATION.md for cost-saving tips

---

## 📚 Documentation Map

```
START HERE (Pick One)
├── DEPLOYMENT_SUMMARY.md      (Quick overview)
├── QUICK_START.md             (Reference guide)
└── This file                  (Index)

THEN READ (Based on Path)
├── Path 1 (Fast): Run quick-deploy.sh immediately
├── Path 2 (Learn): Read DEPLOYMENT_GUIDE.md
└── Path 3 (Manual): Follow step-by-step

REFERENCE WHILE DEPLOYING
├── DEPLOYMENT_CHECKLIST.md    (Track progress)
├── DEPLOYMENT_GUIDE.md        (Detailed steps)
└── AWS_COST_OPTIMIZATION.md  (Save money)

AFTER DEPLOYMENT
├── Test API endpoints
├── Monitor logs
├── Run performance tests
└── Cleanup resources
```

---

## 🎓 Learning Resources

### Understand the Technology
- **Docker**: How containers work
- **Kubernetes**: Orchestration and service management
- **AWS EKS**: Managed Kubernetes on AWS
- **Microservices**: Distributed application architecture

### Recommended Reading
1. Kubernetes basics (15 min): https://kubernetes.io/docs/concepts/
2. EKS overview (10 min): https://docs.aws.amazon.com/eks/
3. Docker containers (15 min): https://docs.docker.com/

### Video Tutorials
- "Kubernetes for Beginners" - 30 minutes
- "AWS EKS Tutorial" - 20 minutes
- "Docker Container Basics" - 25 minutes

---

## 💡 Pro Tips

1. **Test locally first**: `docker-compose up` before deploying to AWS
2. **Use spot instances**: Save 70% on EC2 costs
3. **Monitor costs**: Check AWS Cost Explorer weekly
4. **Delete cluster after testing**: Don't leave idle
5. **Scale gradually**: Start small, increase as needed
6. **Tag resources**: Easy cost tracking by project
7. **Use health checks**: Kubernetes keeps services healthy automatically
8. **Backup data**: MongoDB data persists in AWS storage
9. **Check logs**: Always check logs first when troubleshooting
10. **Use namespaces**: Keeps resources organized

---

## 📞 Support & Questions

### Common Questions

**Q: How long does deployment take?**
A: 60-90 minutes (mostly automated waiting for EKS cluster)

**Q: How much will it cost?**
A: $5-10 for 1-2 hours testing. Delete immediately after.

**Q: Can I deploy locally first?**
A: Yes! Run `docker-compose up` to test locally first.

**Q: What if something breaks?**
A: Check logs, see Troubleshooting section, or reference DEPLOYMENT_GUIDE.md

**Q: Can I scale services?**
A: Yes! `kubectl scale deployment/user-service --replicas=3 -n yelp`

**Q: Is my data safe?**
A: Yes! MongoDB data stored in AWS EBS volumes.

**Q: Can I add more features after deployment?**
A: Yes! Modify code, build new images, redeploy.

---

## 🚦 Quick Decision Matrix

| Situation | Action | Time |
|-----------|--------|------|
| First time deploying | Run quick-deploy.sh | 90 min |
| Want to understand | Read QUICK_START.md then deploy | 100 min |
| Need to debug | Check DEPLOYMENT_GUIDE.md | Varies |
| Over budget | Delete cluster + check costs | 5 min |
| Done testing | Run cleanup script | 5-10 min |

---

## ✨ Next Steps After Deployment

1. ✅ **Verify deployment** - All pods running, services accessible
2. 📱 **Test frontend** - Sign up, create account, browse restaurants
3. 🧪 **Run performance tests** - Use JMeter scripts in jmeter/
4. 🔄 **Implement Kafka** - Add producer/consumer code
5. 🎨 **Add Redux** - Frontend state management
6. 📊 **Monitor performance** - CloudWatch metrics and logs
7. 🔐 **Setup SSL/TLS** - Secure with HTTPS
8. 📈 **Auto-scaling** - Configure HPA for load spikes

---

## 🎉 Final Checklist

**Before Deployment:**
- [ ] AWS account ready
- [ ] Credentials configured
- [ ] Tools installed
- [ ] Project code available
- [ ] Time blocked (90 min)
- [ ] Budget approved

**After Deployment:**
- [ ] Cluster running
- [ ] Services healthy
- [ ] APIs responding
- [ ] Frontend accessible
- [ ] Logs checked
- [ ] Tests passed

**Cleanup:**
- [ ] All resources deleted
- [ ] No charges occurring
- [ ] EKS cluster deleted
- [ ] ECR repos deleted

---

## 📞 Quick Support Links

- **Kubernetes Docs**: https://kubernetes.io/docs/
- **AWS EKS Docs**: https://docs.aws.amazon.com/eks/
- **eksctl Documentation**: https://eksctl.io/
- **Troubleshooting**: See DEPLOYMENT_GUIDE.md

---

## 🎯 TL;DR (Too Long, Didn't Read)

1. **Read**: DEPLOYMENT_SUMMARY.md (5 min)
2. **Run**: `./quick-deploy.sh` (90 min)
3. **Verify**: `kubectl get pods -n yelp` (should show all RUNNING)
4. **Test**: Get frontend URL and visit in browser
5. **Done!** ✓

**Total time**: ~2 hours  
**Total cost**: $5-10  
**Effort**: Minimal (mostly automated)

---

## 🚀 Ready? Let's Deploy!

### Start Here Based on Your Path:

**🏃 FAST TRACK** → `./quick-deploy.sh`

**📚 LEARNING TRACK** → Read `QUICK_START.md`

**🔧 ADVANCED TRACK** → Follow `DEPLOYMENT_GUIDE.md`

---

**Good luck with your deployment! 🎉**

*For detailed step-by-step instructions, see DEPLOYMENT_GUIDE.md*

*For cost optimization, see AWS_COST_OPTIMIZATION.md*

*Questions? Check Troubleshooting section in DEPLOYMENT_GUIDE.md*
