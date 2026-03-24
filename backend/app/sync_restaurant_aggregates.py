"""
sync_restaurant_aggregates.py

Run from inside backend/ folder:
    python -m app.sync_restaurant_aggregates

Purpose:
- Recalculate Restaurant.avg_rating and Restaurant.review_count
- Use Review rows as the single source of truth
"""

from app.database import SessionLocal
from app.utils.ratings import sync_all_restaurant_aggregates


def main() -> None:
    db = SessionLocal()
    try:
        processed = sync_all_restaurant_aggregates(db)
        db.commit()
        print(f"✅ Synced restaurant aggregates for {processed} restaurants.")
    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Failed to sync restaurant aggregates: {exc}") from exc
    finally:
        db.close()


if __name__ == "__main__":
    main()
