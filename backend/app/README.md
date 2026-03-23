# Yelp Restaurant API

A restaurant discovery and review platform built with **FastAPI**, **SQLAlchemy**, and **MySQL**. Features JWT authentication, two user roles (user/owner), restaurant search, reviews, favorites, owner analytics, and file uploads.

## Tech Stack

- **Framework**: FastAPI 0.115
- **ORM**: SQLAlchemy 2.0
- **Database**: MySQL (via PyMySQL)
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Validation**: Pydantic v2

## Project Structure

```
app/
├── main.py              # FastAPI app, lifespan, CORS, router mounting
├── config.py            # Pydantic settings (env vars)
├── database.py          # SQLAlchemy engine and session
├── models.py            # ORM models (User, Restaurant, Review, Favorite, UserPreference)
├── schemas.py           # Pydantic request/response schemas
├── routers/
│   ├── auth.py          # Signup, login, logout
│   ├── users.py         # Profile, preferences, profile pic upload
│   ├── restaurants.py   # CRUD, search, photo upload, claim
│   ├── reviews.py       # Create, list, update, delete reviews
│   ├── favorites.py     # Bookmark restaurants, user history
│   └── owner.py         # Owner dashboard and analytics
└── utils/
    ├── security.py      # Password hashing, JWT encode/decode, get_current_user
    └── ratings.py       # Recalculate avg_rating after review changes
```

## Setup

### Prerequisites

- Python 3.11+
- MySQL 8.0+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

### Install and run

```bash
git clone <repo-url> && cd data236-lab1-yelp
uv venv && uv pip install -r requirements.txt
mysql -u root -e "CREATE DATABASE IF NOT EXISTS yelp_db;"
```

Create a `.env` in the project root:

```env
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yelp_db
JWT_SECRET_KEY=your-secret-key # use python3 -c "import secrets; print(secrets.token_urlsafe(32))" to get key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

Start the server (tables are auto-created on startup):

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Roles

- **user** — Browse restaurants, write reviews, manage favorites
- **owner** — All user abilities + create/update own restaurants, claim unclaimed restaurants, view analytics

## Authentication

All endpoints marked with 🔒 require a Bearer token:

```
Authorization: Bearer <access_token>
```

Tokens are obtained from `POST /auth/login` and expire after 60 minutes.

---

## API Endpoints

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | — | Register a new user |
| POST | `/auth/login` | — | Log in, returns JWT |
| POST | `/auth/owner/signup` | — | Register an owner account |
| POST | `/auth/logout` | 🔒 | Log out |

**POST /auth/signup**

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "pass1234",
  "role": "user"
}
```

- `role`: `"user"` (default) or `"owner"`
- `password`: min 6 characters
- Returns: `UserProfileResponse` (`201`)
- Errors: `400` email already registered

**POST /auth/login**

```json
{
  "email": "alice@example.com",
  "password": "pass1234"
}
```

- Returns: `{ "access_token": "...", "token_type": "bearer" }`
- Errors: `401` invalid credentials

**POST /auth/owner/signup**

```json
{
  "name": "Bob",
  "email": "bob@example.com",
  "password": "pass1234",
  "role": "owner",
  "restaurant_location": "San Jose"
}
```

- `role` must be `"owner"`, `restaurant_location` is required
- Returns: `UserProfileResponse` (`201`)
- Errors: `400` if role is wrong, location missing, or email taken

---

### Users (`/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | 🔒 | Get own profile |
| PUT | `/users/me` | 🔒 | Update profile fields |
| PUT | `/users/me/profile-pic` | 🔒 | Upload profile picture |
| POST | `/users/me/preferences` | 🔒 | Create/update dining preferences |
| GET | `/users/me/preferences` | 🔒 | Get dining preferences |

**PUT /users/me** — only provided fields are updated

```json
{
  "city": "San Jose",
  "state": "CA",
  "about_me": "Food lover",
  "gender": "male"
}
```

Optional fields: `name`, `phone`, `about_me`, `city`, `state`, `country`, `languages`, `gender`

**PUT /users/me/profile-pic** — `multipart/form-data`

- Field: `file` (`.jpg`, `.jpeg`, `.png`, `.webp`, max 5 MB)
- Returns: `{ "profile_picture": "/uploads/profile_pics/..." }`

**POST /users/me/preferences** — upserts (creates or updates)

```json
{
  "cuisines": "italian,mexican",
  "price_range": "$$",
  "preferred_locations": "downtown,midtown",
  "dietary_needs": "vegetarian",
  "ambience": "casual,cozy",
  "sort_preference": "rating"
}
```

`sort_preference` options: `"rating"` | `"distance"` | `"popularity"` | `"price"`

---

### Restaurants (`/restaurants`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/restaurants` | 🔒 | Create a restaurant |
| GET | `/restaurants/{id}` | — | Get restaurant by ID |
| GET | `/restaurants` | — | Search/list restaurants |
| PUT | `/restaurants/{id}` | 🔒 owner | Update own restaurant |
| POST | `/restaurants/{id}/photos` | 🔒 | Upload restaurant photo |
| POST | `/restaurants/{id}/claim` | 🔒 owner | Claim an unclaimed restaurant |

