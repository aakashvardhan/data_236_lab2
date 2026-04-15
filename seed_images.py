"""
seed_images.py — Download food images and attach them to seeded restaurants.

Run inside a Docker service container that shares the uploads volume:
    docker compose cp seed_images.py user-service:/tmp/seed_images.py
    docker compose exec user-service python /tmp/seed_images.py
"""

import os
import urllib.request
import uuid

from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")
UPLOAD_DIR = "uploads/restaurant_photos"

FOOD_IMAGES = [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600",
    "https://images.unsplash.com/photo-1529693662653-9d480530a697?w=600",
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600",
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600",
    "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600",
    "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600",
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600",
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600",
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600",
    "https://images.unsplash.com/photo-1432139509613-5c4255815697?w=600",
    "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600",
]


def download_image(url, filepath):
    """Download an image from URL to local filepath."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            with open(filepath, "wb") as f:
                f.write(resp.read())
        return True
    except Exception as e:
        print(f"    ✗ Download failed: {e}")
        return False


def main():
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    restaurants = list(db.restaurants.find({}, {"_id": 1, "name": 1, "photos": 1}))
    print(f"Found {len(restaurants)} restaurants\n")

    updated = 0
    skipped = 0

    for i, rest in enumerate(restaurants):
        name = rest.get("name", "Unknown")

        if rest.get("photos"):
            print(f"  [{i+1}/{len(restaurants)}] {name} — already has photo, skipping")
            skipped += 1
            continue

        image_url = FOOD_IMAGES[i % len(FOOD_IMAGES)]
        filename = f"seed_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(UPLOAD_DIR, filename)

        print(f"  [{i+1}/{len(restaurants)}] {name} — downloading...", end=" ", flush=True)

        if download_image(image_url, filepath):
            photo_path = f"/{filepath}"
            db.restaurants.update_one(
                {"_id": rest["_id"]},
                {"$set": {"photos": photo_path}},
            )
            print(f"✓ {filename}")
            updated += 1
        else:
            print("✗ skipped")

    print(f"\n✅ Done! Updated: {updated}, Skipped: {skipped}")
    client.close()


if __name__ == "__main__":
    main()
