  Codebase Audit — data_236_lab2                                                                                                                             
                                                                                                                                                             
  Architecture                                                                                                                                               
                                                                                                                                                             
  Yelp-like microservices app: 4 FastAPI backends (user, restaurant, restaurant-owner, review services), React/Vite frontend, MongoDB, Kafka. All services   
  share one MongoDB database and communicate via direct collection reads — no inter-service HTTP. Kafka workers are deployed but entirely unimplemented.
                                                                                                                                                             
  ---             
  CRITICAL

  ┌─────┬───────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
  │ ID  │                                       Issue                                       │                     Location                      │
  ├─────┼───────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
  │ C1  │ Real API keys (Tavily, HuggingFace, Gemini, Yelp, JWT secret) stored in .env file │ .env lines 5–8                                    │
  ├─────┼───────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
  │ C2  │ K8s secrets.yaml committed with JWT secret super-secret-change-me (base64 only)   │ k8s/secrets.yaml:9                                │            
  ├─────┼───────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤            
  │ C3  │ Any authenticated user can upload photos to any restaurant — no ownership check   │ restaurant-service/routers/restaurants.py:240–296 │            
  └─────┴───────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘            
                  
  ---                                                                                                                                                        
  HIGH            

  ┌─────┬────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
  │ ID  │                                 Issue                                  │                               Location                                │
  ├─────┼────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤   
  │ H1  │ File uploads validated by extension only — no MIME/magic-byte check    │ restaurant-service/routers/restaurants.py:256,                        │
  │     │                                                                        │ user-service/routers/users.py:89                                      │   
  ├─────┼────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤   
  │ H2  │ python-jose==3.3.0 has CVEs for algorithm-confusion JWT attacks        │ All 4 requirements.txt                                                │
  ├─────┼────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤   
  │ H3  │ passlib==1.7.4 + bcrypt==4.0.1 known incompatibility — password        │ user-service/requirements.txt:9–10                                    │
  │     │ hashing may silently fail                                              │                                                                       │   
  ├─────┼────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ H4  │ MongoDB deployed with no credentials (mongodb://mongodb:27017)         │ docker-compose.yml, k8s/configmap.yaml:8                              │   
  ├─────┼────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤   
  │ H5  │ Kafka uses unauthenticated PLAINTEXT listeners — any pod can           │ docker-compose.yml:39, k8s/kafka-deployment.yaml:28                   │
  │     │ produce/consume                                                        │                                                                       │   
  ├─────┼────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ H6  │ AI chat endpoint returns raw exception details to client (leaks        │ user-service/routers/ai_assistant.py:44                               │   
  │     │ internals)                                                             │                                                                       │   
  └─────┴────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘
                                                                                                                                                             
  ---             
  MEDIUM

  ┌─────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────┐
  │ ID  │                                     Issue                                     │                            Location                            │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ M1  │ Logout only invalidates session in user-service; other services never check   │ restaurant-service/utils/security.py (no sessions.find_one)    │
  │     │ sessions collection — valid JWT still accepted 60 min after logout            │                                                                │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤   
  │ M2  │ No rate limiting on /auth/login, /auth/signup, /auth/token                    │ All auth routers                                               │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤   
  │ M3  │ Review comment field has no max_length — unbounded document size              │ review-service/schemas.py:8                                    │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤   
  │ M4  │ AI session_id is free-form with no per-user session cap — unbounded MongoDB   │ user-service/schemas.py:160                                    │
  │     │ growth                                                                        │                                                                │   
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ M5  │ No HTTPS/TLS — JWT tokens transmitted in plaintext                            │ frontend/nginx.conf                                            │   
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ M6  │ JWT stored in localStorage — XSS-accessible                                   │ frontend/src/pages/LoginPage.jsx:21–26                         │   
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ M7  │ Duplicate claim_restaurant endpoint in two services — divergence risk         │ restaurant-service/routers/restaurants.py:302,                 │   
  │     │                                                                               │ owner-service/routers/owner.py:158                             │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤   
  │ M8  │ favorites.py missing try/except around ObjectId(restaurant_id) — returns 500  │ user-service/routers/favorites.py:24–25                        │
  │     │ on bad ID                                                                     │                                                                │   
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ M9  │ No DB indexes on reviews.restaurant_id, restaurants.owner_id,                 │ **/database.py                                                 │   
  │     │ favorites.user_id, etc.                                                       │                                                                │   
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ M10 │ conversation_messages collection has no TTL or per-user size cap              │ user-service/services/conversation_manager.py                  │   
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤   
  │ M11 │ Nginx missing all security headers (CSP, X-Frame-Options, HSTS, etc.)         │ frontend/nginx.conf                                            │
  └─────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────┘   
                  
  ---
  LOW

  ┌─────┬──────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐ 
  │ ID  │                                  Issue                                   │                              Location                               │ 
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
  │ L1  │ All Kafka producers/consumers are TODO stubs — entire async event system │ services/workers/*/main.py, **/kafka_producer.py                    │ 
  │     │  is non-functional                                                       │                                                                     │ 
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤   
  │ L2  │ config.py, security.py, database.py, error_handler.py copy-pasted across │ All 4 service dirs                                                  │   
  │     │  all 4 services                                                          │                                                                     │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤   
  │ L3  │ Frontend route guards rely on localStorage.userRole — easily bypassed    │ frontend/src/App.jsx                                                │ 
  │     │ via browser console                                                      │                                                                     │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
  │ L4  │ Reviews list uses .to_list(None) (unbounded); favorites uses             │ review-service/routers/reviews.py:142,                              │   
  │     │ .to_list(500) — no real pagination                                       │ user-service/routers/favorites.py:82                                │ 
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
  │ L5  │ sort_by=price loads all matching documents into app memory for           │ restaurant-service/routers/restaurants.py:171–179                   │
  │     │ Python-level sort                                                        │                                                                     │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ L6  │ is_claimed field missing from restaurant-service RestaurantResponse      │ restaurant-service/schemas.py                                       │   
  │     │ schema — silently dropped                                                │                                                                     │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ L7  │ Seed script runs on every container start — adds latency on every pod    │ restaurant-service/entrypoint.sh                                    │   
  │     │ restart                                                                  │                                                                     │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ L8  │ K8s configmap.yaml CORS origins hardcoded to localhost only              │ k8s/configmap.yaml                                                  │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤   
  │ L9  │ No Kubernetes NetworkPolicy — all pods can reach MongoDB (27017) and     │ k8s/ directory                                                      │
  │     │ Kafka (9092)                                                             │                                                                     │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ L10 │ No container securityContext — all containers run as root                │ All k8s/*-deployment.yaml                                           │   
  ├─────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤   
  │ L11 │ useEffect dependency lint suppression may hide stale closure bug         │ frontend/src/pages/RestaurantDetailPage.jsx:23                      │
  └─────┴──────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘   
                  
  ---                                                                                                                                                        
  Top Priorities  
                
  1. Rotate all API keys (C1) — assume they may be compromised
  2. Remove k8s/secrets.yaml from the repo and use kubectl create secret or a secrets manager (C2)                                                           
  3. Add ownership check to photo upload (C3)                                                                                                                
  4. Add MongoDB auth credentials (H4) and add MIME validation to uploads (H1)                                                                               
  5. Upgrade python-jose → PyJWT>=2.8.0 and fix the passlib/bcrypt version mismatch (H2, H3)                                                                 
                                                                                                                                                             
✻ Worked for 7m 21s                                                                                                                                          
                                                                                                                                                             
❯ check lab2.pdf for reference                                                                                                                               
                                                                                                                                                             
  Searched for 2 patterns, read 1 file (ctrl+o to expand)                                                                                                    
                                                                                                                                                             
⏺ Let me check the current state against the rubric requirements.
                                                                                                                                                             
  Searched for 5 patterns, read 2 files (ctrl+o to expand)                                
                                                                                                                                                             
⏺ Now I have a clear picture. Here's the gap analysis against the rubric:                                                                                    
                                                                                                                                                             
  ---                                                                                                                                                        
  Lab 2 Completion Status vs. Rubric                                                                                                                         
                                                                                                                                                             
  Part 1 — Docker & Kubernetes (15 pts)                                                                                                                      
                                                                                                                                                             
  ┌────────────────────────────────────────┬─────────┬────────┐
  │                Criteria                │ Status  │ Points │                                                                                              
  ├────────────────────────────────────────┼─────────┼────────┤
  │ Dockerfiles for all 5 services         │ Done    │ 5/5    │
  ├────────────────────────────────────────┼─────────┼────────┤
  │ docker-compose.yml runs full stack     │ Done    │ 3/3    │                                                                                              
  ├────────────────────────────────────────┼─────────┼────────┤
  │ Kubernetes manifests for all services  │ Done    │ 4/4    │                                                                                              
  ├────────────────────────────────────────┼─────────┼────────┤
  │ Services communicate within cluster    │ Done    │ 2/2    │
  ├────────────────────────────────────────┼─────────┼────────┤                                                                                              
  │ Screenshots of services running on AWS │ MISSING │ 0/1    │
  └────────────────────────────────────────┴─────────┴────────┘                                                                                              
                  
  Estimated: 14/15 — need AWS deploy + screenshots.                                                                                                          
   
  ---                                                                                                                                                        
  Part 2 — Kafka (10 pts)
                         
  ┌──────────────────────────────────────────────────┬───────────────────────────────────────────────────┬────────┐
  │                     Criteria                     │                      Status                       │ Points │                                          
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────┤
  │ Kafka deployed in Kubernetes                     │ Done                                              │ 2/2    │                                          
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────┤
  │ Review flow (create/update/delete) through Kafka │ NOT IMPLEMENTED — workers and producers are stubs │ 0/5    │
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────┤                                          
  │ Architecture diagram in report                   │ Unknown (report not submitted yet)                │ ?/3    │
  └──────────────────────────────────────────────────┴───────────────────────────────────────────────────┴────────┘                                          
                  
  Estimated: 2–5/10 — this is the biggest gap. The Kafka infra runs but the actual producer/consumer code is completely TODO.                                
                  
  ---                                                                                                                                                        
  Part 3 — MongoDB (5 pts)
                          
  ┌───────────────────────────────────┬────────────────────────────┬────────┐
  │             Criteria              │           Status           │ Points │                                                                                
  ├───────────────────────────────────┼────────────────────────────┼────────┤
  │ All data migrated to MongoDB      │ Done                       │ 3/3    │                                                                                
  ├───────────────────────────────────┼────────────────────────────┼────────┤
  │ Sessions stored with expiry (TTL) │ Done                       │ 1/1    │
  ├───────────────────────────────────┼────────────────────────────┼────────┤
  │ Passwords encrypted with bcrypt   │ Done (minor version issue) │ 1/1    │
  └───────────────────────────────────┴────────────────────────────┴────────┘                                                                                
   
  Estimated: 5/5                                                                                                                                             
                  
  ---
  Part 4 — Redux (5 pts)
                        
  ┌──────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────┬────────┐
  │                           Criteria                           │                     Status                      │ Points │                                
  ├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼────────┤
  │ Redux store with Auth, Restaurant, Review, Favourites slices │ NOT IMPLEMENTED — no Redux anywhere in frontend │ 0/3    │                                
  ├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼────────┤
  │ Actions, reducers, selectors defined                         │ NOT IMPLEMENTED                                 │ 0/1    │
  ├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼────────┤                                
  │ Redux DevTools screenshots in report                         │ NOT IMPLEMENTED                                 │ 0/1    │
  └──────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────┴────────┘                                
                  
  Estimated: 0/5 — completely missing.                                                                                                                       
   
  ---                                                                                                                                                        
  Part 5 — JMeter (5 pts)

  ┌───────────────────────────────────────────────┬──────────┬────────┐
  │                   Criteria                    │  Status  │ Points │
  ├───────────────────────────────────────────────┼──────────┼────────┤
  │ JMeter .jmx file submitted                    │ MISSING  │ 0/1    │
  ├───────────────────────────────────────────────┼──────────┼────────┤
  │ Tests at 100/200/300/400/500 concurrent users │ NOT DONE │ 0/2    │                                                                                      
  ├───────────────────────────────────────────────┼──────────┼────────┤                                                                                      
  │ Graph + written analysis                      │ NOT DONE │ 0/2    │                                                                                      
  └───────────────────────────────────────────────┴──────────┴────────┘                                                                                      
                  
  Estimated: 0/5 — completely missing.

  ---
  Summary
         
  ┌───────────────────┬───────────┬────────────────────────────────────┐
  │       Part        │   Done    │              Missing               │                                                                                     
  ├───────────────────┼───────────┼────────────────────────────────────┤
  │ Part 1 Docker/K8s │ 14/15     │ AWS screenshots                    │                                                                                     
  ├───────────────────┼───────────┼────────────────────────────────────┤
  │ Part 2 Kafka      │ 2–5/10    │ Producer + consumer implementation │                                                                                     
  ├───────────────────┼───────────┼────────────────────────────────────┤
  │ Part 3 MongoDB    │ 5/5       │ —                                  │                                                                                     
  ├───────────────────┼───────────┼────────────────────────────────────┤                                                                                     
  │ Part 4 Redux      │ 0/5       │ Entire Redux integration           │
  ├───────────────────┼───────────┼────────────────────────────────────┤                                                                                     
  │ Part 5 JMeter     │ 0/5       │ JMeter tests + results             │
  ├───────────────────┼───────────┼────────────────────────────────────┤                                                                                     
  │ Total             │ ~21–24/40 │ ~16–19 points at risk              │
  └───────────────────┴───────────┴────────────────────────────────────┘                                                                                     
                  
  Priority order before April 28:                                                                                                                            
  1. Kafka producers + workers — 5 pts, requires implementing kafka_producer.py in review-service and restaurant-service, and the review-worker consumer
  2. Redux — 5 pts, add @reduxjs/toolkit and create 4 slices (auth, restaurants, reviews, favourites) replacing current localStorage state                   
  3. JMeter — 5 pts, can be run locally against docker-compose; create a .jmx plan for the 3 required endpoints                           
  4. AWS screenshots — 1 pt, deploy to EKS/EC2 and capture                                                                                                   
                                                                                                                                                             
  Would you like me to start implementing any of these?                                                                                                      
                                                                                                                                                             
✻ Worked for 1m 0s                 
                                                                                                                                                             
❯ explain the main architecture patterns used here                                                                                                           
                                                                                                                                                             
⏺ Based on the audit, here are the main patterns in use:                                                                                                     
                                                                                                                                                             
  ---
  1. Microservices Architecture                                                                                                                              
                               
  The monolith from Lab 1 was decomposed into 4 independently deployable services, each with its own codebase, dependencies, and port. Services are scoped by
   domain: users, restaurants, restaurant owners, reviews.                                                                                                   
   
  ---                                                                                                                                                        
  2. Shared Database (Anti-Pattern)
                                                                                                                                                             
  Despite being microservices, all 4 services connect directly to the same MongoDB instance and read each other's collections. For example, review-service
  queries mongo.restaurants and mongo.users directly. This is the "shared database" anti-pattern — it creates tight coupling and defeats one of the main     
  benefits of microservices (independent data ownership).
                                                                                                                                                             
  The correct pattern would be each service owning its data and exposing it via API calls.                                                                   
   
  ---                                                                                                                                                        
  3. API Gateway via Nginx Reverse Proxy
                                                                                                                                                             
  The React frontend doesn't call services directly. All traffic flows through a single Nginx instance that routes by path prefix:
                                                                                                                                                             
  /api/users/*     → user-service:8001
  /api/restaurants/* → restaurant-service:8002                                                                                                               
  /api/owners/*    → restaurant-owner-service:8003
  /api/reviews/*   → review-service:8004                                                                                                                     
                                                                                                                                                             
  This is a lightweight API gateway pattern — single entry point, path-based routing.                                                                        
                                                                                                                                                             
  ---                                                                                                                                                        
  4. Event-Driven Architecture (Intended, Not Implemented)
                                                          
  The design intends a producer/consumer pattern via Kafka:
  - API services (producers) publish domain events (review.created, restaurant.created, etc.)                                                                
  - Worker services (consumers) process those events asynchronously and write to the database                                                                
                                                                                                                                                             
  This would decouple write operations from the HTTP request cycle. Currently the Kafka infra is deployed but all producers and workers are stubs — the app  
  falls back to synchronous direct DB writes.                                                                                                                
                                                                                                                                                             
  ---                                                                                                                                                        
  5. Container Orchestration (Docker + Kubernetes)
                                                  
  - Each service has its own Dockerfile (build artifact)
  - docker-compose.yml wires the full stack locally                                                                                                          
  - Kubernetes manifests (Deployment, Service, ConfigMap, Secret) handle production orchestration — scaling, service discovery, config injection             
                                                                                                                                                             
  ---                                                                                                                                                        
  6. JWT Stateful Sessions (Hybrid)                                                                                                                          
                                                                                                                                                             
  A mix of stateless and stateful auth:
  - JWTs are issued and validated cryptographically (stateless)                                                                                              
  - But sessions are also stored in MongoDB with a TTL index, enabling server-side invalidation on logout                                                    
                                                                                                         
  The problem: only user-service checks the session store. The other 3 services only validate the JWT signature, so logout doesn't actually invalidate tokens
   for those services.                                                                                                                                       
                                                                                                                                                             
  ---                                                                                                                                                        
  7. Layered Service Structure
                                                                                                                                                             
  Each FastAPI service follows the same internal layering:
                                                                                                                                                             
  routers/   → HTTP handlers (request/response)
  services/  → business logic                                                                                                                                
  schemas/   → Pydantic validation models                                                                                                                    
  database.py → MongoDB connection
  config.py  → settings from env vars                                                                                                                        
                                                                                                                                                             
  This is a consistent pattern but it's copy-pasted across all 4 services rather than shared — so any cross-cutting fix (e.g., security patch) must be       
  applied 4 times.                                                                                                                                           
                                                                                                                                                             
  ---             
  Key Tension
             
  The architecture is trying to be event-driven microservices but is currently operating as a distributed monolith — multiple services, one shared database,
  no real async messaging. The gap between intent and implementation is mainly the Kafka producer/consumer code (Part 2 of the lab).        