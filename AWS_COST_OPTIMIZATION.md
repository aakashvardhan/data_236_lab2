# AWS Deployment - Cost Optimization & Best Practices

## Cost Analysis

### Current Configuration (3x t3.medium nodes)
```
╔════════════════════════════════════════════════════════════╗
║                    MONTHLY COSTS                           ║
╠════════════════════════════════════════════════════════════╣
║ EKS Control Plane        │ $0.10/hour  │      $73/month   ║
║ EC2 Nodes (3x t3.medium) │ $0.04/hour  │      $90/month   ║
║ EBS Storage (MongoDB)    │ $0.10/GB    │       $2/month   ║
║ Data Transfer (egress)   │ $0.02/GB    │       ~$5/month  ║
║ CloudWatch Logs          │ $0.50/GB    │       ~$1/month  ║
╠════════════════════════════════════════════════════════════╣
║ TOTAL                    │             │     ~$170/month  ║
╚════════════════════════════════════════════════════════════╝
```

---

## Cost Optimization Strategies

### 1. Use Spot Instances (-70% cost)

**Before:**
```bash
eksctl create cluster \
  --node-type t3.medium \
  --nodes 3
```

**After (with spot instances):**
```bash
eksctl create cluster \
  --node-type t3.medium \
  --nodes 1 \
  --spot
```

**Cost savings:**
- Regular t3.medium: ~$30/month per node
- Spot t3.medium: ~$9/month per node
- **Savings: $60/month with 2 spot instances**

**Tradeoff:** Spot instances can be interrupted (but good for dev/test)

### 2. Right-size Node Type

**Cost comparison (1 hour):**
```
t3.nano    ($0.0104)     - Too small for app
t3.micro   ($0.0208)     - Minimum viable
t3.small   ($0.0416)     - Better
t3.medium  ($0.0416)     - Recommended ← Current
t3.large   ($0.0832)     - Overkill
```

**Recommendation:** t3.small if only testing, t3.medium for demo

### 3. Auto-scaling Instead of Fixed Nodes

**Before:**
```bash
--nodes 3 --nodes-min 2 --nodes-max 5
# Always runs 3 nodes even if not needed
```

**After (with Horizontal Pod Autoscaler):**
```bash
--nodes 1 --nodes-min 1 --nodes-max 5
# Scales up only when needed
```

**Setup HPA:**
```bash
kubectl autoscale deployment user-service \
  --min=1 --max=3 \
  --cpu-percent=70 \
  -n yelp
```

**Cost savings: ~$60/month**

### 4. Schedule Cluster Shutdown

**Turn off nodes during off-hours:**
```bash
# Delete nodes at 6 PM
kubectl delete nodes -l node-group=yelp-nodes

# Recreate at 8 AM
eksctl create nodegroup \
  --cluster yelp-cluster \
  --name off-hours-nodes \
  --nodes 1
```

**Better approach: Use AWS Lambda + CloudWatch Events**

**Potential savings: 50% if off for 12 hours daily**

### 5. Use RDS for MongoDB Instead of EC2

**Current (MongoDB on EC2):**
- 3x t3.medium nodes: $90/month
- EBS storage: $2/month
- **Total: $92/month**

**Alternative (AWS DocumentDB - MongoDB-compatible):**
```bash
# Single-instance DocumentDB
# Cost: ~$100-150/month (but managed!)
```

**Recommendation:** For production, DocumentDB is better (managed backups, HA, scaling)

### 6. Use AWS Managed Kafka (MSK)

**Current (Kafka on EC2):**
- Shared EC2 nodes: ~$30/month
- EBS storage: ~$5/month
- **Total: $35/month + management overhead**

**Alternative (AWS MSK):**
```bash
# Single broker MSK: ~$70/month
# But includes: HA, backups, monitoring, scaling
```

**Recommendation:** For dev/test, current setup OK. For production, consider MSK.

---

## Cost Optimization Implementation

### Option 1: Minimal Cost Setup (Development)
```bash
# Use spot instance, single node, small DB
eksctl create cluster \
  --name yelp-cluster \
  --nodegroup-name yelp-nodes \
  --node-type t3.micro \
  --nodes 1 \
  --nodes-min 1 \
  --nodes-max 2 \
  --spot \
  --managed
```

**Estimated cost: $30-50/month**

