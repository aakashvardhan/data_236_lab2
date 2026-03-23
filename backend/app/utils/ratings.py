from sqlalchemy.orm import Session
from models import Restaurant, Review

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
