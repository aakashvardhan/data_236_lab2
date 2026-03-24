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
