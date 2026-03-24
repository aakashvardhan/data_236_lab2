from sqlalchemy.orm import Session
from app.models import Restaurant, Review

def recalculate_rating(db: Session, restaurant_id: int) -> None:
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()
    if not restaurant:
        return

    reviews = db.query(Review).filter(
        Review.restaurant_id == restaurant_id).all()

    if reviews:
        restaurant.avg_rating = round(
            sum(int(r.rating) for r in reviews) / len(reviews), 1)
        restaurant.review_count = len(reviews)
    else:
        restaurant.avg_rating = 0.0
        restaurant.review_count = 0


def sync_all_restaurant_aggregates(db: Session) -> int:
    """
    Recompute rating and review_count for every restaurant from Review rows.

    Returns:
        Number of restaurants processed.
    """
    restaurants = db.query(Restaurant).all()
    for restaurant in restaurants:
        recalculate_rating(db, int(restaurant.id))
    return len(restaurants)
