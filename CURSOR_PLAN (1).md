# CURSOR PLAN — Lab 2 Solo Week (Foundation Work)
# Goal: Set up infra so partner can jump straight into Kafka wiring, Redux, JMeter

---

## Phase 0: Prep (30 min)
### Task 0.1 — Audit Lab 1 codebase
- [ ] Grep for hardcoded `localhost`, `127.0.0.1`, `mysql://` in all backend files
- [ ] Replace with env var reads: `os.environ.get("MONGO_URI")`, etc.
- [ ] Confirm all 4 backend services start independently
- [ ] List all MySQL tables and columns (needed for MongoDB schema design)

**Prompt to Cursor:**
> Scan all Python files for hardcoded connection strings (localhost, 127.0.0.1, mysql://, any port numbers). Replace each with os.environ.get() reads with sensible defaults. Show me the diff.

---

## Phase 1: Docker (1–1.5 hrs)
### Task 1.1 — Dockerfiles for all 5 services
- [ ] `services/user-service/Dockerfile`
- [ ] `services/restaurant-service/Dockerfile`
- [ ] `services/restaurant-owner-service/Dockerfile`
- [ ] `services/review-service/Dockerfile`
- [ ] `frontend/Dockerfile`
- [ ] `.dockerignore` in each service directory

**Prompt to Cursor:**
> Create a multi-stage Dockerfile for a FastAPI service. Builder stage installs deps from requirements.txt. Runtime uses python:3.11-slim, copies only app code, exposes port 8000, runs with uvicorn. Include a health check. Generate matching .dockerignore (exclude venv, __pycache__, .git, .env, tests).

> Create a Dockerfile for a React frontend. Builder stage: node:18-alpine, npm ci, npm run build. Runtime: nginx:alpine, copy build output to /usr/share/nginx/html, expose port 80.

### Task 1.2 — docker-compose.yml
- [ ] All 5 app services + MongoDB + Kafka + Zookeeper
- [ ] Named volume for MongoDB
- [ ] Environment variables for all connections
- [ ] Health checks and depends_on ordering
- [ ] `docker-compose up` boots everything

**Prompt to Cursor:**
> Create docker-compose.yml with these services: user-service, restaurant-service, restaurant-owner-service, review-service, frontend (all build from ./services/<name> or ./frontend), plus mongodb:7, zookeeper:3.8, kafka (confluentinc/cp-kafka:7.5.0). MongoDB on port 27017 with named volume. Kafka on 9092 depending on zookeeper. All app services depend on mongodb and kafka with health checks. Use environment variables for MONGO_URI, KAFKA_BROKER. Frontend depends on all API services.

### Task 1.3 — Verify
- [ ] `docker-compose build` — all images build clean
- [ ] `docker-compose up` — all services start, logs show connected to MongoDB
- [ ] Hit frontend in browser, confirm it loads
- [ ] Test one API endpoint via curl

---

## Phase 2: MongoDB Migration (1.5–2 hrs)
### Task 2.1 — Design MongoDB schemas
- [ ] Map each MySQL table → MongoDB collection
- [ ] Define document structure for: users, restaurants, reviews, favourites, sessions, photos, activity_logs
- [ ] Identify indexes needed

**Prompt to Cursor:**
> Here are my MySQL table schemas: [paste Lab 1 SQL]. Design equivalent MongoDB collection schemas as Python dicts showing document structure. Include: field names, types, which fields need indexes (unique, TTL, compound). Map foreign keys to embedded docs or ObjectId references — use references for reviews/restaurants (they're queried independently), embed for things like restaurant photos.

### Task 2.2 — Migration script
- [ ] `scripts/migrate_mysql_to_mongo.py`
- [ ] Read from MySQL, transform, write to MongoDB
- [ ] Hash any plaintext passwords with bcrypt during migration
- [ ] Create indexes after migration
- [ ] Create TTL index on sessions collection

**Prompt to Cursor:**
> Write a Python migration script that reads all tables from MySQL (using pymysql), transforms rows into MongoDB documents matching these schemas: [paste schemas from 2.1], hashes all password fields with bcrypt, inserts into MongoDB collections, then creates these indexes: users.email (unique), restaurants.name, reviews.restaurant_id, sessions.token, sessions.created_at (TTL 24hrs). Use bulk_write for performance.

### Task 2.3 — Update backend services to use MongoDB
- [ ] Replace all MySQL/SQLAlchemy code with motor (async MongoDB)
- [ ] Update CRUD operations in each service
- [ ] Update session management to use MongoDB
- [ ] Test: create user, create restaurant, submit review — all persist in MongoDB

**Prompt to Cursor:**
> Refactor this FastAPI service from SQLAlchemy/MySQL to motor/MongoDB. Keep the same API contract (same request/response schemas). Replace all ORM queries with motor async operations. Use Pydantic models for validation. Connection string from MONGO_URI env var. Here's the current code: [paste service]

Do this ONE service at a time. Test each before moving to the next.

---

## Phase 3: Kafka K8s Setup (30–45 min)
### Task 3.1 — Kafka + Zookeeper manifests
- [ ] `k8s/zookeeper-deployment.yaml` + `k8s/zookeeper-service.yaml`
- [ ] `k8s/kafka-deployment.yaml` + `k8s/kafka-service.yaml`

**Prompt to Cursor:**
> Create Kubernetes manifests for Zookeeper (1 replica, port 2181) and Kafka (1 replica, port 9092, env: KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181, KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092). Use confluentinc/cp-kafka:7.5.0 and confluentinc/cp-zookeeper:7.5.0 images. Include resource limits (256Mi-512Mi for each). ClusterIP services.

### Task 3.2 — Topic creation script
- [ ] `scripts/create_kafka_topics.sh`
- [ ] Creates all 9 topics from the lab spec

**Prompt to Cursor:**
> Write a bash script that creates these Kafka topics using kafka-topics.sh: review.created, review.updated, review.deleted, restaurant.created, restaurant.updated, restaurant.claimed, user.created, user.updated, booking.status. All with 3 partitions, replication factor 1. Kafka broker at kafka:9092. Script should be idempotent (--if-not-exists).

---

## Phase 4: K8s Manifests for All Services (1–1.5 hrs)
### Task 4.1 — Generate manifests
- [ ] Deployment + Service YAML for each of the 5 app services
- [ ] MongoDB deployment + service + PersistentVolumeClaim
- [ ] ConfigMap for shared env vars
- [ ] Secret for credentials (MongoDB password, JWT secret)

**Prompt to Cursor:**
> Generate Kubernetes Deployment and Service manifests for these services: user-service (port 8001), restaurant-service (port 8002), restaurant-owner-service (port 8003), review-service (port 8004), frontend (port 80). Each deployment: 1 replica, resource limits 256Mi-512Mi, readiness probe on /health, liveness probe on /health. Services: ClusterIP for backends, LoadBalancer for frontend. All read MONGO_URI and KAFKA_BROKER from a ConfigMap named app-config.

### Task 4.2 — ConfigMap + Secrets
- [ ] `k8s/configmap.yaml` — MONGO_URI, KAFKA_BROKER, service URLs
- [ ] `k8s/secrets.yaml` — base64 encoded credentials

### Task 4.3 — Verify on K8s (local or AWS)
- [ ] `kubectl apply -f k8s/` — all resources created
- [ ] `kubectl get pods` — all running
- [ ] Port-forward frontend, test basic flow
- [ ] Screenshot for report

---

## Phase 5: Documentation (20–30 min)
### Task 5.1 — Update README
- [ ] How to run with docker-compose
- [ ] How to deploy to K8s
- [ ] MongoDB collection schemas (table format)
- [ ] Kafka topics list
- [ ] Port mapping for all services
- [ ] Env vars reference

### Task 5.2 — Notes for partner
- [ ] What's done vs what's left
- [ ] Where to find schemas/configs she'll need
- [ ] Any gotchas discovered during setup

**Prompt to Cursor:**
> Generate a README.md for this project. Include: project overview, prerequisites (Docker, kubectl, Node 18, Python 3.11), how to run locally (docker-compose up), how to deploy to K8s (kubectl apply -f k8s/), MongoDB schema reference table, Kafka topics table, environment variables reference, port mapping. Use the file structure from .cursorrules.

---

## Checklist Before Handing Off
- [ ] `docker-compose up` starts everything from scratch
- [ ] All 4 backend services connect to MongoDB
- [ ] MongoDB has migrated data with bcrypt passwords
- [ ] Kafka broker is running with all topics created
- [ ] K8s manifests apply cleanly
- [ ] README has complete setup instructions
- [ ] Commit history is clean (no venv, no __pycache__)
- [ ] .cursorrules is in repo root for partner's Cursor setup
