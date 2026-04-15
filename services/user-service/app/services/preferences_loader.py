from bson import ObjectId

from app.database import get_db


async def load_user_preferences(user_id: str, db=None) -> dict:
    """Load user preferences from the embedded subdocument in the users collection."""
    mongo = db or get_db()
    user = await mongo.users.find_one(
        {"_id": ObjectId(user_id)}, {"preferences": 1}
    )

    defaults = {
        "cuisine_preferences": "Any",
        "price_range": "Any",
        "dietary_needs": "None",
        "ambiance_preferences": "Any",
        "preferred_location": "Any",
        "sort_preference": "rating",
    }

    if not user or "preferences" not in user or not user["preferences"]:
        return defaults

    prefs = user["preferences"]
    return {
        "cuisine_preferences": prefs.get("cuisines") or defaults["cuisine_preferences"],
        "price_range": prefs.get("price_range") or defaults["price_range"],
        "dietary_needs": prefs.get("dietary_needs") or defaults["dietary_needs"],
        "ambiance_preferences": prefs.get("ambience") or defaults["ambiance_preferences"],
        "preferred_location": prefs.get("preferred_locations") or defaults["preferred_location"],
        "sort_preference": prefs.get("sort_preference") or defaults["sort_preference"],
    }


def format_preferences_for_agent(prefs: dict) -> str:
    return (
        f"Cuisine Preferences: {prefs['cuisine_preferences']}\n"
        f"Price Range: {prefs['price_range']}\n"
        f"Dietary Needs: {prefs['dietary_needs']}\n"
        f"Ambiance: {prefs['ambiance_preferences']}\n"
        f"Preferred Location: {prefs['preferred_location']}\n"
        f"Sort By: {prefs['sort_preference']}"
    )
