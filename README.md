# Lab 2 — Yelp Prototype: Docker, Kubernetes, Kafka, AWS & Redux

**Course:** Distributed Systems for Data Engineering  
**Due:** April 28, 2026  
**Live URL:** http://k8s-default-frontend-e675211652-e8dab1ef93946b63.elb.us-east-2.amazonaws.com

---

## Architecture

```
Browser
  │
  ▼
Frontend (React + Redux Toolkit)  ← nginx reverse proxy (port 80)
  │
  ├── /api/auth, /api/users, /api/favorites, /api/ai-assistant, /api/uploads
  │       └─► user-service          (FastAPI · port 8001)
  │
  ├── /api/restaurants, /api/uploads/restaurant_photos
  │       └─► restaurant-service    (FastAPI · port 8002)
  │
  ├── /api/owner
  │       └─► restaurant-owner-service (FastAPI · port 8003)
  │
  └── /api/reviews, /api/restaurants/:id/reviews
          └─► review-service        (FastAPI · port 8004)

All API services → publish events → Kafka (port 9092)
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                   review-worker  restaurant-worker  user-worker
                          │             │             │
                          └─────────────┴─────────────┘
                                        │
                                   MongoDB (port 27017)
```

---

## Tech Stack

| Layer          | Technology                                        |
|----------------|---------------------------------------------------|
| Frontend       | React 19, Redux Toolkit, Vite, TailwindCSS, Axios |
| Backend        | Python 3.11, FastAPI, motor (async MongoDB)       |
| Database       | MongoDB 7 (persistent via EBS PVC)                |
| Messaging      | Apache Kafka 7.5.0 + Zookeeper                    |
| AI Assistant   | LangChain ReAct · Google Gemini · Tavily Search   |
| Containers     | Docker (multi-platform linux/amd64), docker-compose |
| Orchestration  | Kubernetes (AWS EKS Auto Mode, Karpenter)         |
| Registry       | AWS ECR (us-east-2)                               |
| Load Balancer  | AWS ELB (provisioned by EKS)                      |
| Performance    | Apache JMeter                                     |

---

## Project Structure

```
data_236_lab2/
├── docker-compose.yml
├── k8s/                              # Kubernetes manifests
│   ├── configmap.yaml
│   ├── secrets.yaml.example          # Copy to secrets.yaml and fill values (gitignored)
│   ├── storageclass.yaml
│   ├── mongodb-{deployment,service,pvc}.yaml
│   ├── kafka-{deployment,service}.yaml
│   ├── zookeeper-{deployment,service}.yaml
│   ├── user-service-{deployment,service}.yaml
│   ├── restaurant-service-{deployment,service}.yaml
│   ├── restaurant-uploads-pvc.yaml
│   ├── restaurant-owner-service-{deployment,service}.yaml
│   ├── review-service-{deployment,service}.yaml
│   ├── {review,restaurant,user}-worker-deployment.yaml
│   └── frontend-{deployment,service}.yaml
├── services/
│   ├── user-service/                 # Auth, profiles, favorites, AI assistant
│   ├── restaurant-service/           # Restaurant CRUD, search, photo upload
│   ├── restaurant-owner-service/     # Owner dashboard, analytics, claim
│   ├── review-service/               # Review CRUD
│   └── workers/
│       ├── review-worker/            # Consumes review.* topics
│       ├── restaurant-worker/        # Consumes restaurant.* topics
│       └── user-worker/              # Consumes user.* topics
├── frontend/                         # React + Redux Toolkit + TailwindCSS
│   ├── src/
│   │   ├── store/                    # Redux store + slices
│   │   │   ├── authSlice.js
│   │   │   ├── restaurantSlice.js
│   │   │   ├── reviewSlice.js
│   │   │   └── favouritesSlice.js
│   │   ├── pages/
│   │   └── services/api.js
│   ├── nginx.conf                    # Reverse proxy config (production)
│   └── Dockerfile
├── jmeter/
│   ├── test-plan.jmx                 # JMeter test plan
│   ├── results/                      # CSV results and dashboards
│   └── README.md
├── scripts/
│   ├── migrate_mysql_to_mongo.py
│   └── create_kafka_topics.sh
├── seed_images.py                    # Seed restaurant photos from Unsplash
└── README.md
```

---

## Prerequisites

- Docker Desktop with BuildKit
- `kubectl` configured for your cluster
- `aws` CLI authenticated (`aws configure`)
- Node.js 18+ (local frontend dev only)
- Python 3.11+ (local backend dev only)

---

