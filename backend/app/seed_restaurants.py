"""
seed_restaurants.py
Run from inside backend/app folder:
    python seed_restaurants.py

This script:
1. Downloads real food images from Unsplash (free, no API key needed)
2. Inserts 30 restaurants into your MySQL database
3. Saves images to uploads/restaurant_photos/
"""

import os
import urllib.request
import uuid
from dotenv import load_dotenv

load_dotenv()

# --- Database setup ---
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Restaurant

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "yelp_db")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

UPLOAD_DIR = "uploads/restaurant_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Free Unsplash food images (no API key needed - direct URLs)
FOOD_IMAGES = [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",  # restaurant interior
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",  # fine dining
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",  # restaurant
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800",  # pizza
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",  # pizza slice
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",  # burger
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800",  # burger
    "https://images.unsplash.com/photo-1529693662653-9d480530a697?w=800",  # pasta
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800",  # pasta
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800",  # sushi
    "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800",  # sushi
    "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800",  # thai food
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800",  # indian food
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",  # indian curry
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",  # food
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",  # salad
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800",  # pasta dish
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800",  # food
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800",  # french toast
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800",  # salad bowl
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800",  # fish
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",  # healthy bowl
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800",  # steak
    "https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800",  # tacos
    "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800",  # dessert
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",  # pancakes
    "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800",  # coffee
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800",  # sandwich
    "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800",  # steak plate
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",  # pizza margherita
]

