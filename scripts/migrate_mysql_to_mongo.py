"""
MySQL to MongoDB migration script.

Usage:
    pip install pymysql pymongo bcrypt
    python scripts/migrate_mysql_to_mongo.py

Environment variables:
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
    MONGO_URI, MONGO_DB_NAME
"""

import os
import sys
from datetime import datetime

import bcrypt
import pymysql
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING


MYSQL_HOST = os.environ.get("MYSQL_HOST", "mysql")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", "3306"))
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
MYSQL_DB = os.environ.get("MYSQL_DB", "yelp_db")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")

SESSION_TTL_SECONDS = 24 * 60 * 60
ACTIVITY_LOG_TTL_SECONDS = 90 * 24 * 60 * 60


def connect_mysql():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor,
    )


def connect_mongo():
    client = MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def is_bcrypt_hash(value: str) -> bool:
    return value.startswith(("$2a$", "$2b$", "$2y$"))


def ensure_bcrypt(password_hash: str) -> str:
    if is_bcrypt_hash(password_hash):
        return password_hash
    hashed = bcrypt.hashpw(password_hash.encode(), bcrypt.gensalt())
    return hashed.decode()


def fetch_all(mysql_conn, table: str) -> list[dict]:
    with mysql_conn.cursor() as cur:
        cur.execute(f"SELECT * FROM {table}")
        return cur.fetchall()


def migrate_users(mysql_conn, mongo_db):
    print("Migrating users...")
    users = fetch_all(mysql_conn, "users")
    preferences = fetch_all(mysql_conn, "user_preferences")
    pref_by_user = {p["user_id"]: p for p in preferences}

    docs = []
    id_map = {}

    for u in users:
        pref = pref_by_user.get(u["id"])
        prefs_doc = None
        if pref:
            prefs_doc = {
                "cuisines": pref.get("cuisines"),
                "price_range": pref.get("price_range"),
                "preferred_locations": pref.get("preferred_locations"),
                "dietary_needs": pref.get("dietary_needs"),
                "ambience": pref.get("ambience"),
                "sort_preference": pref.get("sort_preference"),
            }

        doc = {
            "_mysql_id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "password_hash": ensure_bcrypt(u["password_hash"]),
            "role": u["role"],
            "phone": u.get("phone"),
            "about_me": u.get("about_me"),
            "city": u.get("city"),
            "state": u.get("state"),
            "country": u.get("country"),
            "languages": u.get("languages"),
            "gender": u.get("gender"),
            "profile_picture": u.get("profile_picture"),
            "preferences": prefs_doc,
            "created_at": u.get("created_at", datetime.utcnow()),
            "updated_at": u.get("updated_at", datetime.utcnow()),
        }
        docs.append(doc)

    if docs:
        result = mongo_db.users.insert_many(docs)
        for doc, oid in zip(docs, result.inserted_ids):
            id_map[doc["_mysql_id"]] = str(oid)
        print(f"  Inserted {len(docs)} users")
    else:
        print("  No users to migrate")

    return id_map


def migrate_restaurants(mysql_conn, mongo_db, user_id_map: dict) -> dict:
    print("Migrating restaurants...")
    restaurants = fetch_all(mysql_conn, "restaurants")
    docs = []
    id_map = {}

    for r in restaurants:
        owner_id = user_id_map.get(r.get("owner_id")) if r.get("owner_id") else None
        doc = {
            "_mysql_id": r["id"],
            "owner_id": owner_id,
            "name": r["name"],
            "cuisine_type": r.get("cuisine_type"),
            "description": r.get("description"),
            "address": r.get("address"),
            "city": r.get("city"),
            "state": r.get("state"),
            "zip_code": r.get("zip_code"),
            "country": r.get("country"),
            "contact_info": r.get("contact_info"),
            "hours": r.get("hours"),
            "photos": r.get("photos"),
            "pricing_tier": r.get("pricing_tier"),
            "avg_rating": float(r.get("avg_rating") or 0),
            "review_count": int(r.get("review_count") or 0),
            "created_at": r.get("created_at", datetime.utcnow()),
            "updated_at": r.get("updated_at", datetime.utcnow()),
        }
        docs.append(doc)

    if docs:
        result = mongo_db.restaurants.insert_many(docs)
        for doc, oid in zip(docs, result.inserted_ids):
            id_map[doc["_mysql_id"]] = str(oid)
        print(f"  Inserted {len(docs)} restaurants")
    else:
        print("  No restaurants to migrate")

    return id_map


def migrate_reviews(mysql_conn, mongo_db, user_id_map: dict, restaurant_id_map: dict):
    print("Migrating reviews...")
    reviews = fetch_all(mysql_conn, "reviews")
    docs = []

    for r in reviews:
        user_id = user_id_map.get(r["user_id"])
        restaurant_id = restaurant_id_map.get(r["restaurant_id"])
        if not user_id or not restaurant_id:
            continue

        doc = {
            "user_id": user_id,
            "restaurant_id": restaurant_id,
            "rating": int(r["rating"]),
            "comment": r.get("comment"),
            "photos": r.get("photos"),
            "created_at": r.get("created_at", datetime.utcnow()),
            "updated_at": r.get("updated_at", datetime.utcnow()),
        }
        docs.append(doc)

    if docs:
        mongo_db.reviews.insert_many(docs)
        print(f"  Inserted {len(docs)} reviews")
    else:
        print("  No reviews to migrate")