## Running Locally (Docker Compose)

```bash
# 1. Clone the repository
git clone git@github.com:aakashvardhan/data_236_lab2.git
cd data_236_lab2

# 2. Copy and fill secrets
cp k8s/secrets.yaml.example k8s/secrets.yaml
# Edit k8s/secrets.yaml with base64-encoded values for:
# JWT_SECRET_KEY, GEMINI_API_KEY, TAVILY_API_KEY, HF_API_TOKEN

# 3. Start all services
docker-compose up --build

# 4. Create Kafka topics (separate terminal)
docker-compose exec kafka bash /scripts/create_kafka_topics.sh

# 5. Seed restaurant images (optional)
docker-compose cp seed_images.py restaurant-service:/tmp/seed_images.py
docker-compose exec restaurant-service python /tmp/seed_images.py
```

**Local service URLs:**

| Service                  | URL                          |
|--------------------------|------------------------------|
| Frontend                 | http://localhost:5173        |
| User Service             | http://localhost:8001/docs   |
| Restaurant Service       | http://localhost:8002/docs   |
| Restaurant Owner Service | http://localhost:8003/docs   |
| Review Service           | http://localhost:8004/docs   |
| MongoDB                  | mongodb://localhost:27017    |
| Kafka                    | localhost:9092               |

---

## AWS EKS Deployment

### 1. Configure AWS and kubectl

```bash
aws configure   # region: us-east-2

aws eks update-kubeconfig --region us-east-2 --name yelp-k8s

aws ecr get-login-password --region us-east-2 \
  | docker login --username AWS --password-stdin \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-2.amazonaws.com
```

### 2. Build and Push Images

```bash
ECR=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-2.amazonaws.com

for svc in user-service restaurant-service restaurant-owner-service review-service; do
  docker build --platform linux/amd64 -t $ECR/$svc:latest services/$svc
  docker push $ECR/$svc:latest
done

for worker in review-worker restaurant-worker user-worker; do
  docker build --platform linux/amd64 -t $ECR/$worker:latest services/workers/$worker
  docker push $ECR/$worker:latest
done

docker build --platform linux/amd64 -t $ECR/frontend:latest frontend
docker push $ECR/frontend:latest
```

### 3. Deploy to Kubernetes

```bash
# Fill in secrets first
cp k8s/secrets.yaml.example k8s/secrets.yaml
# Edit k8s/secrets.yaml with real base64-encoded values

kubectl apply -f k8s/storageclass.yaml
kubectl apply -f k8s/

# Watch pods come up
kubectl get pods -w

# Get the public URL
kubectl get svc frontend
```

### 4. Seed Restaurant Images (after first deploy)

```bash
POD=$(kubectl get pod -l app=restaurant-service -o jsonpath='{.items[0].metadata.name}')
kubectl cp seed_images.py $POD:/tmp/seed_images.py
kubectl exec $POD -- python3 /tmp/seed_images.py
```

---

## Kafka Architecture

Producers (API services) publish events; consumers (worker services) process them asynchronously. Kafka errors are logged but never propagate to HTTP responses — the API always succeeds if the data was saved to MongoDB.

```
Review API  ──► review.created   ──► Review Worker  ──► MongoDB activity_logs
            ──► review.updated
            ──► review.deleted

Restaurant  ──► restaurant.created ──► Restaurant Worker
API         ──► restaurant.updated
            ──► restaurant.claimed

User API    ──► user.created     ──► User Worker
            ──► user.updated
```

**Kafka Topics:**

| Topic                | Producer                     | Consumer                    |
|----------------------|------------------------------|-----------------------------|
| `review.created`     | Review API Service           | Review Worker               |
| `review.updated`     | Review API Service           | Review Worker               |
| `review.deleted`     | Review API Service           | Review Worker               |
| `restaurant.created` | Restaurant API Service       | Restaurant Worker           |
| `restaurant.updated` | Restaurant API Service       | Restaurant Worker           |
| `restaurant.claimed` | Restaurant Owner Service     | Restaurant Worker           |
| `user.created`       | User API Service             | User Worker                 |
| `user.updated`       | User API Service             | User Worker                 |

---

## MongoDB Schema

