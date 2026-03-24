# Yelp Prototype

A full-stack restaurant discovery and review platform with an AI-powered recommendation assistant. Built with FastAPI, React, and LangChain.

![Python](https://img.shields.io/badge/Python-3.11+-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688) ![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1) ![LangChain](https://img.shields.io/badge/LangChain-Agents-green)

---

## Overview

Yelp Prototype lets users discover restaurants, write reviews, save favorites, and get personalized recommendations through a conversational AI assistant. Restaurant owners get a separate dashboard with review management and analytics.

### Key Capabilities

- **Restaurant Discovery** — Search, filter by cuisine/price/location, sort by rating or distance, with server-side pagination.
- **Reviews & Ratings** — Full CRUD for reviews with real-time aggregate rating updates.
- **Favorites & Activity** — Bookmark restaurants and track browsing/review history.
- **AI Assistant** — Natural-language restaurant recommendations powered by LangChain + Google Gemini, with Tavily web search for live context (hours, trends, events). Supports multi-turn conversations and session management.
- **Owner Dashboard** — Restaurant owners can manage listings, view reviews, upload photos, and access per-restaurant analytics.
- **User Preferences** — Cuisine preferences, dietary restrictions, price range, ambiance, and location radius feed directly into AI recommendations.

---

## Architecture

![System Architecture](docs/system-diagram.png)

### Frontend — React + Vite

Two user personas (End User, Restaurant Owner) enter through a shared **App Router** into role-specific pages: Explore, Detail, Favorites, Profile, and Owner Dashboard. An **Axios API Service** handles all backend communication, attaching the JWT stored in `localStorage` as a Bearer token on every request.

### Backend — FastAPI

`main.py` bootstraps CORS, mounts all routers, and exposes a health endpoint. Requests flow through a **Global Error Handler** and seven modular routers:

| Router | Responsibility |
|--------|---------------|
| **Auth Router** | signup / login / logout |
| **Users Router** | profile / preferences |
| **Restaurants Router** | CRUD / search / photos / claim |
| **Reviews Router** | create / update / delete |
| **Favorites Router** | bookmarks / history |
| **Owner Router** | dashboard / analytics |
| **AI Assistant Router** | chat / stream / history |

All protected routers pass through **Security Utils** (`JWT + get_current_user`) before touching the data layer. File uploads (profile pics, restaurant photos) are served from a static `/uploads` directory.

### Data Layer

**SQLAlchemy** (`SessionLocal` / `get_db` dependency) connects to a **MySQL** `yelp_db` instance. All routers share the same session factory.

### AI Services

The AI Assistant Router delegates to a **LangChain ReAct Agent** backed by **Google Gemini 2.5 Flash Lite**. The agent has access to three components:

- **Preferences Loader** — pulls the current user's saved preferences (cuisines, dietary needs, price range, location, ambiance) from the database at the start of each chat request.
- **`search_restaurants` tool** — structured query against the MySQL restaurant data with filters derived from the user's message + preferences.
- **`tavily_search` tool** — calls the **Tavily Web Search** API for live external context (hours, trending dishes, local events).

A **Conversation Manager** handles session memory and chat history persistence, enabling multi-turn follow-up conversations.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL 8.0+

### 1. Clone

```bash
git clone https://github.com/<your-username>/yelp-prototype.git
cd yelp-prototype
```

### 2. Environment Variables

Create `.env` at the project root:

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

### 3. Database

```bash
mysql -u <user> -p -e "CREATE DATABASE IF NOT EXISTS yelp_db;"
mysql -u <user> -p yelp_db < backend/app/yelp_db.sql
```

Seed sample restaurants and reviews:

```bash
cd backend
python -m app.seed_restaurants
```

### 4. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
.
├── backend/
│   └── app/
│       ├── main.py                  # App entrypoint, router registration
│       ├── models.py                # SQLAlchemy models
│       ├── schemas.py               # Pydantic request/response schemas
│       ├── routers/
│       │   ├── auth.py              # Signup, login, logout
│       │   ├── users.py             # Profile, preferences
│       │   ├── restaurants.py       # CRUD, search, photos
│       │   ├── reviews.py           # Review CRUD
│       │   ├── favorites.py         # Favorites, activity history
│       │   ├── owner.py             # Owner dashboard, analytics
│       │   └── ai_assistant.py      # Chat, streaming, sessions
│       ├── services/
│       │   ├── assistant.py         # LangChain agent logic
│       │   ├── tools.py             # Restaurant search + Tavily tools
│       │   └── memory.py            # Conversation session management
│       ├── yelp_db.sql              # Schema and seed SQL
│       ├── seed_restaurants.py      # Data seeding script
│       └── sync_restaurant_aggregates.py
├── frontend/
│   └── src/
│       ├── pages/                   # Route-level page components
│       ├── components/              # Shared UI components
│       └── services/
│           └── api.js               # Axios API integration layer
├── .env
└── README.md
```

---

## API Reference

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register as a reviewer |
| `POST` | `/auth/owner/signup` | Register as a restaurant owner |
| `POST` | `/auth/login` | Returns JWT token |
| `POST` | `/auth/logout` | Invalidate session |

### Users & Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` | Current user profile |
| `PUT` | `/users/me` | Update profile fields |
| `PUT` | `/users/me/profile-pic` | Upload profile photo |
| `POST` | `/users/me/preferences` | Create or update preferences |
| `GET` | `/users/me/preferences` | Fetch saved preferences |

### Restaurants

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/restaurants` | Create a restaurant |
| `GET` | `/restaurants` | Search with filters, sort, pagination |
| `GET` | `/restaurants/{id}` | Restaurant details |
| `PUT` | `/restaurants/{id}` | Update restaurant |
| `POST` | `/restaurants/{id}/photos` | Upload photos |
| `POST` | `/restaurants/{id}/claim` | Owner claims a listing |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/restaurants/{id}/reviews` | Submit a review |
| `GET` | `/restaurants/{id}/reviews` | List reviews for a restaurant |
| `PUT` | `/reviews/{id}` | Edit a review |
| `DELETE` | `/reviews/{id}` | Delete a review |

### Favorites

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/favorites/{restaurant_id}` | Add to favorites |
| `DELETE` | `/favorites/{restaurant_id}` | Remove from favorites |
| `GET` | `/favorites` | List all favorites |
| `GET` | `/favorites/me/history` | Activity/browsing history |

### Owner Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/owner/restaurants` | Owner's restaurant listings |
| `GET` | `/owner/restaurants/{id}/reviews` | Reviews on owned restaurant |
| `GET` | `/owner/restaurants/{id}/analytics` | Rating trends and review analytics |

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai-assistant/chat` | Send a message, get recommendations |
| `POST` | `/ai-assistant/chat/stream` | Streaming response variant |
| `GET` | `/ai-assistant/chat/history` | Conversation history for a session |
| `POST` | `/ai-assistant/chat/clear` | Clear a chat session |
| `GET` | `/ai-assistant/sessions` | List all chat sessions |

#### Chat Example

**Request:**

```json
POST /ai-assistant/chat
{
  "message": "Find casual vegan restaurants in San Jose under $$",
  "session_id": "default"
}
```

**Response:**

```json
{
  "response": "Here are a few casual vegan-friendly options in San Jose...",
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

---

## AI Assistant — How It Works

1. **Preferences Loader** — On each chat request, the user's saved preferences (cuisines, dietary needs, price range, location, ambiance) are pulled from the database and injected into the agent's system prompt.
2. **ReAct Agent** — A LangChain ReAct agent powered by Gemini 2.5 Flash Lite interprets the natural-language query and decides which tools to invoke.
3. **`search_restaurants` Tool** — Queries the MySQL database with structured filters derived from the user's message and preferences.
4. **`tavily_search` Tool** — Fetches live information (hours, trending dishes, local events) to enrich recommendations.
5. **Response Generation** — Gemini synthesizes tool outputs into a conversational reply with structured recommendation cards.
6. **Conversation Manager** — Session memory and chat history are persisted per session, enabling follow-up questions and context-aware dialogue.

---

## Maintenance Scripts

**Recompute aggregate ratings** (sync `avg_rating` and `review_count` from review data):

```bash
cd backend
python -m app.sync_restaurant_aggregates
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | MySQL 8.0 |
| Auth | JWT (HS256), bcrypt via passlib |
| AI/LLM | LangChain (ReAct Agent), Google Gemini 2.5 Flash Lite |
| Web Search | Tavily API |
| API Docs | Swagger UI (auto-generated) |

---

## License

MIT