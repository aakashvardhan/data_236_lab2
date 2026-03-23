from langchain.tools import tool
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Restaurant


@tool
def search_restaurants(query: str) -> str:
    """Search for restaurants.
    Pass a simple space-separated list of keywords, like 'Chinese San Jose vegan $$'.
    Do NOT pass complex generic sentences (e.g., avoid 'restaurants in', 'sorted by', etc)."""
    db: Session = SessionLocal()
    try:
        # Split into distinct search terms, removing generic fluff words
        ignore_words = {"restaurants", "in", "by", "for", "with", "a", "and", "sorted", "rating", "casual", "dining", "place"}
        terms = [q.strip() for q in query.split() if q.strip().lower() not in ignore_words]
        
        # If no valid terms, fallback to a catch-all query
        if not terms:
             terms = [query.strip()]

        base_query = db.query(Restaurant)
        
        for term in terms:
            term_filter = (
                (Restaurant.name.ilike(f"%{term}%"))
                | (Restaurant.cuisine_type.ilike(f"%{term}%"))
                | (Restaurant.city.ilike(f"%{term}%"))
                | (Restaurant.description.ilike(f"%{term}%"))
                | (Restaurant.pricing_tier.ilike(f"%{term}%"))
            )
            base_query = base_query.filter(term_filter)
            
        results = base_query.limit(10).all()

        if not results:
            return "No restaurants found matching your exact search. Try using fewer, simpler keywords."

        lines = []
        for r in results:
            lines.append(
                f"- ID: {r.id} | {r.name} | {r.cuisine_type} | {r.pricing_tier} | "
                f"Rating: {r.avg_rating}★ | {r.city} | {(r.description or '')[:80]}"
            )
        return "\n".join(lines)
    finally:
        db.close()
