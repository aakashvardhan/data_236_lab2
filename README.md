# Yelp-Style Restaurant Platform

Full-stack restaurant discovery and review app with:
- FastAPI backend
- React + Vite frontend
- MySQL persistence
- AI assistant support

## Project Structure

- `backend/` - FastAPI application, routers, models, seed scripts
- `frontend/` - React UI (Vite), restaurant browsing and review UX

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- MySQL 8+

## Environment Setup

Create a `.env` file at repository root with at least:

```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yelp_db
JWT_SECRET_KEY=change-me
GEMINI_API_KEY=
TAVILY_API_KEY=
HF_API_TOKEN=
YELP_API_KEY=
```

For frontend API routing (optional but recommended), set:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Backend - Run Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend docs:
- Swagger: <http://localhost:8000/docs>
- Health: <http://localhost:8000/health>

## Frontend - Run Locally

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:
- <http://localhost:5173>

## Seed Data

From `backend/`:

```bash
python -m app.seed_restaurants
```

This seeds restaurants, images, users for fake reviews, and synthetic review rows.

## Aggregate Consistency Sync

To sync `restaurants.avg_rating` and `restaurants.review_count` with actual `reviews` rows:

```bash
cd backend
python -m app.sync_restaurant_aggregates
```

Use this after imports/migrations if summary counts drift from stored reviews.

## Notes

- Restaurant sorting is server-side (`rating`, `reviews`, `price`, etc.) with pagination.
- Photo URLs are resolved via environment-aware frontend helpers.
- `reviews` rows are the source of truth; aggregate fields are derived.