### Option 2: Balanced Setup (Testing/Demo)
```bash
# Use on-demand, 2 nodes for HA, auto-scaling
eksctl create cluster \
  --name yelp-cluster \
  --nodegroup-name yelp-nodes \
  --node-type t3.small \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed \
  --with-oidc
```

**Estimated cost: $80-120/month**

### Option 3: Production Setup (Highly Available)
```bash
# Mix of spot + on-demand, multiple AZs, monitoring
eksctl create cluster \
  --name yelp-cluster \
  --nodegroup-name yelp-nodes \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed \
  --with-oidc \
  --zones us-east-1a,us-east-1b,us-east-1c

# Add spot node group
eksctl create nodegroup \
  --cluster yelp-cluster \
  --name yelp-spot \
  --node-type t3.medium \
  --nodes 2 \
  --spot
```

**Estimated cost: $250-350/month + managed services**

---

## Monthly Cost Breakdown by Optimization

```
╔════════════════════════════════════════════════════════════╗
║  Configuration              │  Cost/Month  │  Savings      ║
╠════════════════════════════════════════════════════════════╣
║  Current (3x t3.med)        │   $170       │  Baseline     ║
║  + Use 1 spot instance      │   $140       │  -18%         ║
║  + Use t3.small nodes       │   $110       │  -35%         ║
║  + All of above             │    $80       │  -53%         ║
║  + Shut down at night       │    $40       │  -76%         ║
║  + Use RDS DocumentDB       │   $120       │  -30%         ║
║  + Use AWS MSK              │   $200       │  +18% (HA)    ║
╚════════════════════════════════════════════════════════════╝
```

---

## AWS Budgets & Alerts

### Setup Budget Alert
```bash
# Create $200/month budget with alert at $150
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "yelp-cluster",
    "BudgetLimit": {
      "Amount": "200",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'

# Add notification
aws budgets create-notification \
  --account-id 123456789012 \
  --budget-name yelp-cluster \
  --notification '{
    "NotificationType": "FORECASTED",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 150
  }'
```

### Monitor Costs in AWS Console
1. Go to AWS Cost Management > Cost Explorer
2. Filter by:
   - Service: EC2, EKS, ECR
   - Tag: yelp (if tagged)
3. Set alerts for cost anomalies

---

## Deletion Checklist (STOP CHARGES)

**IMPORTANT:** Delete all resources when not using!

```bash
# Step 1: Delete Kubernetes namespace (releases LoadBalancer)
kubectl delete namespace yelp

# Step 2: Delete EKS cluster (nodes terminate automatically)
eksctl delete cluster --name yelp-cluster --region us-east-1

# Step 3: Delete ECR repositories
aws ecr delete-repository --repository-name yelp/user-service --force --region us-east-1
aws ecr delete-repository --repository-name yelp/restaurant-service --force --region us-east-1
aws ecr delete-repository --repository-name yelp/restaurant-owner-service --force --region us-east-1
aws ecr delete-repository --repository-name yelp/review-service --force --region us-east-1
aws ecr delete-repository --repository-name yelp/frontend --force --region us-east-1

# Step 4: Delete VPC endpoints and gateways
aws ec2 describe-internet-gateways --region us-east-1
aws ec2 detach-internet-gateway --internet-gateway-id igw-xxxxx --vpc-id vpc-xxxxx
aws ec2 delete-internet-gateway --internet-gateway-id igw-xxxxx

# Step 5: Delete VPC
aws ec2 delete-vpc --vpc-id vpc-xxxxx --region us-east-1

# Step 6: Verify all deleted
aws eks list-clusters --region us-east-1
aws ecr describe-repositories --region us-east-1
```

---

## Best Practices

### 1. Use Labels & Tags
```bash
# Tag cluster on creation
eksctl create cluster \
  --tags "project=yelp,environment=dev,owner=khushi"

# Track costs by project
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --filter file://filter.json \
  --metrics UnblendedCost
```

### 2. Regular Cost Audits
- Check AWS Cost Explorer weekly
- Review unused resources monthly
- Delete non-essential clusters

### 3. Resource Requests & Limits
```yaml
# In deployments: set proper resource requests
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### 4. Reserved Instances (Long-term)
- For production, buy 1-year reserved capacity
- Saves 25-50% on EC2 costs

### 5. Spot Fleet for non-critical workloads
- Use mix of 70% spot + 30% on-demand
- Auto-scaling handles interruptions

---

## Quick Cost-Saving Script

```bash
#!/bin/bash
# Reduce deployment to minimum viable