# 30 restaurants with rich data
RESTAURANTS = [
    # Italian
    {"name": "Pasta Paradise", "cuisine_type": "Italian", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95112", "address": "123 Main St", "contact_info": "408-555-0001", "description": "Authentic Italian dining with handmade pasta and wood-fired pizza. Family recipes passed down for generations.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:10AM-10PM,sun:10AM-8PM"},
    {"name": "Trattoria Roma", "cuisine_type": "Italian", "pricing_tier": "$$$", "city": "Santa Clara", "state": "CA", "zip_code": "95051", "address": "456 Oak Ave", "contact_info": "408-555-0002", "description": "Upscale Italian cuisine featuring imported ingredients from Italy. Perfect for romantic dinners.", "hours": "mon:Closed,tue:5PM-10PM,wed:5PM-10PM,thu:5PM-10PM,fri:5PM-11PM,sat:4PM-11PM,sun:4PM-9PM"},
    # Japanese
    {"name": "Tokyo Ramen House", "cuisine_type": "Japanese", "pricing_tier": "$$", "city": "Sunnyvale", "state": "CA", "zip_code": "94086", "address": "777 Cherry Blossom Way", "contact_info": "408-555-0003", "description": "Authentic Japanese ramen with rich broths simmered for 24 hours. Best tonkotsu in the Bay Area.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:11AM-10PM,sun:12PM-8PM"},
    {"name": "Sakura Sushi Bar", "cuisine_type": "Japanese", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95113", "address": "890 Blossom Hill Rd", "contact_info": "408-555-0004", "description": "Premium omakase sushi experience with fresh fish flown in daily from Japan.", "hours": "mon:Closed,tue:5PM-10PM,wed:5PM-10PM,thu:5PM-10PM,fri:5PM-11PM,sat:12PM-11PM,sun:12PM-9PM"},
    # Indian
    {"name": "Spice Garden", "cuisine_type": "Indian", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95116", "address": "555 Curry Lane", "contact_info": "408-555-0005", "description": "Authentic North Indian cuisine with rich curries and tandoor-baked bread. Vegetarian-friendly menu.", "hours": "mon:11AM-10PM,tue:11AM-10PM,wed:11AM-10PM,thu:11AM-10PM,fri:11AM-11PM,sat:11AM-11PM,sun:12PM-9PM"},
    {"name": "Mumbai Masala", "cuisine_type": "Indian", "pricing_tier": "$", "city": "Fremont", "state": "CA", "zip_code": "94538", "address": "234 South Bay Blvd", "contact_info": "510-555-0006", "description": "Street food style Indian snacks and meals. Famous for their chaat and dosas.", "hours": "mon:10AM-9PM,tue:10AM-9PM,wed:10AM-9PM,thu:10AM-9PM,fri:10AM-10PM,sat:9AM-10PM,sun:9AM-8PM"},
    # Mexican
    {"name": "Casa Mexicana", "cuisine_type": "Mexican", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95128", "address": "678 Taco Blvd", "contact_info": "408-555-0007", "description": "Traditional Mexican dishes with homemade tortillas and fresh salsa. Lively atmosphere with mariachi on weekends.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-11PM,sat:10AM-11PM,sun:10AM-9PM"},
    {"name": "El Rancho Grill", "cuisine_type": "Mexican", "pricing_tier": "$", "city": "Milpitas", "state": "CA", "zip_code": "95035", "address": "321 Ranch Rd", "contact_info": "408-555-0008", "description": "Casual Mexican grill with the best burritos in Silicon Valley. Quick service and huge portions.", "hours": "mon:9AM-9PM,tue:9AM-9PM,wed:9AM-9PM,thu:9AM-9PM,fri:9AM-10PM,sat:9AM-10PM,sun:10AM-8PM"},
    # French
    {"name": "Candlelight Bistro", "cuisine_type": "French", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95113", "address": "789 Elm St", "contact_info": "408-555-0009", "description": "Romantic French fine dining with classic dishes like coq au vin and crème brûlée. Perfect for anniversaries.", "hours": "mon:Closed,tue:5PM-10PM,wed:5PM-10PM,thu:5PM-10PM,fri:5PM-11PM,sat:4PM-11PM,sun:4PM-9PM"},
    {"name": "Le Petit Café", "cuisine_type": "French", "pricing_tier": "$$", "city": "Palo Alto", "state": "CA", "zip_code": "94301", "address": "456 University Ave", "contact_info": "650-555-0010", "description": "Charming French café with fresh croissants, crepes, and classic bistro fare. Great for brunch.", "hours": "mon:8AM-6PM,tue:8AM-6PM,wed:8AM-6PM,thu:8AM-6PM,fri:8AM-7PM,sat:8AM-7PM,sun:9AM-5PM"},
    # Mediterranean
    {"name": "Sunset Terrace", "cuisine_type": "Mediterranean", "pricing_tier": "$$$", "city": "Santa Clara", "state": "CA", "zip_code": "95054", "address": "321 Sunset Blvd", "contact_info": "408-555-0011", "description": "Beautiful outdoor terrace with stunning views. Fresh Mediterranean cuisine featuring seafood and mezze platters.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:10AM-10PM,sun:10AM-8PM"},
    {"name": "Olive Garden Athens", "cuisine_type": "Mediterranean", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95125", "address": "567 Olive Tree Dr", "contact_info": "408-555-0012", "description": "Greek and Mediterranean specialties including moussaka, falafel, and fresh hummus. Family friendly.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:10AM-10PM,sun:11AM-8PM"},
    # Vegan
    {"name": "Green Leaf Café", "cuisine_type": "Vegan", "pricing_tier": "$", "city": "Santa Clara", "state": "CA", "zip_code": "95051", "address": "456 Oak Ave", "contact_info": "408-555-0013", "description": "100% plant-based menu with creative vegan dishes. Organic ingredients sourced locally.", "hours": "mon:8AM-6PM,tue:8AM-6PM,wed:8AM-6PM,thu:8AM-6PM,fri:8AM-7PM,sat:9AM-5PM,sun:Closed"},
    {"name": "Veggie Delight", "cuisine_type": "Vegan", "pricing_tier": "$$", "city": "Mountain View", "state": "CA", "zip_code": "94041", "address": "123 Castro St", "contact_info": "650-555-0014", "description": "Extensive vegan menu with international flavors. Great for health-conscious diners.", "hours": "mon:10AM-8PM,tue:10AM-8PM,wed:10AM-8PM,thu:10AM-8PM,fri:10AM-9PM,sat:10AM-9PM,sun:11AM-7PM"},
    # American
    {"name": "The Burger Joint", "cuisine_type": "American", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95110", "address": "111 First St", "contact_info": "408-555-0015", "description": "Classic American burgers with hand-formed patties and crispy fries. Best milkshakes in town.", "hours": "mon:11AM-10PM,tue:11AM-10PM,wed:11AM-10PM,thu:11AM-10PM,fri:11AM-11PM,sat:10AM-11PM,sun:10AM-9PM"},
    {"name": "Freedom BBQ House", "cuisine_type": "American", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95136", "address": "888 BBQ Lane", "contact_info": "408-555-0016", "description": "Slow-smoked BBQ ribs, brisket, and pulled pork. Texas-style pit BBQ with homemade sauces.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:11AM-10PM,sun:12PM-8PM"},
    {"name": "Brunch & Co", "cuisine_type": "American", "pricing_tier": "$$", "city": "Los Gatos", "state": "CA", "zip_code": "95030", "address": "444 Main Ave", "contact_info": "408-555-0017", "description": "All-day brunch spot with bottomless mimosas on weekends. Famous for eggs benedict and avocado toast.", "hours": "mon:Closed,tue:Closed,wed:8AM-3PM,thu:8AM-3PM,fri:8AM-3PM,sat:8AM-4PM,sun:8AM-4PM"},
    # Thai
    {"name": "Bangkok Kitchen", "cuisine_type": "Thai", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95117", "address": "234 Stevens Creek Blvd", "contact_info": "408-555-0018", "description": "Authentic Thai cuisine with traditional recipes from Bangkok. Try our signature pad see ew and green curry.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:11AM-10PM,sun:12PM-9PM"},
    {"name": "Thai Orchid", "cuisine_type": "Thai", "pricing_tier": "$", "city": "Cupertino", "state": "CA", "zip_code": "95014", "address": "789 De Anza Blvd", "contact_info": "408-555-0019", "description": "Quick and delicious Thai street food. Best pad thai and mango sticky rice in the South Bay.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-9PM,sat:12PM-9PM,sun:12PM-8PM"},
    # Chinese
    {"name": "Golden Dragon", "cuisine_type": "Chinese", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95112", "address": "555 Story Rd", "contact_info": "408-555-0020", "description": "Traditional Cantonese dim sum and seafood dishes. Weekend dim sum brunch is legendary.", "hours": "mon:10AM-9PM,tue:10AM-9PM,wed:10AM-9PM,thu:10AM-9PM,fri:10AM-10PM,sat:9AM-10PM,sun:9AM-9PM"},
    {"name": "Peking Palace", "cuisine_type": "Chinese", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95128", "address": "678 Meridian Ave", "contact_info": "408-555-0021", "description": "Upscale Chinese dining featuring Peking duck and imperial cuisine. Private dining rooms available.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:11AM-10PM,sun:11AM-9PM"},
    # Korean
    {"name": "Seoul BBQ", "cuisine_type": "Korean", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95131", "address": "234 Barber Lane", "contact_info": "408-555-0022", "description": "Korean BBQ with tabletop grills. All-you-can-eat option available. Famous for their marinated bulgogi.", "hours": "mon:11AM-11PM,tue:11AM-11PM,wed:11AM-11PM,thu:11AM-11PM,fri:11AM-12AM,sat:11AM-12AM,sun:11AM-10PM"},
    {"name": "K-Pop Chicken", "cuisine_type": "Korean", "pricing_tier": "$", "city": "Sunnyvale", "state": "CA", "zip_code": "94087", "address": "890 Mathilda Ave", "contact_info": "408-555-0023", "description": "Korean fried chicken with amazing crispy coating and variety of sauces. Late night delivery available.", "hours": "mon:12PM-10PM,tue:12PM-10PM,wed:12PM-10PM,thu:12PM-10PM,fri:12PM-12AM,sat:12PM-12AM,sun:12PM-10PM"},
    # Vietnamese
    {"name": "Pho Saigon", "cuisine_type": "Vietnamese", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95116", "address": "123 King Rd", "contact_info": "408-555-0024", "description": "Authentic Vietnamese pho with rich bone broth simmered overnight. Best pho in Little Saigon.", "hours": "mon:7AM-9PM,tue:7AM-9PM,wed:7AM-9PM,thu:7AM-9PM,fri:7AM-10PM,sat:7AM-10PM,sun:7AM-9PM"},
    {"name": "Banh Mi Express", "cuisine_type": "Vietnamese", "pricing_tier": "$", "city": "San Jose", "state": "CA", "zip_code": "95116", "address": "456 E Santa Clara St", "contact_info": "408-555-0025", "description": "Freshly baked banh mi sandwiches with traditional Vietnamese fillings. Quick lunch spot.", "hours": "mon:8AM-6PM,tue:8AM-6PM,wed:8AM-6PM,thu:8AM-6PM,fri:8AM-6PM,sat:9AM-5PM,sun:Closed"},
    # Seafood
    {"name": "The Fish Market", "cuisine_type": "Seafood", "pricing_tier": "$$$", "city": "San Jose", "state": "CA", "zip_code": "95110", "address": "789 Almaden Blvd", "contact_info": "408-555-0026", "description": "Fresh seafood flown in daily. Oyster bar, lobster, and catch of the day. Waterfront dining experience.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:10AM-10PM,sun:10AM-9PM"},
    # Steakhouse
    {"name": "The Prime Cut", "cuisine_type": "Steakhouse", "pricing_tier": "$$$$", "city": "San Jose", "state": "CA", "zip_code": "95113", "address": "100 W San Carlos St", "contact_info": "408-555-0027", "description": "Premium USDA Prime steaks dry-aged for 28 days. Extensive wine cellar with over 500 labels.", "hours": "mon:Closed,tue:5PM-10PM,wed:5PM-10PM,thu:5PM-10PM,fri:5PM-11PM,sat:4PM-11PM,sun:4PM-9PM"},
    # Spanish
    {"name": "Tapas Barcelona", "cuisine_type": "Spanish", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95126", "address": "234 Willow St", "contact_info": "408-555-0028", "description": "Authentic Spanish tapas and paella. Live flamenco dancing on Friday and Saturday evenings.", "hours": "mon:Closed,tue:4PM-10PM,wed:4PM-10PM,thu:4PM-10PM,fri:4PM-12AM,sat:4PM-12AM,sun:3PM-9PM"},
    # Cafe/Bakery
    {"name": "Morning Glory Café", "cuisine_type": "Cafe", "pricing_tier": "$", "city": "Campbell", "state": "CA", "zip_code": "95008", "address": "567 E Campbell Ave", "contact_info": "408-555-0029", "description": "Cozy neighborhood café with artisan coffee, fresh pastries, and light breakfast items.", "hours": "mon:6AM-4PM,tue:6AM-4PM,wed:6AM-4PM,thu:6AM-4PM,fri:6AM-5PM,sat:7AM-5PM,sun:8AM-3PM"},
    # Middle Eastern
    {"name": "Sahara Grill", "cuisine_type": "Middle Eastern", "pricing_tier": "$$", "city": "San Jose", "state": "CA", "zip_code": "95129", "address": "678 Saratoga Ave", "contact_info": "408-555-0030", "description": "Lebanese and Middle Eastern specialties including shawarma, kebabs, and fresh mezze platters.", "hours": "mon:11AM-9PM,tue:11AM-9PM,wed:11AM-9PM,thu:11AM-9PM,fri:11AM-10PM,sat:11AM-10PM,sun:12PM-8PM"},
]


def download_image(url, filename):
    """Download image from URL and save to uploads folder."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())
        print(f"  ✓ Downloaded image: {filename}")
        return f"/{filepath}"
    except Exception as e:
        print(f"  ✗ Failed to download image: {e}")
        return None


def get_existing_restaurant(restaurant_data: dict) -> Restaurant | None:
    """Return an existing seeded restaurant using a stable natural key."""
    return (
        db.query(Restaurant)
        .filter(
            Restaurant.name == restaurant_data["name"],
            Restaurant.address == restaurant_data["address"],
            Restaurant.city == restaurant_data["city"],
            Restaurant.state == restaurant_data["state"],
            Restaurant.zip_code == restaurant_data["zip_code"],
        )
        .first()
    )


def seed():
    print("\n🍽️  Starting restaurant seeding...\n")

    inserted_count = 0
    updated_count = 0

    for i, restaurant_data in enumerate(RESTAURANTS):
        existing = get_existing_restaurant(restaurant_data)
        mode = "Updating" if existing else "Adding"
        print(f"[{i+1}/30] {mode}: {restaurant_data['name']}")

        restaurant = existing or Restaurant()

        # Download image only when creating, or when an existing row has no photo.
        photo_path = restaurant.photos
        if existing is None or not restaurant.photos:
            image_url = FOOD_IMAGES[i % len(FOOD_IMAGES)]
            image_filename = f"seed_{i+1}_{uuid.uuid4().hex[:8]}.jpg"
            downloaded = download_image(image_url, image_filename)
            if downloaded:
                photo_path = downloaded

        restaurant.name = restaurant_data["name"]
        restaurant.cuisine_type = restaurant_data["cuisine_type"]
        restaurant.pricing_tier = restaurant_data["pricing_tier"]
        restaurant.city = restaurant_data["city"]
        restaurant.state = restaurant_data["state"]
        restaurant.zip_code = restaurant_data["zip_code"]
        restaurant.address = restaurant_data["address"]
        restaurant.contact_info = restaurant_data["contact_info"]
        restaurant.description = restaurant_data["description"]
        restaurant.hours = restaurant_data["hours"]
        restaurant.photos = photo_path
        restaurant.avg_rating = round(3.5 + (i % 15) * 0.1, 1)  # ratings between 3.5 - 5.0
        restaurant.review_count = i * 3 + 5

        try:
            if existing is None:
                db.add(restaurant)
            db.commit()
            db.refresh(restaurant)
            if existing is None:
                print(f"  ✓ Added to database (ID: {restaurant.id})")
                inserted_count += 1
            else:
                print(f"  ✓ Updated existing restaurant (ID: {restaurant.id})")
                updated_count += 1
        except Exception as e:
            db.rollback()
            print(f"  ✗ Database error: {e}")

    print(
        f"\n✅ Done! Inserted: {inserted_count}, Updated: {updated_count}, Total processed: {len(RESTAURANTS)}"
    )
    print("📍 Visit http://localhost:5173 to see them!\n")
    db.close()


if __name__ == "__main__":
    seed()
