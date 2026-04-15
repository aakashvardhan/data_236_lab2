Lab 2 Solo Week -- Full Implementation Plan

Current State





Done: Phase 0 connection-string audit (hardcoded localhost, mysql://, port numbers replaced with os.environ.get() in 4 files)



Not started: Everything else -- Docker, MongoDB, Kafka, K8s, microservice decomposition, documentation

The codebase is a single FastAPI monolith at backend/app/ with SQLAlchemy/MySQL, plus a React frontend at frontend/. No services/, k8s/, scripts/, or docker-compose.yml exist yet.



Phase 0 (remaining): Finish Prep

Task 0.3 -- Confirm the monolith starts





Run the existing backend to verify it boots with current env-var changes before decomposing

Task 0.4 -- Document MySQL schema





Read backend/app/yelp_db.sql and backend/app/models.py to produce the table/column map that feeds into MongoDB schema design (Phase 2)



Phase 1: Microservice Decomposition + Docker

This is the biggest phase. The Lab 2 PDF requires "each service must have its own Dockerfile" for: User/Reviewer, Restaurant Owner, Restaurant, Review. The monolith must be split first.

1.0 -- Create directory structure

services/
  user-service/
    app/
      main.py, models.py, schemas.py, config.py, database.py
      routers/ (auth.py, users.py, favorites.py, ai_assistant.py)
      services/ (ai_assistant.py, ai_tools.py, conversation_manager.py,
                 preferences_loader.py, tavily_tool.py)
      utils/ (security.py)
    Dockerfile
    requirements.txt
    .dockerignore
  restaurant-service/
    app/ (main.py, models.py, routes.py, schemas.py, config.py, database.py, utils/)
    ...
  restaurant-owner-service/
    app/ ...
  review-service/
    app/ ...
frontend/
  Dockerfile
  .dockerignore

1.1 -- Route decomposition map

Based on the current routers in backend/app/routers/:





user-service -- Auth (/auth/signup, /auth/login, /auth/logout, /auth/token, /auth/owner/signup) + Users (/users/me, preferences) + Favorites (/favorites/*) + AI Assistant (/ai-assistant/*)





Source: auth.py, users.py, favorites.py, ai_assistant.py



AI services: services/ai_assistant.py, services/ai_tools.py, services/conversation_manager.py, services/preferences_loader.py, services/tavily_tool.py



restaurant-service -- Restaurant CRUD + search (/restaurants/*, /restaurants/{id}/photos)





Source: restaurants.py



restaurant-owner-service -- Owner dashboard + analytics + claim (/owner/*, /restaurants/{id}/claim)





Source: owner.py + claim route from restaurants.py



review-service -- Review CRUD (/restaurants/{id}/reviews, /reviews/{id})





Source: reviews.py

Each service gets:





Its own main.py with FastAPI app, CORS, health check



Its own models.py -- only the MongoDB models it needs



Its own database.py -- motor async client connecting via MONGO_URI



Its own schemas.py -- relevant Pydantic models from backend/app/schemas.py



Shared auth pattern: each service that needs auth includes a utils/security.py with get_current_user (JWT decode + user lookup)

1.2 -- AI Assistant (embedded in user-service)

The AI assistant (LangChain + Gemini + Tavily) is carried forward from Lab 1. It lives inside user-service because it depends on user preferences and is user-facing.

Files to migrate into services/user-service/app/:





routers/ai_assistant.py -- chat, stream, history, clear, sessions endpoints



services/ai_assistant.py -- LangChain ReAct agent with Gemini



services/ai_tools.py -- search_restaurants tool (will query MongoDB restaurants collection directly via motor)



services/conversation_manager.py -- conversation history (refactor from SQLAlchemy ConversationMessage to motor queries on conversation_messages collection)



services/preferences_loader.py -- loads user preferences (from embedded preferences subdocument in users collection)



services/tavily_tool.py -- Tavily web search wrapper (no DB dependency, carries over as-is)

Extra dependencies for user-service requirements.txt: langchain, langchain-community, langchain-huggingface, langgraph, tavily-python, google-generativeai (or whichever Gemini client is used), tiktoken

1.3 -- Dockerfiles

Each backend service Dockerfile:





Builder stage: python:3.11-slim, install deps from requirements.txt



Runtime stage: python:3.11-slim, copy app code, expose service port, run uvicorn



Health check: CMD curl --fail http://localhost:PORT/health || exit 1

Frontend Dockerfile:





Builder: node:18-alpine, npm ci, npm run build



Runtime: nginx:alpine, copy build to /usr/share/nginx/html, expose 80

1.4 -- docker-compose.yml (at project root)

Services:
  user-service        (build: ./services/user-service,  port 8001)
  restaurant-service  (build: ./services/restaurant-service, port 8002)
  restaurant-owner-service (build: ./services/restaurant-owner-service, port 8003)
  review-service      (build: ./services/review-service, port 8004)
  frontend            (build: ./frontend, port 80 -> 5173)
  mongodb             (mongo:7, port 27017, named volume)
  zookeeper           (confluentinc/cp-zookeeper:7.5.0, port 2181)
  kafka               (confluentinc/cp-kafka:7.5.0, port 9092)

Environment variables from .env: MONGO_URI, KAFKA_BROKER, JWT_SECRET_KEY

depends_on ordering: mongodb -> backend services -> frontend; zookeeper -> kafka

1.5 -- Verify





docker-compose build -- all images build



docker-compose up -- all services start, MongoDB accessible



Test one endpoint via curl



Phase 2: MongoDB Migration

2.1 -- MongoDB document schemas

Map from current SQLAlchemy models in backend/app/models.py:





users -- { _id: ObjectId, name, email (unique index), password_hash, role, phone, about_me, city, state, country, languages, gender, profile_picture, created_at, updated_at }



user_preferences -- Embed inside users document as preferences: { cuisines, price_range, preferred_locations, dietary_needs, ambience, sort_preference }



restaurants -- { _id: ObjectId, owner_id: ObjectId|null, name (index), cuisine_type, description, address, city (index), state, zip_code, country, contact_info, hours, photos, pricing_tier, avg_rating, review_count, created_at, updated_at }



reviews -- { _id: ObjectId, user_id: ObjectId, restaurant_id: ObjectId (index), rating, comment, photos, created_at, updated_at } with unique compound index on (user_id, restaurant_id)



favorites -- { _id: ObjectId, user_id: ObjectId, restaurant_id: ObjectId, created_at } with unique compound index on (user_id, restaurant_id)



sessions -- { _id: ObjectId, user_id: ObjectId, token (unique index), created_at (TTL index, 24h expiry) }



conversation_messages -- { _id: ObjectId, user_id: ObjectId, session_id, role, content, created_at } (used by AI assistant in user-service)



photos -- { _id: ObjectId, entity_type: "restaurant"|"review", entity_id: ObjectId, url: str, uploaded_by: ObjectId, created_at } with index on (entity_type, entity_id). During migration, extract photo URLs from restaurants.photos and reviews.photos text fields into separate documents.



activity_logs -- { _id: ObjectId, user_id: ObjectId, action: str, entity_type: str, entity_id: ObjectId, metadata: dict, created_at } with index on user_id and TTL index on created_at (90 days). No MySQL source table exists; create as empty collection with schema validation. Kafka consumers can populate it later.

2.2 -- Migration script

Create scripts/migrate_mysql_to_mongo.py:





Read from MySQL via pymysql (using existing yelp_db.sql schema)



Transform rows into MongoDB documents per the schemas above



Hash any plaintext passwords with bcrypt during migration (existing passwords already use bcrypt, verify and keep)



Embed user_preferences into users documents



Extract photo URL strings from restaurants.photos and reviews.photos columns into separate photos collection documents (one document per URL, linked back via entity_type + entity_id)



Create activity_logs collection as empty with JSON schema validation



Use bulk_write for performance



Create all indexes after insertion:





users.email (unique), restaurants.name, restaurants.city, reviews.restaurant_id, reviews.(user_id, restaurant_id) (unique compound), favorites.(user_id, restaurant_id) (unique compound), sessions.token (unique), photos.(entity_type, entity_id), activity_logs.user_id



Create TTL indexes: sessions.created_at (24 hours), activity_logs.created_at (90 days)

2.3 -- Update each microservice to use motor

For each of the 4 services:





Replace SQLAlchemy imports with motor.motor_asyncio.AsyncIOMotorClient



Update database.py to create motor client from MONGO_URI env var



Convert all CRUD operations from ORM queries to motor async operations



Keep the same API contract (request/response Pydantic schemas unchanged)



Use async def for all endpoints (motor is async-native)

Add to each service's requirements.txt: motor, pymongo (motor dependency)



Phase 3: Kafka Infrastructure Setup

3.1 -- Kafka + Zookeeper in docker-compose (already covered in 1.4)

Verify containers start and Kafka broker is reachable at kafka:9092.

3.2 -- Topic creation script

Create scripts/create_kafka_topics.sh:





Uses kafka-topics.sh with --if-not-exists for idempotency



Creates all 9 topics: review.created, review.updated, review.deleted, restaurant.created, restaurant.updated, restaurant.claimed, user.created, user.updated, booking.status



3 partitions each, replication factor 1



Broker at kafka:9092

3.3 -- Stub Kafka producer/consumer files

Leave placeholder files in each service for the partner to wire up:





services/review-service/app/kafka_producer.py (stub)



services/workers/review-worker/ (stub directory with main.py, consumer.py)



Same pattern for restaurant-worker, user-worker



Phase 4: Kubernetes Manifests

4.1 -- Create k8s/ directory

Per .cursorrules file structure, generate these manifests:

Infrastructure:





k8s/mongodb-deployment.yaml + k8s/mongodb-service.yaml (with PVC for data volume)



k8s/zookeeper-deployment.yaml + k8s/zookeeper-service.yaml



k8s/kafka-deployment.yaml + k8s/kafka-service.yaml

App services (each gets Deployment + Service):





k8s/user-service-deployment.yaml + k8s/user-service-service.yaml (port 8001)



k8s/restaurant-service-deployment.yaml + k8s/restaurant-service-service.yaml (port 8002)



k8s/restaurant-owner-service-deployment.yaml + k8s/restaurant-owner-service-service.yaml (port 8003)



k8s/review-service-deployment.yaml + k8s/review-service-service.yaml (port 8004)



k8s/frontend-deployment.yaml + k8s/frontend-service.yaml (port 80, LoadBalancer)

Config:





k8s/configmap.yaml -- MONGO_URI, KAFKA_BROKER, service URLs



k8s/secrets.yaml -- base64 encoded JWT_SECRET_KEY, MongoDB credentials

All deployments: 1 replica, resource limits (256Mi-512Mi), readiness/liveness probes on /health.

4.2 -- Verify





kubectl apply -f k8s/ -- all resources create without errors



kubectl get pods -- all pods running



Phase 5: Documentation

5.1 -- Update README.md





Project overview (Lab 2 enhancements)



Prerequisites (Docker, kubectl, Node 18, Python 3.11)



How to run: docker-compose up



How to deploy to K8s: kubectl apply -f k8s/



MongoDB collection schemas (document structure table)



Kafka topics table (topic, producer, consumer)



Port mapping for all services



Environment variables reference

5.2 -- Partner handoff notes





What's done: Docker, MongoDB, Kafka infra, K8s manifests



What's left: Kafka wiring (producer/consumer code), Redux (4 slices), JMeter, AWS deployment



Where to find schemas/configs



Any gotchas discovered



Execution Order and Time Estimates

gantt
    title Lab 2 Solo Week Timeline
    dateFormat HH:mm
    axisFormat %H:%M
    section Phase0
    Finish prep           :p0, 00:00, 30m
    section Phase1
    Directory structure   :p1a, after p0, 15m
    Decompose user-svc + AI assistant :p1b, after p1a, 60m
    Decompose restaurant-svc :p1c, after p1b, 30m
    Decompose owner-svc   :p1d, after p1c, 30m
    Decompose review-svc  :p1e, after p1d, 30m
    Dockerfiles + compose :p1f, after p1e, 45m
    Verify docker         :p1g, after p1f, 15m
    section Phase2
    MongoDB schemas       :p2a, after p1g, 20m
    Migration script      :p2b, after p2a, 40m
    Motor refactor x4     :p2c, after p2b, 90m
    section Phase3
    Topic creation script :p3a, after p2c, 15m
    Kafka stubs           :p3b, after p3a, 15m
    section Phase4
    K8s manifests         :p4, after p3b, 60m
    section Phase5
    README + handoff      :p5, after p4, 30m



Risk Notes





Monolith decomposition is the riskiest step -- shared models, auth middleware, and cross-service queries (e.g., reviews need user and restaurant data) require careful handling. Each service must carry its own copy of the models it needs.



Motor refactor -- Converting synchronous SQLAlchemy code to async motor changes every CRUD operation. Follow one-service-at-a-time approach; test each before moving on.



Inter-service data -- In the monolith, endpoints like GET /restaurants/{id}/reviews join across tables. In microservices with a shared MongoDB, each service can still query the same database directly (acceptable for this lab scope).



AI assistant migration -- The search_restaurants tool currently uses SQLAlchemy queries on the Restaurant model. This must be refactored to motor queries against the restaurants MongoDB collection. The conversation_manager.py similarly moves from SQLAlchemy ConversationMessage to motor operations on conversation_messages. The LangChain/Gemini/Tavily integration itself is DB-agnostic and carries over unchanged.



AI assistant env vars -- user-service needs additional env vars beyond the other services: GEMINI_API_KEY, TAVILY_API_KEY, HF_API_TOKEN. These must be added to docker-compose, K8s configmap/secrets.