# Scale all deployments to 1 replica
kubectl scale deployment user-service --replicas=1 -n yelp
kubectl scale deployment restaurant-service --replicas=1 -n yelp
kubectl scale deployment restaurant-owner-service --replicas=1 -n yelp
kubectl scale deployment review-service --replicas=1 -n yelp
kubectl scale deployment frontend --replicas=1 -n yelp
kubectl scale deployment mongodb --replicas=1 -n yelp
kubectl scale deployment kafka --replicas=1 -n yelp
kubectl scale deployment zookeeper --replicas=1 -n yelp

# Remove node group extra nodes
eksctl scale nodegroup \
  --cluster yelp-cluster \
  --name yelp-nodes \
  --nodes 1 \
  --nodes-min 1 \
  --nodes-max 2

echo "Cost optimization applied!"
```

---

## Monthly Billing Breakdown

### Where AWS Charges Come From

1. **EKS Control Plane** ($73/month)
   - Not negotiable, flat rate per cluster
   - One cluster handles all services

2. **EC2 Compute** ($90/month)
   - Varies by node type and count
   - Biggest cost opportunity
   - Cut in half with spot instances

3. **EBS Storage** ($2/month)
   - MongoDB persistent volume
   - Minimal for this app

4. **Data Transfer** ($5/month)
   - Egress from AWS to internet
   - Minimal for internal traffic

5. **CloudWatch** ($1/month)
   - Logs and monitoring
   - Minimal

### Optimization Priority
1. **#1 Priority:** Right-size EC2 nodes (biggest savings)
2. **#2 Priority:** Use spot instances
3. **#3 Priority:** Auto-scaling on/off
4. **#4 Priority:** Schedule shutdowns
5. **#5 Priority:** Managed services (better long-term)

---

## Cost Calculator Template

```
Your Configuration:
─────────────────
Node Type: ___________
Node Count: ___________
Spot Instances: Yes / No
Region: ___________
Storage: ___________

Estimated Monthly Cost:
─────────────────
EKS: $73
EC2: $ _________ (node_cost × node_count × 730 hours)
Storage: $ _________
Data Transfer: $ _________
─────────────────
TOTAL: $ _________
```

---

## Recommendations for Your Lab

**For Lab/Demo (Minimize Cost):**
```bash
# Deploy once, delete immediately after testing
# Don't leave running overnight

eksctl create cluster --name yelp-cluster --nodes 1 --node-type t3.micro --spot
# Do testing
eksctl delete cluster --name yelp-cluster
```

**Estimated lab cost: $5-10 per session**

**For Continuous Development:**
```bash
# Keep cluster running during week, shutdown on weekends

# Friday night:
eksctl update cluster --name yelp-cluster --scaling-min 0

# Monday morning:
eksctl update cluster --name yelp-cluster --scaling-min 1
```

**Estimated weekly cost: $60-80**

---

## Free AWS Services to Use

- AWS Free Tier (12 months for new accounts)
- CloudWatch (limited free tier)
- CloudFormation (no charge for service)
- AWS Systems Manager (free tier)
- VPC NAT Gateway alternative: NAT instances (cheaper)

---

## Dangerous Costs to Avoid

❌ **Leaving cluster running 24/7 for weeks:**
- Cost: $170 × 4 = $680/month

❌ **Using large node types (t3.large):**
- Cost: $0.08/hour × 730 = $60/month per node

❌ **Storing large backups in S3:**
- Cost: $0.023/GB × 1000GB = $23/month

❌ **Using expensive managed services without need:**
- RDS: $100+/month vs. EC2 MongoDB: $10/month

❌ **Keeping data transfers to non-AWS services:**
- Cost: $0.02/GB (very expensive)

---

## Summary

| Category | Action | Savings |
|----------|--------|---------|
| **Node Type** | Use t3.small instead of t3.medium | -25% |
| **Spot** | Use 50% spot instances | -35% |
| **Scaling** | Auto-scale 1-3 nodes | -50% |
| **Schedule** | Shutdown at night | -50% |
| **All** | Combine all above | -75% |

**Bottom line: You can reduce costs from $170/month to $40-50/month with optimization!**

---

## Next Steps

1. Deploy with default settings first
2. Test and verify everything works
3. Apply optimizations gradually
4. Monitor costs with AWS Cost Explorer
5. Adjust based on actual usage
6. Delete resources when done testing

Remember: **AWS charges by the second**, so delete when not in use!
