from langchain.tools import tool

from app.database import get_db


@tool
async def search_restaurants(query: str) -> str:
    """Search for restaurants.
    Pass a simple space-separated list of keywords, like 'Chinese San Jose vegan $$'.
    To get top-rated restaurants, pass 'top rated' or just 'best'.
    Do NOT pass complex generic sentences (e.g., avoid 'restaurants in', 'sorted by', etc)."""
    mongo = get_db()

    rating_keywords = {"best", "top", "rated", "highest", "popular"}
    ignore_words = {
        "restaurants", "in", "by", "for", "with", "a", "and", "sorted",
        "casual", "dining", "place", "near", "me", "rated", "rating",
    }

    raw_terms = [q.strip().lower() for q in query.split() if q.strip()]
    wants_top_rated = bool(rating_keywords & set(raw_terms))
    terms = [
        t for t in raw_terms
        if t not in ignore_words and t not in rating_keywords
    ]

    mongo_filter: dict = {}
    if terms:
        or_conditions = []
        for term in terms:
            regex = {"$regex": term, "$options": "i"}
            or_conditions.extend(
                [
                    {"name": regex},
                    {"cuisine_type": regex},
                    {"city": regex},
                    {"description": regex},
                    {"pricing_tier": regex},
                ]
            )
        mongo_filter["$or"] = or_conditions

    sort_spec = (
        [("avg_rating", -1)] if wants_top_rated or not terms else []
    )

    cursor = mongo.restaurants.find(mongo_filter)
    if sort_spec:
        cursor = cursor.sort(sort_spec)
    results = await cursor.limit(10).to_list(length=10)

    if not results:
        return (
            "No restaurants found matching your exact search. "
            "Try using fewer, simpler keywords."
        )

    lines: list[str] = []
    for r in results:
        desc = (r.get("description") or "")[:80]
        lines.append(
            f"- ID: {r['_id']} | {r.get('name', '')} | "
            f"{r.get('cuisine_type', '')} | {r.get('pricing_tier', '')} | "
            f"Rating: {r.get('avg_rating', 0)}★ | {r.get('city', '')} | {desc}"
        )
    return "\n".join(lines)
