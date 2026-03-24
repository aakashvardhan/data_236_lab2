# Yelp Prototype - FastAPI + ReactJS + Agentic AI

This repository contains a Yelp-style restaurant discovery and review platform built with:

- `frontend/`: ReactJS (Vite)
- `backend/`: FastAPI + SQLAlchemy
- `database`: MySQL
- `AI assistant`: LangChain + Google Gemini + Tavily web search tool

---

## Assignment Context

- **Course Lab**: Yelp Prototype using FastAPI, ReactJS, and Agentic AI
- **Due Date**: March 24, 2026, 11:59 PM
- **Total Points**: 40

### Prerequisites

- Ability to run basic Python applications
- Ability to run basic React applications
- Working knowledge of JavaScript and Python

---

## Project Goal

Develop a Yelp-like application that supports two personas:

1. **User (Reviewer)**
2. **Restaurant Owner**

The platform supports restaurant discovery, search, reviews, favorites, owner analytics, and an AI-powered chatbot that uses user preferences and live web context.

---

## High-Level Architecture

### Frontend (React + Vite)

- Authentication screens (signup/login)
- User dashboard and restaurant discovery screens
- Restaurant details and reviews interface
- Owner dashboard and owner restaurant management pages
- Profile management and preferences management
- AI assistant chat experience (including streaming and history)

### Backend (FastAPI)

- Modular route design using FastAPI routers
- JWT-based authentication and authorization
- SQLAlchemy ORM data access with MySQL
- Profile, preferences, restaurants, reviews, favorites, and owner analytics APIs
- AI assistant endpoint(s) integrating LangChain tools

### AI Assistant Service

- Loads user preferences on chat session use
- Uses LLM + tools for restaurant discovery conversations
- Uses Tavily for external context (for example: hours, current trends, events)
- Returns conversational text and structured recommendation cards

---

## Repository Structure

- `README.md`: root project guide (this file)
- `backend/`: FastAPI service and MySQL integration
  - `backend/app/main.py`: API entrypoint and router registration
  - `backend/app/routers/`: route modules (auth, users, restaurants, reviews, favorites, owner, ai_assistant)
  - `backend/app/services/`: assistant logic, tools, conversation memory, preference loading
  - `backend/app/models.py`: SQLAlchemy models
  - `backend/app/schemas.py`: request/response schemas
  - `backend/app/yelp_db.sql`: SQL dump/schema reference
  - `backend/app/seed_restaurants.py`: seed script
  - `backend/app/sync_restaurant_aggregates.py`: aggregate consistency script
- `frontend/`: React application
  - `frontend/src/pages/`: app pages (dashboard, profile, login, signup, owner pages, etc.)
  - `frontend/src/components/`: reusable UI components
  - `frontend/src/services/api.js`: API integration layer

---

## Feature Requirements Coverage

The following sections summarize lab requirements and where they are implemented in this project.

### 1) Signup (User + Owner)

**Requirement**:
- Signup with name, email, password
- Secure password storage with bcrypt

**Implementation**:
- `POST /auth/signup` (default reviewer user)
- `POST /auth/owner/signup` (owner role path)
- Password hashing via backend security utility (`bcrypt` through `passlib`)

### 2) Login / Logout

**Requirement**:
- Session-based or JWT-based auth

**Implementation**:
- JWT-based auth:
  - `POST /auth/login`
  - Bearer-token protected routes with `get_current_user`
- Logout endpoint:
  - `POST /auth/logout`

### 3) Profile Page

**Requirement**:
- Show user profile and profile photo
- Update name, email, phone, about me, city, country, languages, gender
- Country dropdown and abbreviated state support in UI

**Implementation**:
- `GET /users/me`
- `PUT /users/me`
- `PUT /users/me/profile-pic`
- Profile schema supports name/phone/about_me/city/state/country/languages/gender
- Profile image validation includes allowed types and size limits

### 4) User Preferences

**Requirement**:
- Save user preferences for AI assistant:
  - cuisines
  - price range
  - preferred locations/search radius
  - dietary restrictions
  - ambiance
  - sort preference

**Implementation**:
- `POST /users/me/preferences` (create or update)
- `GET /users/me/preferences` (fetch)
- Preference fields available in schema:
  - `cuisines`
  - `price_range`
  - `preferred_locations`
  - `dietary_needs`
  - `ambience`
  - `sort_preference`

### 5) Restaurant Search Dashboard + AI Chatbot

**Requirement**:
- AI assistant endpoint
- Input includes message and conversation context
- Output includes recommendations and conversational response
- Follow-up conversation support
- Tavily context integration

**Implementation**:
- AI routes:
  - `POST /ai-assistant/chat`
  - `POST /ai-assistant/chat/stream`
  - `GET /ai-assistant/chat/history`
  - `POST /ai-assistant/chat/clear`
  - `GET /ai-assistant/sessions`
- Assistant service:
  - Loads user preferences from DB
  - Uses LangChain tools
  - Uses Tavily search tool for additional context
  - Returns structured recommendation objects (`id`, `name`, `rating`, `pricing_tier`, `cuisines`)
  - Supports multi-turn conversation with session management

---

## API Documentation Requirement

This project uses **Swagger/OpenAPI** through FastAPI.

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- OpenAPI JSON: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

If needed for submission, you can also export a Postman collection from the OpenAPI spec.

---

## Non-Functional Requirements

### Responsiveness

- Frontend uses responsive React component/page patterns and can be tested at mobile/tablet/desktop breakpoints.

### Accessibility

- Frontend should include semantic markup, alt text for images, and keyboard-friendly interaction paths.
- Validate with browser accessibility tooling before submission.

### Scalability / Performance