**POST /restaurants**

```json
{
  "name": "Bobs Pizza",
  "cuisine_type": "Italian",
  "description": "Best pizza in town",
  "city": "San Jose",
  "state": "CA",
  "zip_code": "95112",
  "pricing_tier": "$$"
}
```

- `pricing_tier` options: `"$"`, `"$$"`, `"$$$"`, `"$$$$"`
- If creator is an owner, the restaurant is auto-claimed
- Returns: `RestaurantResponse` (`201`)

**GET /restaurants** — search with optional filters

| Query Param | Type | Match | Description |
|-------------|------|-------|-------------|
| `name` | string | partial | Restaurant name |
| `cuisine_type` | string | partial | Cuisine type |
| `city` | string | partial | City |
| `zip_code` | string | partial | Zip code |
| `pricing_tier` | string | exact | `$`, `$$`, `$$$`, `$$$$` |
| `keywords` | string | partial | Searches name, cuisine, description |
| `page` | int | — | Page number (default 1) |
| `per_page` | int | — | Results per page (default 20, max 100) |

Response:

```json
{
  "items": [ "...RestaurantResponse" ],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "total_pages": 3
}
```

**PUT /restaurants/{id}** — owner only, partial update

- Errors: `403` if not the owner, `404` if not found

**POST /restaurants/{id}/photos** — `multipart/form-data`

- Field: `file` (`.jpg`, `.jpeg`, `.png`, `.webp`, max 5 MB)
- Returns: `{ "photo_url": "/uploads/restaurant_photos/..." }`

**POST /restaurants/{id}/claim** — owner claims an unclaimed restaurant

- Errors: `400` already claimed, `403` not an owner, `404` not found

---

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/restaurants/{id}/reviews` | 🔒 | Create a review |
| GET | `/restaurants/{id}/reviews` | — | List reviews for a restaurant |
| PUT | `/reviews/{id}` | 🔒 | Update own review |
| DELETE | `/reviews/{id}` | 🔒 | Delete own review |

**POST /restaurants/{id}/reviews** — one review per user per restaurant

```json
{
  "rating": 5,
  "comment": "Amazing pizza!"
}
```

- `rating`: integer 1–5 (required)
- Restaurant `avg_rating` and `review_count` are auto-recalculated
- Returns: `ReviewResponse` (`201`)
- Errors: `400` already reviewed, `404` restaurant not found

**PUT /reviews/{id}** — partial update, recalculates avg if rating changes

- Errors: `403` not the author, `404` not found

**DELETE /reviews/{id}** — recalculates avg after deletion

- Errors: `403` not the author, `404` not found

---

### Favorites (`/favorites`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/favorites/{restaurant_id}` | 🔒 | Bookmark a restaurant |
| GET | `/favorites` | 🔒 | List bookmarked restaurants |
| DELETE | `/favorites/{restaurant_id}` | 🔒 | Remove bookmark |
| GET | `/favorites/me/history` | 🔒 | User activity history |

**GET /favorites/me/history** response:

```json
{
  "reviews": [
    { "type": "review", "review_id": 1, "restaurant_id": 1, "restaurant_name": "...", "rating": 5, "comment": "...", "date": "..." }
  ],
  "restaurants_added": [
    { "type": "restaurant_added", "restaurant_id": 1, "restaurant_name": "...", "date": "..." }
  ]
}
```

---

### Owner Dashboard (`/owner`)

All endpoints require role `"owner"`. Regular users get `403`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/owner/restaurants` | 🔒 owner | List own restaurants |
| GET | `/owner/restaurants/{id}/reviews` | 🔒 owner | Reviews for own restaurant |
| GET | `/owner/restaurants/{id}/analytics` | 🔒 owner | Analytics for own restaurant |

**GET /owner/restaurants/{id}/analytics** response:

```json
{
  "restaurant_id": 1,
  "restaurant_name": "Bobs Pizza",
  "total_reviews": 25,
  "avg_rating": 4.2,
  "review_count": 25,
  "rating_distribution": { "1": 0, "2": 1, "3": 3, "4": 10, "5": 11 },
  "recent_reviews": [
    { "id": 1, "rating": 5, "comment": "...", "created_at": "..." }
  ]
}
```

---

## Error Format

```json
{ "detail": "Human-readable error message" }
```

| Code | Meaning |
|------|---------|
| `400` | Bad request (validation, duplicates) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (wrong role or not the owner) |
| `404` | Resource not found |
| `422` | Validation error (Pydantic) |

## Database Schema

Five tables, auto-created on startup:

- **users** — profile + role (`user`/`owner`)
- **user_preferences** — one row per user (cuisines, dietary, ambience, etc.)
- **restaurants** — listing with `owner_id` (nullable = unclaimed)
- **reviews** — unique constraint on `(user_id, restaurant_id)`
- **favorites** — unique constraint on `(user_id, restaurant_id)`