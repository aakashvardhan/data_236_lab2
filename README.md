# Yelp Prototype - Lab 2

Restaurant discovery and review platform enhanced with Docker, Kubernetes, Kafka, MongoDB, and Redux.

## Architecture

```
Frontend (React + Redux)
    |
    | HTTP (nginx reverse proxy)
    |
    +--- user-service         (FastAPI, port 8001) -- Auth, profiles, favorites, AI assistant
    +--- restaurant-service   (FastAPI, port 8002) -- Restaurant CRUD and search
    +--- restaurant-owner-service (FastAPI, port 8003) -- Owner dashboard and analytics
    +--- review-service       (FastAPI, port 8004) -- Review CRUD
    |
    +--- Kafka (port 9092)    -- Async messaging (producer/consumer)
    |       |
    |       +--- review-worker, restaurant-worker, user-worker (consumers)
    |
    +--- MongoDB (port 27017) -- Primary database
```

## Tech Stack

| Layer          | Technology                                     |
|----------------|------------------------------------------------|
| Frontend       | React 19, Redux Toolkit, Axios, TailwindCSS    |
| Backend        | Python 3.11, FastAPI, motor (async MongoDB)    |
| Database       | MongoDB 7                                      |
| Messaging      | Apache Kafka (Confluent 7.5.0) + Zookeeper     |
| AI Assistant   | LangChain + Google Gemini + Tavily             |
| Containers     | Docker, docker-compose                         |
| Orchestration  | Kubernetes                                     |
| Testing        | Apache JMeter                                  |

## Prerequisites

- Docker and Docker Compose
- kubectl (for Kubernetes deployment)
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start (Docker Compose)

```bash
# Clone and enter project
cd data_236_lab2

# Start all services
docker-compose up --build

# In another terminal, create Kafka topics
docker-compose exec kafka bash /scripts/create_kafka_topics.sh
```

Services will be available at:

| Service                   | URL                    |
|---------------------------|------------------------|
| Frontend                  | http://localhost:5173   |
| User Service              | http://localhost:8001   |
| Restaurant Service        | http://localhost:8002   |
| Restaurant Owner Service  | http://localhost:8003   |
| Review Service            | http://localhost:8004   |
| MongoDB                   | localhost:27017         |
| Kafka                     | localhost:9092          |

## Data Migration (MySQL to MongoDB)

If you have existing Lab 1 data in MySQL:

```bash
# Set MySQL connection vars
export MYSQL_HOST=127.0.0.1 MYSQL_USER=root MYSQL_PASSWORD=yourpass MYSQL_DB=yelp_db

# Set MongoDB target
export MONGO_URI=mongodb://localhost:27017 MONGO_DB_NAME=yelp_db

# Run migration
pip install pymysql pymongo bcrypt
python scripts/migrate_mysql_to_mongo.py
```

## Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f k8s/

# Verify pods are running
kubectl get pods

# Check services
kubectl get svc

# Port-forward frontend to test
kubectl port-forward svc/frontend 8080:80
```

## MongoDB Collections

| Collection             | Description                                   | Indexes                                      |
|------------------------|-----------------------------------------------|----------------------------------------------|
| `users`                | User accounts with embedded preferences       | `email` (unique)                             |
| `restaurants`          | Restaurant listings                           | `name`, `city`                               |
| `reviews`              | User reviews for restaurants                  | `restaurant_id`, `(user_id, restaurant_id)` unique |
| `favorites`            | User-restaurant favorites                     | `(user_id, restaurant_id)` unique            |
| `sessions`             | User sessions with auto-expiry                | `token` (unique), `created_at` (TTL 24h)     |
| `photos`               | Extracted photo references                    | `(entity_type, entity_id)`                   |
| `activity_logs`        | Event log (populated by Kafka consumers)      | `user_id`, `created_at` (TTL 90d)            |
| `conversation_messages`| AI assistant chat history                     | `(user_id, session_id)`                      |

## Kafka Topics

| Topic                | Producer                  | Consumer                   |
|----------------------|---------------------------|----------------------------|
| `review.created`     | Review API Service        | Review Worker Service      |
| `review.updated`     | Review API Service        | Review Worker Service      |
| `review.deleted`     | Review API Service        | Review Worker Service      |
| `restaurant.created` | Restaurant API Service    | Restaurant Worker Service  |
| `restaurant.updated` | Restaurant API Service    | Restaurant Worker Service  |
| `restaurant.claimed` | Restaurant Owner Service  | Restaurant Worker Service  |
| `user.created`       | User API Service          | User Worker Service        |
| `user.updated`       | User API Service          | User Worker Service        |
| `booking.status`     | Booking Service           | Frontend Service           |

## Environment Variables

| Variable           | Default                        | Used By          |
|--------------------|--------------------------------|------------------|
| `MONGO_URI`        | `mongodb://localhost:27017`    | All backends     |
| `MONGO_DB_NAME`    | `yelp_db`                      | All backends     |
| `JWT_SECRET_KEY`   | (must set in production)       | All backends     |
| `KAFKA_BROKER`     | `kafka:9092`                   | All backends     |
| `CORS_ORIGINS`     | `http://localhost:3000,...`     | All backends     |
| `TAVILY_API_KEY`   | (optional)                     | User service     |
| `GEMINI_API_KEY`   | (optional)                     | User service     |
| `HF_API_TOKEN`     | (optional)                     | User service     |

## Project Structure

```
project-root/
├── docker-compose.yml
├── k8s/                          # Kubernetes manifests
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── mongodb-*.yaml
│   ├── kafka-*.yaml
│   ├── zookeeper-*.yaml
│   ├── user-service-*.yaml
│   ├── restaurant-service-*.yaml
│   ├── restaurant-owner-service-*.yaml
│   ├── review-service-*.yaml
│   └── frontend-*.yaml
├── services/
│   ├── user-service/             # Auth, profiles, favorites, AI assistant
│   ├── restaurant-service/       # Restaurant CRUD and search
│   ├── restaurant-owner-service/ # Owner dashboard and analytics
│   ├── review-service/           # Review CRUD
│   └── workers/                  # Kafka consumer stubs
│       ├── review-worker/
│       ├── restaurant-worker/
│       └── user-worker/
├── frontend/                     # React + Vite + TailwindCSS
├── scripts/
│   ├── migrate_mysql_to_mongo.py
│   └── create_kafka_topics.sh
├── backend/                      # Original Lab 1 monolith (reference)
└── README.md
```

## Current Project Status

### Implemented

- Microservice split complete: user, restaurant, restaurant-owner, review, frontend
- MongoDB migration + indexes + session handling + bcrypt password hashing
- Kafka producers and worker consumers (review/restaurant/user events)
- Dockerfiles + docker-compose + Kubernetes manifests
- Redux integration with 4 slices:
  - `authSlice`
  - `restaurantSlice`
  - `reviewSlice`
  - `favouritesSlice`
- Frontend tests and lint passing locally
- JMeter baseline artifacts added in `jmeter/`

### Remaining Manual Deliverables

- Run JMeter load tests for 100/200/300/400/500 users and collect metrics/screenshots
- Deploy and verify services on AWS and capture evidence screenshots
- Add Redux DevTools screenshots to report
- Finalize architecture diagram and submit final report PDF

See `docs/lab2-submission-checklist.md` for an actionable checklist.
