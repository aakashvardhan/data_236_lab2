"""
seed.py — Populate MongoDB with restaurants, reviews, and food images.

Runs automatically at container startup via entrypoint.sh.
Idempotent: skips restaurants that already exist (matched by name + address).
"""

import os
import random
import urllib.request
import uuid
from datetime import datetime, timezone

from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")
UPLOAD_DIR = "uploads/restaurant_photos"
SEED_REVIEWER_COUNT = 20

REVIEW_COMMENTS = [
    "Great service and tasty food. I would come back.",
    "Solid flavors and good portions for the price.",
    "Friendly staff and quick seating on a busy night.",
    "Loved the atmosphere. Food arrived hot and fresh.",
    "The signature dishes were excellent. Worth trying.",
    "Good neighborhood spot with consistent quality.",
    "Very flavorful and nicely presented plates.",
    "Nice ambiance and attentive service throughout.",
    "Good value overall and an easy recommendation.",
    "Fresh ingredients and balanced seasoning.",
]

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

RESTAURANTS = [
    {"name": "Pasta Paradise", "cuisine_type": "Italian", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95112", "address": "123 Main St", "contact_info": "408-555-0001", "description": "Authentic Italian dining with handmade pasta and wood-fired pizza. Family recipes passed down for generations.", "hours": "Mon-Fri 11AM-9PM, Sat 10AM-10PM, Sun 10AM-8PM"},
    {"name": "Trattoria Roma", "cuisine_type": "Italian", "pricing_tier": "$$$", "city": "Santa Clara", "state": "CA", "zip_code": "95051", "address": "456 Oak Ave", "contact_info": "408-555-0002", "description": "Upscale Italian cuisine featuring imported ingredients from Italy. Perfect for romantic dinners.", "hours": "Tue-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 4PM-9PM"},
    {"name": "Tokyo Ramen House", "cuisine_type": "Japanese", "pricing_tier": "$$", "city": "Sunnyvale", "state": "CA", "zip_code": "94086", "address": "777 Cherry Blossom Way", "contact_info": "408-555-0003", "description": "Authentic Japanese ramen with rich broths simmered for 24 hours. Best tonkotsu in the Bay Area.", "hours": "Mon-Fri 11AM-9PM, Sat 11AM-10PM, Sun 12PM-8PM"},
    {"name": "Sakura Sushi Bar", "cuisine_type": "Japanese", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95113", "address": "890 Blossom Hill Rd", "contact_info": "408-555-0004", "description": "Premium omakase sushi experience with fresh fish flown in daily from Japan.", "hours": "Tue-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 12PM-9PM"},
    {"name": "Spice Garden", "cuisine_type": "Indian", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95116", "address": "555 Curry Lane", "contact_info": "408-555-0005", "description": "Authentic North Indian cuisine with rich curries and tandoor-baked bread. Vegetarian-friendly menu.", "hours": "Mon-Thu 11AM-10PM, Fri-Sat 11AM-11PM, Sun 12PM-9PM"},
    {"name": "Mumbai Masala", "cuisine_type": "Indian", "pricing_tier": "$", "city": "Fremont", "state": "CA", "zip_code": "94538", "address": "234 South Bay Blvd", "contact_info": "510-555-0006", "description": "Street food style Indian snacks and meals. Famous for their chaat and dosas.", "hours": "Mon-Fri 10AM-9PM, Sat 9AM-10PM, Sun 9AM-8PM"},
    {"name": "Casa Mexicana", "cuisine_type": "Mexican", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95128", "address": "678 Taco Blvd", "contact_info": "408-555-0007", "description": "Traditional Mexican dishes with homemade tortillas and fresh salsa. Lively atmosphere with mariachi on weekends.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-11PM, Sun 10AM-9PM"},
    {"name": "El Rancho Grill", "cuisine_type": "Mexican", "pricing_tier": "$", "city": "Milpitas", "state": "CA", "zip_code": "95035", "address": "321 Ranch Rd", "contact_info": "408-555-0008", "description": "Casual Mexican grill with the best burritos in Silicon Valley. Quick service and huge portions.", "hours": "Mon-Fri 9AM-9PM, Sat 9AM-10PM, Sun 10AM-8PM"},
    {"name": "Candlelight Bistro", "cuisine_type": "French", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95113", "address": "789 Elm St", "contact_info": "408-555-0009", "description": "Romantic French fine dining with classic dishes like coq au vin and crème brûlée. Perfect for anniversaries.", "hours": "Tue-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 4PM-9PM"},
    {"name": "Le Petit Café", "cuisine_type": "French", "pricing_tier": "$$", "city": "Palo Alto", "state": "CA", "zip_code": "94301", "address": "456 University Ave", "contact_info": "650-555-0010", "description": "Charming French café with fresh croissants, crepes, and classic bistro fare. Great for brunch.", "hours": "Mon-Fri 8AM-6PM, Sat 8AM-7PM, Sun 9AM-5PM"},
    {"name": "Sunset Terrace", "cuisine_type": "Mediterranean", "pricing_tier": "$$$", "city": "Santa Clara", "state": "CA", "zip_code": "95054", "address": "321 Sunset Blvd", "contact_info": "408-555-0011", "description": "Beautiful outdoor terrace with stunning views. Fresh Mediterranean cuisine featuring seafood and mezze platters.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-10PM, Sun 10AM-8PM"},
    {"name": "Olive Garden Athens", "cuisine_type": "Mediterranean", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95125", "address": "567 Olive Tree Dr", "contact_info": "408-555-0012", "description": "Greek and Mediterranean specialties including moussaka, falafel, and fresh hummus. Family friendly.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-10PM, Sun 11AM-8PM"},
    {"name": "Green Leaf Café", "cuisine_type": "Vegan", "pricing_tier": "$", "city": "Santa Clara", "state": "CA", "zip_code": "95051", "address": "456 Oak Ave", "contact_info": "408-555-0013", "description": "100% plant-based menu with creative vegan dishes. Organic ingredients sourced locally.", "hours": "Mon-Fri 8AM-6PM, Sat 9AM-5PM"},
    {"name": "Veggie Delight", "cuisine_type": "Vegan", "pricing_tier": "$$", "city": "Mountain View", "state": "CA", "zip_code": "94041", "address": "123 Castro St", "contact_info": "650-555-0014", "description": "Extensive vegan menu with international flavors. Great for health-conscious diners.", "hours": "Mon-Fri 10AM-8PM, Sat 10AM-9PM, Sun 11AM-7PM"},
    {"name": "The Burger Joint", "cuisine_type": "American", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95110", "address": "111 First St", "contact_info": "408-555-0015", "description": "Classic American burgers with hand-formed patties and crispy fries. Best milkshakes in town.", "hours": "Mon-Thu 11AM-10PM, Fri-Sat 11AM-11PM, Sun 10AM-9PM"},
    {"name": "Freedom BBQ House", "cuisine_type": "American", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95136", "address": "888 BBQ Lane", "contact_info": "408-555-0016", "description": "Slow-smoked BBQ ribs, brisket, and pulled pork. Texas-style pit BBQ with homemade sauces.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-10PM, Sun 12PM-8PM"},
    {"name": "Brunch & Co", "cuisine_type": "American", "pricing_tier": "$$", "city": "Los Gatos", "state": "CA", "zip_code": "95030", "address": "444 Main Ave", "contact_info": "408-555-0017", "description": "All-day brunch spot with bottomless mimosas on weekends. Famous for eggs benedict and avocado toast.", "hours": "Wed-Fri 8AM-3PM, Sat-Sun 8AM-4PM"},
    {"name": "Bangkok Kitchen", "cuisine_type": "Thai", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95117", "address": "234 Stevens Creek Blvd", "contact_info": "408-555-0018", "description": "Authentic Thai cuisine with traditional recipes from Bangkok. Try our signature pad see ew and green curry.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-10PM, Sun 12PM-9PM"},
    {"name": "Thai Orchid", "cuisine_type": "Thai", "pricing_tier": "$", "city": "Cupertino", "state": "CA", "zip_code": "95014", "address": "789 De Anza Blvd", "contact_info": "408-555-0019", "description": "Quick and delicious Thai street food. Best pad thai and mango sticky rice in the South Bay.", "hours": "Mon-Sat 11AM-9PM, Sun 12PM-8PM"},
    {"name": "Golden Dragon", "cuisine_type": "Chinese", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95112", "address": "555 Story Rd", "contact_info": "408-555-0020", "description": "Traditional Cantonese dim sum and seafood dishes. Weekend dim sum brunch is legendary.", "hours": "Mon-Fri 10AM-9PM, Sat 9AM-10PM, Sun 9AM-9PM"},
    {"name": "Peking Palace", "cuisine_type": "Chinese", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95128", "address": "678 Meridian Ave", "contact_info": "408-555-0021", "description": "Upscale Chinese dining featuring Peking duck and imperial cuisine. Private dining rooms available.", "hours": "Mon-Sat 11AM-9PM, Sun 11AM-9PM"},
    {"name": "Seoul BBQ", "cuisine_type": "Korean", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95131", "address": "234 Barber Lane", "contact_info": "408-555-0022", "description": "Korean BBQ with tabletop grills. All-you-can-eat option available. Famous for their marinated bulgogi.", "hours": "Mon-Thu 11AM-11PM, Fri-Sat 11AM-12AM, Sun 11AM-10PM"},
    {"name": "K-Pop Chicken", "cuisine_type": "Korean", "pricing_tier": "$", "city": "Sunnyvale", "state": "CA", "zip_code": "94087", "address": "890 Mathilda Ave", "contact_info": "408-555-0023", "description": "Korean fried chicken with amazing crispy coating and variety of sauces. Late night delivery available.", "hours": "Mon-Thu 12PM-10PM, Fri-Sat 12PM-12AM, Sun 12PM-10PM"},
    {"name": "Pho Saigon", "cuisine_type": "Vietnamese", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95116", "address": "123 King Rd", "contact_info": "408-555-0024", "description": "Authentic Vietnamese pho with rich bone broth simmered overnight. Best pho in Little Saigon.", "hours": "Mon-Sat 7AM-9PM, Sun 7AM-9PM"},
    {"name": "Banh Mi Express", "cuisine_type": "Vietnamese", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95116", "address": "456 E Santa Clara St", "contact_info": "408-555-0025", "description": "Freshly baked banh mi sandwiches with traditional Vietnamese fillings. Quick lunch spot.", "hours": "Mon-Sat 8AM-6PM"},
    {"name": "The Fish Market", "cuisine_type": "Seafood", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95110", "address": "789 Almaden Blvd", "contact_info": "408-555-0026", "description": "Fresh seafood flown in daily. Oyster bar, lobster, and catch of the day. Waterfront dining experience.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-10PM, Sun 10AM-9PM"},
    {"name": "The Prime Cut", "cuisine_type": "Steakhouse", "pricing_tier": "$$$$", "city": "San Jose", "state": "CA", "zip_code": "95113", "address": "100 W San Carlos St", "contact_info": "408-555-0027", "description": "Premium USDA Prime steaks dry-aged for 28 days. Extensive wine cellar with over 500 labels.", "hours": "Tue-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 4PM-9PM"},
    {"name": "Tapas Barcelona", "cuisine_type": "Spanish", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95126", "address": "234 Willow St", "contact_info": "408-555-0028", "description": "Authentic Spanish tapas and paella. Live flamenco dancing on Friday and Saturday evenings.", "hours": "Tue-Thu 4PM-10PM, Fri-Sat 4PM-12AM, Sun 3PM-9PM"},
    {"name": "Morning Glory Café", "cuisine_type": "Cafe", "pricing_tier": "$", "city": "Campbell", "state": "CA", "zip_code": "95008", "address": "567 E Campbell Ave", "contact_info": "408-555-0029", "description": "Cozy neighborhood café with artisan coffee, fresh pastries, and light breakfast items.", "hours": "Mon-Fri 6AM-4PM, Sat 7AM-5PM, Sun 8AM-3PM"},
    {"name": "Sahara Grill", "cuisine_type": "Middle Eastern", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95129", "address": "678 Saratoga Ave", "contact_info": "408-555-0030", "description": "Lebanese and Middle Eastern specialties including shawarma, kebabs, and fresh mezze platters.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 11AM-10PM, Sun 12PM-8PM"},
    {"name": "Napoli Oven", "cuisine_type": "Italian", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95124", "address": "901 Blossom Ave", "contact_info": "408-555-1031", "description": "Neighborhood Italian kitchen known for stone-oven pizza and fresh gnocchi.", "hours": "Mon-Sat 11AM-10PM, Sun 11AM-8PM"},
    {"name": "Harbor Catch", "cuisine_type": "Seafood", "pricing_tier": "$$$", "city": "Santa Clara", "state": "CA", "zip_code": "95050", "address": "22 Mission College Blvd", "contact_info": "408-555-1032", "description": "Coastal-inspired seafood with seasonal oysters and grilled fish specials.", "hours": "Mon-Sat 11AM-10PM, Sun 11AM-8PM"},
    {"name": "Dragon Wok Express", "cuisine_type": "Chinese", "pricing_tier": "$", "city": "Sunnyvale", "state": "CA", "zip_code": "94085", "address": "140 Tasman Dr", "contact_info": "408-555-1033", "description": "Quick Chinese comfort food with made-to-order noodles and wok classics.", "hours": "Mon-Sat 10AM-10PM, Sun 11AM-8PM"},
    {"name": "Pho Lotus", "cuisine_type": "Vietnamese", "pricing_tier": "$", "city": "Milpitas", "state": "CA", "zip_code": "95035", "address": "77 Great Mall Pkwy", "contact_info": "408-555-1034", "description": "Light, aromatic pho and rice plates with house-made chili oils.", "hours": "Mon-Sat 8AM-10PM, Sun 9AM-8PM"},
    {"name": "Kebab District", "cuisine_type": "Middle Eastern", "pricing_tier": "$$", "city": "Cupertino", "state": "CA", "zip_code": "95014", "address": "210 Stevens Creek Blvd", "contact_info": "408-555-1035", "description": "Charcoal-grilled kebabs, saffron rice, and mezze platters for sharing.", "hours": "Mon-Sat 11AM-10PM, Sun 12PM-8PM"},
    {"name": "Brasa Grill House", "cuisine_type": "Steakhouse", "pricing_tier": "$$$", "city": "Palo Alto", "state": "CA", "zip_code": "94306", "address": "515 El Camino Real", "contact_info": "650-555-1036", "description": "Modern steakhouse serving dry-aged cuts and seasonal sides.", "hours": "Mon-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 4PM-9PM"},
    {"name": "Bangkok Basil", "cuisine_type": "Thai", "pricing_tier": "$$", "city": "Mountain View", "state": "CA", "zip_code": "94040", "address": "650 El Camino Real", "contact_info": "650-555-1037", "description": "Thai street-style dishes with balanced spice and fresh herbs.", "hours": "Mon-Sat 11AM-10PM, Sun 12PM-8PM"},
    {"name": "Miso House", "cuisine_type": "Japanese", "pricing_tier": "$$", "city": "Campbell", "state": "CA", "zip_code": "95008", "address": "95 Campbell Ave", "contact_info": "408-555-1038", "description": "Casual Japanese dining with ramen, donburi, and sushi rolls.", "hours": "Mon-Sat 11AM-10PM, Sun 11AM-8PM"},
    {"name": "Cantina Azul", "cuisine_type": "Mexican", "pricing_tier": "$$", "city": "Los Gatos", "state": "CA", "zip_code": "95032", "address": "140 Lark Ave", "contact_info": "408-555-1039", "description": "Vibrant taqueria with handmade tortillas and regional mole sauces.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 10AM-11PM, Sun 10AM-8PM"},
    {"name": "Urban Greens", "cuisine_type": "Vegan", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95134", "address": "301 River Oaks Pkwy", "contact_info": "408-555-1040", "description": "Plant-forward bowls, wraps, and smoothies with seasonal produce.", "hours": "Mon-Fri 8AM-8PM, Sat 9AM-6PM, Sun 9AM-5PM"},
    {"name": "Capri Café", "cuisine_type": "Cafe", "pricing_tier": "$", "city": "Sunnyvale", "state": "CA", "zip_code": "94086", "address": "250 Murphy Ave", "contact_info": "408-555-1041", "description": "Coffee bar and brunch cafe known for pastries and seasonal lattes.", "hours": "Mon-Fri 7AM-5PM, Sat 8AM-6PM, Sun 8AM-4PM"},
    {"name": "Patio Paella", "cuisine_type": "Spanish", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95110", "address": "890 Autumn Pkwy", "contact_info": "408-555-1042", "description": "Spanish classics with saffron paella and tapas on an open patio.", "hours": "Tue-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 4PM-9PM"},
    {"name": "Blue Bayou Bistro", "cuisine_type": "American", "pricing_tier": "$$", "city": "Fremont", "state": "CA", "zip_code": "94539", "address": "830 Warm Springs Blvd", "contact_info": "510-555-1043", "description": "American comfort food with seasonal specials and craft cocktails.", "hours": "Mon-Thu 11AM-9PM, Fri-Sat 10AM-10PM, Sun 10AM-8PM"},
    {"name": "Taste of Delhi", "cuisine_type": "Indian", "pricing_tier": "$$", "city": "Santa Clara", "state": "CA", "zip_code": "95051", "address": "455 El Camino Real", "contact_info": "408-555-1044", "description": "Classic Indian curries, tandoori platters, and house-baked naan.", "hours": "Mon-Sat 11AM-11PM, Sun 12PM-9PM"},
    {"name": "Le Jardin Moderne", "cuisine_type": "French", "pricing_tier": "$$$", "city": "Mountain View", "state": "CA", "zip_code": "94041", "address": "175 Castro St", "contact_info": "650-555-1045", "description": "Modern French bistro with tasting menus and a curated wine list.", "hours": "Tue-Thu 5PM-10PM, Fri-Sat 5PM-11PM, Sun 4PM-9PM"},
    {"name": "Aegean Oven", "cuisine_type": "Mediterranean", "pricing_tier": "$$", "city": "Palo Alto", "state": "CA", "zip_code": "94303", "address": "389 Middlefield Rd", "contact_info": "650-555-1046", "description": "Mediterranean grill serving kebabs, flatbreads, and fresh salads.", "hours": "Mon-Sat 11AM-10PM, Sun 11AM-8PM"},
    {"name": "Nori Point", "cuisine_type": "Japanese", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95135", "address": "620 Silver Creek Valley Rd", "contact_info": "408-555-1047", "description": "Sushi-forward Japanese restaurant with nigiri flights and sashimi towers.", "hours": "Tue-Sun 12PM-11PM"},
    {"name": "BBQ Republic", "cuisine_type": "Korean", "pricing_tier": "$$", "city": "Santa Clara", "state": "CA", "zip_code": "95054", "address": "55 Great America Pkwy", "contact_info": "408-555-1048", "description": "Korean BBQ spot with premium cuts and all-you-can-grill options.", "hours": "Mon-Thu 11AM-11PM, Fri-Sat 11AM-12AM, Sun 11AM-10PM"},
    {"name": "Taco Viento", "cuisine_type": "Mexican", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95122", "address": "1490 Story Rd", "contact_info": "408-555-1049", "description": "Fast-casual tacos and burritos with house salsas and grilled meats.", "hours": "Mon-Sat 10AM-11PM, Sun 10AM-9PM"},
    {"name": "Garden Bowl Kitchen", "cuisine_type": "Vegan", "pricing_tier": "$", "city": "Campbell", "state": "CA", "zip_code": "95008", "address": "83 Winchester Blvd", "contact_info": "408-555-1050", "description": "Healthy vegan bowls and wraps built around local produce and grains.", "hours": "Mon-Fri 9AM-8PM, Sat 9AM-6PM, Sun 9AM-5PM"},
]


def download_image(url, filepath):
    """Download an image from a URL to a local file path."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            with open(filepath, "wb") as f:
                f.write(resp.read())
        return True
    except Exception as e:
        print(f"    image download failed: {e}")
        return False


def seed():
    """Insert restaurants, reviews, and images. Idempotent — safe to re-run."""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Quick check: if seed data already exists, skip entirely
    existing_count = db.restaurants.count_documents({
        "name": {"$in": [r["name"] for r in RESTAURANTS[:3]]},
    })
    if existing_count >= 3:
        print("[seed] Restaurants already seeded — skipping.")
        client.close()
        return

    # ── Seed reviewer users ──
    print("[seed] Creating reviewer accounts...")
    reviewer_ids = []
    for idx in range(1, SEED_REVIEWER_COUNT + 1):
        email = f"seed_reviewer_{idx}@example.com"
        existing = db.users.find_one({"email": email})
        if existing:
            reviewer_ids.append(str(existing["_id"]))
        else:
            result = db.users.insert_one({
                "name": f"Seed Reviewer {idx}",
                "email": email,
                "password_hash": f"seeded_hash_{idx}",
                "role": "user",
                "phone": None, "about_me": None,
                "city": "San Jose", "state": "CA", "country": "US",
                "languages": None, "gender": None,
                "profile_picture": None, "preferences": None,
                "created_at": now,
            })
            reviewer_ids.append(str(result.inserted_id))

    # ── Seed restaurants with reviews and images ──
    print(f"[seed] Inserting {len(RESTAURANTS)} restaurants...")
    for i, r_data in enumerate(RESTAURANTS):
        existing = db.restaurants.find_one({
            "name": r_data["name"],
            "address": r_data["address"],
        })
        if existing:
            continue

        # Download image
        photo_path = None
        image_url = FOOD_IMAGES[i % len(FOOD_IMAGES)]
        filename = f"seed_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(UPLOAD_DIR, filename)
        if download_image(image_url, filepath):
            photo_path = f"/{filepath}"

        doc = {
            "name": r_data["name"],
            "cuisine_type": r_data["cuisine_type"],
            "description": r_data["description"],
            "address": r_data["address"],
            "city": r_data["city"],
            "state": r_data["state"],
            "zip_code": r_data["zip_code"],
            "contact_info": r_data["contact_info"],
            "pricing_tier": r_data["pricing_tier"],
            "hours": r_data["hours"],
            "photos": photo_path,
            "owner_id": None,
            "avg_rating": 0.0,
            "review_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        result = db.restaurants.insert_one(doc)
        restaurant_id = str(result.inserted_id)

        # Generate reviews
        rng = random.Random(i + 2026)
        review_count = rng.randint(3, 8)
        selected_reviewers = rng.sample(reviewer_ids, k=review_count)
        ratings = []
        for j, reviewer_id in enumerate(selected_reviewers):
            rating = rng.choices([3, 4, 5], weights=[1, 3, 4], k=1)[0]
            ratings.append(rating)
            db.reviews.insert_one({
                "user_id": reviewer_id,
                "restaurant_id": restaurant_id,
                "rating": rating,
                "comment": REVIEW_COMMENTS[(i + j) % len(REVIEW_COMMENTS)],
                "created_at": now,
                "updated_at": now,
            })

        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0
        db.restaurants.update_one(
            {"_id": result.inserted_id},
            {"$set": {"avg_rating": avg_rating, "review_count": len(ratings)}},
        )
        print(f"  [{i+1}/{len(RESTAURANTS)}] {r_data['name']} "
              f"({len(ratings)} reviews, {avg_rating}★)")

    total = db.restaurants.count_documents({})
    print(f"[seed] Done! {total} total restaurants in database.")
    client.close()


if __name__ == "__main__":
    seed()
