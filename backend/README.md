# Backend Service

FastAPI backend for the Yelp-style restaurant platform.

## Tech Stack

- FastAPI
- SQLAlchemy
- MySQL (via `pymysql`)
- JWT auth
- LangChain-based AI assistant integrations

## Folder Highlights

- `app/main.py` - app entrypoint and router registration
- `app/models.py` - SQLAlchemy models
- `app/routers/` - API route modules
- `app/services/` - assistant and supporting service logic
- `app/utils/` - shared helpers (security, ratings, etc.)
- `app/seed_restaurants.py` - restaurant + fake review seed script
- `app/sync_restaurant_aggregates.py` - aggregate consistency sync script

## Local Setup

From the `backend/` directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment Variables

The backend reads environment values from root `.env`.

Required DB/auth keys:

```env
DB_USER=
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yelp_db
JWT_SECRET_KEY=change-me
```

Optional AI/integration keys:

```env
GEMINI_API_KEY=
TAVILY_API_KEY=
HF_API_TOKEN=
YELP_API_KEY=
```

## Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

Useful endpoints:
- `GET /health`
- `GET /docs`

## API Endpoints

Most endpoints return JSON. Auth-protected routes require a Bearer token from
`POST /auth/login`.

### Health

- `GET /` - service status message
- `GET /health` - health check

### Auth

- `POST /auth/signup` - register a standard user
- `POST /auth/owner/signup` - register a restaurant owner
- `POST /auth/login` - authenticate user and get access token
- `POST /auth/logout` - logout current user

### Users

- `GET /users/me` - fetch authenticated user profile
- `PUT /users/me` - update authenticated user profile
- `PUT /users/me/profile-pic` - update profile picture
- `POST /users/me/preferences` - create/update user preferences
- `GET /users/me/preferences` - fetch user preferences

### Restaurants

- `POST /restaurants` - create a new restaurant
- `GET /restaurants` - list/search restaurants
- `GET /restaurants/{restaurant_id}` - get restaurant details
- `PUT /restaurants/{restaurant_id}` - update a restaurant
- `POST /restaurants/{restaurant_id}/photos` - upload a restaurant photo
- `POST /restaurants/{restaurant_id}/claim` - claim ownership of a restaurant

### Reviews

- `POST /restaurants/{restaurant_id}/reviews` - create a review
- `GET /restaurants/{restaurant_id}/reviews` - list reviews for a restaurant
- `PUT /reviews/{review_id}` - update a review
- `DELETE /reviews/{review_id}` - delete a review

### Favorites

- `POST /favorites/{restaurant_id}` - add restaurant to favorites
- `DELETE /favorites/{restaurant_id}` - remove restaurant from favorites
- `GET /favorites` - list authenticated user favorites
- `GET /favorites/me/history` - fetch favorite history data

### Owner

- `GET /owner/restaurants` - list owner-managed restaurants
- `GET /owner/restaurants/{restaurant_id}/reviews` - list restaurant reviews for owner
- `GET /owner/restaurants/{restaurant_id}/analytics` - fetch owner analytics

### AI Assistant

- `POST /ai-assistant/chat` - send a chat message
- `POST /ai-assistant/chat/stream` - stream chat response
- `GET /ai-assistant/chat/history` - fetch chat history
- `POST /ai-assistant/chat/clear` - clear chat history
- `GET /ai-assistant/sessions` - list chat sessions

## Seed Data

```bash
python -m app.seed_restaurants
```

This script:
- seeds restaurants (with images)
- seeds synthetic review rows
- updates aggregate fields (`avg_rating`, `review_count`)

## Sync Aggregate Ratings/Counts

Use this if aggregate fields drift from real review rows:

```bash
python -m app.sync_restaurant_aggregates
```

This recomputes each restaurant's:
- `avg_rating`
- `review_count`

using `reviews` table as source of truth.
