from langchain.tools import tool
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Restaurant


@tool
def search_restaurants(query: str) -> str:
    """Search for restaurants.
    Pass a simple space-separated list of keywords, like 'Chinese San Jose vegan $$'.
    To get top-rated restaurants, pass 'top rated' or just 'best'.
    Do NOT pass complex generic sentences (e.g., avoid 'restaurants in', 'sorted by', etc)."""
    db: Session = SessionLocal()
    try:
        rating_keywords = {"best", "top", "rated", "highest", "popular"}
        ignore_words = {"restaurants", "in", "by", "for", "with", "a", "and", "sorted",
                        "casual", "dining", "place", "near", "me", "rated", "rating"}

        raw_terms = [q.strip().lower() for q in query.split() if q.strip()]
        wants_top_rated = bool(rating_keywords & set(raw_terms))
        terms = [
            t for t in raw_terms if t not in ignore_words and t not in rating_keywords]

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

        # Sort by rating when requested or when no meaningful filters exist
        if wants_top_rated or not terms:
            base_query = base_query.order_by(Restaurant.avg_rating.desc())

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