| Collection              | Description                                         | Key Indexes                                         |
|-------------------------|-----------------------------------------------------|-----------------------------------------------------|
| `users`                 | Accounts, profiles, preferences (bcrypt passwords)  | `email` (unique)                                    |
| `restaurants`           | Restaurant listings and metadata                    | `name`, `city`                                      |
| `reviews`               | User reviews with rating and comment                | `restaurant_id`; `(user_id, restaurant_id)` unique  |
| `favorites`             | User-saved restaurants                              | `(user_id, restaurant_id)` unique                   |
| `sessions`              | JWT sessions with 24h TTL auto-expiry               | `token` (unique), `created_at` (TTL index)          |
| `activity_logs`         | Event log populated by Kafka workers                | `user_id`, `created_at` (TTL 90d)                   |
| `conversation_messages` | AI assistant chat history per user session          | `(user_id, session_id)`                             |

Passwords are hashed with **bcrypt** (passlib). Sessions are stored in MongoDB with a TTL index for automatic expiry.

---

## Redux State Management

Redux Toolkit manages four slices:

| Slice             | State Managed                                          |
|-------------------|--------------------------------------------------------|
| `authSlice`       | JWT token, current user profile, login/logout flow     |
| `restaurantSlice` | Restaurant list, search filters, selected restaurant   |
| `reviewSlice`     | Reviews per restaurant, submit/update/delete status    |
| `favouritesSlice` | User's saved restaurant list                           |

All async operations use `createAsyncThunk` with `unwrap()` for error propagation. Token is persisted to `localStorage` and rehydrated on page load.

---

## API Routes

All routes proxied through nginx at `/api/*`:

| Method | Path | Service | Description |
|--------|------|---------|-------------|
| POST | `/api/auth/signup` | user-service | Register |
| POST | `/api/auth/login` | user-service | Login → JWT |
| GET/PUT | `/api/users/me` | user-service | Profile |
| POST/GET/DELETE | `/api/favorites/:restaurant_id` | user-service | Favourites |
| POST | `/api/ai-assistant/chat` | user-service | AI restaurant chat |
| GET | `/api/restaurants` | restaurant-service | List/search |
| GET/PUT/DELETE | `/api/restaurants/:id` | restaurant-service | Single restaurant |
| POST | `/api/restaurants/:id/photos` | restaurant-service | Upload photo |
| GET | `/api/restaurants/:id/reviews` | review-service | List reviews |
| POST | `/api/restaurants/:id/reviews` | review-service | Submit review → Kafka |
| PUT/DELETE | `/api/reviews/:id` | review-service | Update/delete review |
| GET | `/api/owner/restaurants` | restaurant-owner-service | Owner's restaurants |
| POST | `/api/owner/restaurants/:id/claim` | restaurant-owner-service | Claim restaurant |
| GET | `/api/owner/restaurants/:id/analytics` | restaurant-owner-service | Analytics |

---

## Environment Variables

| Variable         | Description                            | Used By       |
|------------------|----------------------------------------|---------------|
| `MONGO_URI`      | MongoDB connection string              | All backends  |
| `MONGO_DB_NAME`  | Database name (default: `yelp_db`)     | All backends  |
| `JWT_SECRET_KEY` | Secret for signing JWTs                | All backends  |
| `KAFKA_BROKER`   | Kafka broker address                   | All backends  |
| `CORS_ORIGINS`   | Allowed CORS origins (comma-separated) | All backends  |
| `GEMINI_API_KEY` | Google Gemini API key (AI assistant)   | user-service  |
| `TAVILY_API_KEY` | Tavily search API key (AI web search)  | user-service  |
| `HF_API_TOKEN`   | Hugging Face token                     | user-service  |

Secrets are stored in `k8s/secrets.yaml` (gitignored). Copy `k8s/secrets.yaml.example` and fill with base64-encoded values.

---

## JMeter Performance Testing

Test plan: `jmeter/test-plan.jmx`

**APIs tested:**
- User authentication (`POST /api/auth/login`)
- Restaurant search (`GET /api/restaurants`)
- Review submission (`POST /api/restaurants/:id/reviews`)

**Concurrency levels:** 100, 200, 300, 400, 500 concurrent users

**Metrics recorded:** average response time (ms), throughput (req/s), error rate (%)

```bash
jmeter -n -t jmeter/test-plan.jmx -l jmeter/results/results.csv -e -o jmeter/results/report/
```

---

## Data Migration (Lab 1 MySQL → MongoDB)

```bash
export MYSQL_HOST=127.0.0.1 MYSQL_USER=root MYSQL_PASSWORD=yourpass MYSQL_DB=yelp_db
export MONGO_URI=mongodb://localhost:27017 MONGO_DB_NAME=yelp_db

pip install pymysql pymongo bcrypt
python scripts/migrate_mysql_to_mongo.py
```

Migrates: users, restaurants, reviews, favorites, photos, activity logs.
