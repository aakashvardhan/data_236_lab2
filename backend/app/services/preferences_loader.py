from sqlalchemy.orm import Session
from app.models import UserPreference


def load_user_preferences(user_id: int, db: Session) -> dict:
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()

    defaults = {
        "cuisine_preferences": "Any",
        "price_range": "Any",
        "dietary_needs": "None",
        "ambiance_preferences": "Any",
        "preferred_location": "Any",
        "sort_preference": "rating",
    }

    if not prefs:
        return defaults

    return {
        "cuisine_preferences": prefs.cuisines or defaults["cuisine_preferences"],
        "price_range": prefs.price_range or defaults["price_range"],
        "dietary_needs": prefs.dietary_needs or defaults["dietary_needs"],
        "ambiance_preferences": prefs.ambience or defaults["ambiance_preferences"],
        "preferred_location": prefs.preferred_locations
        or defaults["preferred_location"],
        "sort_preference": prefs.sort_preference or defaults["sort_preference"],
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