- Restaurant listing uses server-side filtering, sorting, and pagination.
- Aggregate rating values are maintained and can be recomputed with sync utilities.

---

## Local Development Setup

## 1) Clone and enter project

```bash
git clone <your-repository-url>
cd edu
```

## 2) Create root `.env`

Create `.env` at repository root (`edu/.env`) with:

```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yelp_db

JWT_SECRET_KEY=change-me
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

GEMINI_API_KEY=
TAVILY_API_KEY=
HF_API_TOKEN=
YELP_API_KEY=

VITE_API_BASE_URL=http://localhost:8000
```

## 3) Database setup (MySQL)

Create DB and import SQL if required:

```bash
mysql -u <user> -p -e "CREATE DATABASE IF NOT EXISTS yelp_db;"
mysql -u <user> -p yelp_db < backend/app/yelp_db.sql
```

## 4) Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend URLs:

- API root: [http://localhost:8000](http://localhost:8000)
- Health: [http://localhost:8000/health](http://localhost:8000/health)
- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

## 5) Run frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- [http://localhost:5173](http://localhost:5173)

---

## Backend API Endpoint Reference

All protected endpoints require `Authorization: Bearer <token>`.

### Health

- `GET /`
- `GET /health`

### Auth

- `POST /auth/signup`
- `POST /auth/owner/signup`
- `POST /auth/login`
- `POST /auth/logout`

### Users and Preferences

- `GET /users/me`
- `PUT /users/me`
- `PUT /users/me/profile-pic`
- `POST /users/me/preferences`
- `GET /users/me/preferences`

### Restaurants

- `POST /restaurants`
- `GET /restaurants`
- `GET /restaurants/{restaurant_id}`
- `PUT /restaurants/{restaurant_id}`
- `POST /restaurants/{restaurant_id}/photos`
- `POST /restaurants/{restaurant_id}/claim`

### Reviews

- `POST /restaurants/{restaurant_id}/reviews`
- `GET /restaurants/{restaurant_id}/reviews`
- `PUT /reviews/{review_id}`
- `DELETE /reviews/{review_id}`

### Favorites and Activity

- `POST /favorites/{restaurant_id}`
- `DELETE /favorites/{restaurant_id}`
- `GET /favorites`
- `GET /favorites/me/history`

### Owner

- `GET /owner/restaurants`
- `GET /owner/restaurants/{restaurant_id}/reviews`
- `GET /owner/restaurants/{restaurant_id}/analytics`

### AI Assistant

- `POST /ai-assistant/chat`
- `POST /ai-assistant/chat/stream`
- `GET /ai-assistant/chat/history`
- `POST /ai-assistant/chat/clear`
- `GET /ai-assistant/sessions`

---

## AI Assistant Details

### Required Endpoint

- `POST /ai-assistant/chat`

Request body example:

```json
{
  "message": "Find casual vegan restaurants in San Jose under $$",
  "session_id": "default"
}
```

Response shape:

```json
{
  "response": "Here are a few casual vegan-friendly options...",
  "recommendations": [
    {
      "id": 12,
      "name": "Green Leaf Cafe",
      "rating": 4.4,
      "pricing_tier": "$$",
      "cuisines": "Vegan, Cafe"
    }
  ],
  "session_id": "default"
}
```

### Current AI Workflow

1. Load user preferences from database
2. Parse natural-language query using LangChain-powered agent flow
3. Use restaurant search tool for filtered retrieval
4. Optionally use Tavily for supplementary context
5. Rank and return recommendations
6. Persist conversation history for follow-up chat

---

## Seed Data and Maintenance Scripts

From `backend/`:

```bash
python -m app.seed_restaurants
```

Purpose:

- Seed restaurants and related data
- Seed synthetic review rows
- Build realistic test/discovery data for UI and AI assistant

To recompute aggregate fields (`avg_rating`, `review_count`) from reviews:

```bash
python -m app.sync_restaurant_aggregates
```

---

## Suggested Testing Checklist

- Signup/login for reviewer and owner personas
- Profile update, including profile picture upload
- Preferences create/update/read flow
- Restaurant search filters and sorting
- Review create/update/delete and average rating updates
- Favorites add/remove/list
- Owner restaurant list + analytics route validation
- AI assistant basic query + follow-up + clear chat
- Swagger route validation and sample API testing

---

## Report Guidelines (Submission Companion)

Include a brief report (`YourName_Lab1_Report.doc`) with:

1. **Introduction**  
   Problem statement, objective, and scope.
2. **System Design**  
   Architecture with React + FastAPI + MySQL + AI assistant service.
3. **AI Implementation**  
   How chatbot interprets queries, uses preferences, and retrieves recommendations.
4. **Results**  
   Screenshots for:
   - Home/dashboard with chatbot
   - Restaurant search/list
   - Restaurant details
   - Profile + preferences
   - Reviews flow
   - Chatbot conversation examples
   - API test outputs (Swagger or Postman)

---

## Git and Repository Guidelines

- Keep commit messages clear and descriptive.
- Do not include `venv/`, `.venv/`, or `__pycache__/`.
- Keep dependency lists in `requirements.txt` and `package.json`.
- Keep this `README.md` updated with setup and execution steps.
- Ensure required collaborators are invited to your private repository as specified by lab instructions.

---

## Final Submission Checklist

- [ ] Backend runs locally
- [ ] Frontend runs locally
- [ ] MySQL database configured and connected
- [ ] Required features for both personas implemented
- [ ] AI assistant integrated and functioning
- [ ] API documentation available via Swagger or Postman collection exported
- [ ] Report document completed with screenshots and explanation
- [ ] Project pushed before deadline