def migrate_favorites(mysql_conn, mongo_db, user_id_map: dict, restaurant_id_map: dict):
    print("Migrating favorites...")
    favorites = fetch_all(mysql_conn, "favorites")
    docs = []

    for f in favorites:
        user_id = user_id_map.get(f["user_id"])
        restaurant_id = restaurant_id_map.get(f["restaurant_id"])
        if not user_id or not restaurant_id:
            continue

        doc = {
            "user_id": user_id,
            "restaurant_id": restaurant_id,
            "created_at": f.get("created_at", datetime.utcnow()),
        }
        docs.append(doc)

    if docs:
        mongo_db.favorites.insert_many(docs)
        print(f"  Inserted {len(docs)} favorites")
    else:
        print("  No favorites to migrate")


def extract_photos(mongo_db, user_id_map: dict, restaurant_id_map: dict):
    """Extract inline photo URLs into a dedicated photos collection."""
    print("Extracting photos into photos collection...")
    photo_docs = []

    for rest in mongo_db.restaurants.find({"photos": {"$ne": None, "$ne": ""}}):
        photos_str = rest.get("photos", "")
        if not photos_str:
            continue
        for url in photos_str.split(","):
            url = url.strip()
            if url:
                photo_docs.append({
                    "entity_type": "restaurant",
                    "entity_id": str(rest["_id"]),
                    "url": url,
                    "uploaded_by": rest.get("owner_id"),
                    "created_at": rest.get("created_at", datetime.utcnow()),
                })

    for rev in mongo_db.reviews.find({"photos": {"$ne": None, "$ne": ""}}):
        photos_str = rev.get("photos", "")
        if not photos_str:
            continue
        for url in photos_str.split(","):
            url = url.strip()
            if url:
                photo_docs.append({
                    "entity_type": "review",
                    "entity_id": str(rev["_id"]),
                    "url": url,
                    "uploaded_by": rev.get("user_id"),
                    "created_at": rev.get("created_at", datetime.utcnow()),
                })

    if photo_docs:
        mongo_db.photos.insert_many(photo_docs)
        print(f"  Extracted {len(photo_docs)} photo documents")
    else:
        print("  No photos to extract")


def create_activity_logs_collection(mongo_db):
    """Create activity_logs as an empty collection with schema validation."""
    print("Creating activity_logs collection with schema validation...")
    validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["user_id", "action", "entity_type", "created_at"],
            "properties": {
                "user_id": {"bsonType": "string"},
                "action": {"bsonType": "string"},
                "entity_type": {"bsonType": "string"},
                "entity_id": {"bsonType": "string"},
                "metadata": {"bsonType": "object"},
                "created_at": {"bsonType": "date"},
            },
        }
    }
    try:
        mongo_db.create_collection("activity_logs", validator=validator)
    except Exception:
        mongo_db.command("collMod", "activity_logs", validator=validator)
    print("  activity_logs collection ready")


def create_indexes(mongo_db):
    print("Creating indexes...")

    mongo_db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True),
    ])

    mongo_db.restaurants.create_indexes([
        IndexModel([("name", ASCENDING)]),
        IndexModel([("city", ASCENDING)]),
    ])

    mongo_db.reviews.create_indexes([
        IndexModel([("restaurant_id", ASCENDING)]),
        IndexModel(
            [("user_id", ASCENDING), ("restaurant_id", ASCENDING)],
            unique=True,
        ),
    ])

    mongo_db.favorites.create_indexes([
        IndexModel(
            [("user_id", ASCENDING), ("restaurant_id", ASCENDING)],
            unique=True,
        ),
    ])

    mongo_db.sessions.create_indexes([
        IndexModel([("token", ASCENDING)], unique=True),
        IndexModel(
            [("created_at", ASCENDING)],
            expireAfterSeconds=SESSION_TTL_SECONDS,
        ),
    ])

    mongo_db.photos.create_indexes([
        IndexModel([("entity_type", ASCENDING), ("entity_id", ASCENDING)]),
    ])

    mongo_db.activity_logs.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel(
            [("created_at", ASCENDING)],
            expireAfterSeconds=ACTIVITY_LOG_TTL_SECONDS,
        ),
    ])

    mongo_db.conversation_messages.create_indexes([
        IndexModel([("user_id", ASCENDING), ("session_id", ASCENDING)]),
    ])

    print("  All indexes created")


def main():
    print("=" * 60)
    print("MySQL -> MongoDB Migration")
    print("=" * 60)

    mysql_conn = connect_mysql()
    mongo_db = connect_mongo()

    # Drop existing collections for a clean migration
    for col in ["users", "restaurants", "reviews", "favorites",
                 "photos", "conversation_messages"]:
        mongo_db[col].drop()

    user_id_map = migrate_users(mysql_conn, mongo_db)
    restaurant_id_map = migrate_restaurants(mysql_conn, mongo_db, user_id_map)
    migrate_reviews(mysql_conn, mongo_db, user_id_map, restaurant_id_map)
    migrate_favorites(mysql_conn, mongo_db, user_id_map, restaurant_id_map)
    extract_photos(mongo_db, user_id_map, restaurant_id_map)
    create_activity_logs_collection(mongo_db)
    create_indexes(mongo_db)

    # Clean up temporary _mysql_id fields
    mongo_db.users.update_many({}, {"$unset": {"_mysql_id": ""}})
    mongo_db.restaurants.update_many({}, {"$unset": {"_mysql_id": ""}})

    mysql_conn.close()

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
