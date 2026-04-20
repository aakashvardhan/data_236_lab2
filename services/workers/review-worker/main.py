"""
Review Worker Service — Kafka consumer.

Consumes review.created, review.updated, review.deleted events and
writes the changes to MongoDB, keeping review data consistent.
"""

import json
import os
import signal
import sys
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from confluent_kafka import Consumer, KafkaError, KafkaException
from pymongo import MongoClient

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")

TOPICS = ["review.created", "review.updated", "review.deleted"]
GROUP_ID = "review-worker-group"

_running = True


def _handle_signal(sig, frame):
    global _running
    print(f"Review Worker: shutting down (signal {sig})")
    _running = False


def _recalculate_rating(db, restaurant_id: str):
    pipeline = [
        {"$match": {"restaurant_id": restaurant_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = list(db.reviews.aggregate(pipeline))
    if result:
        avg = round(result[0]["avg"], 1)
        count = result[0]["count"]
    else:
        avg = 0.0
        count = 0
    try:
        db.restaurants.update_one(
            {"_id": ObjectId(restaurant_id)},
            {"$set": {"avg_rating": avg, "review_count": count}},
        )
    except InvalidId:
        pass


def handle_review_created(db, data: dict):
    review_id = data.get("review_id")
    restaurant_id = data.get("restaurant_id")
    if not review_id or not restaurant_id:
        return
    existing = db.reviews.find_one({"_id": ObjectId(review_id)})
    if not existing:
        db.reviews.insert_one({
            "_id": ObjectId(review_id),
            "user_id": data.get("user_id"),
            "restaurant_id": restaurant_id,
            "rating": data.get("rating"),
            "comment": data.get("comment"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
    _recalculate_rating(db, restaurant_id)
    print(f"[review-worker] created review {review_id}")


def handle_review_updated(db, data: dict):
    review_id = data.get("review_id")
    if not review_id:
        return
    update_fields = {k: v for k, v in data.items()
                     if k not in ("review_id", "user_id", "restaurant_id")}
    update_fields["updated_at"] = datetime.now(timezone.utc)
    try:
        db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update_fields})
    except InvalidId:
        return
    if data.get("restaurant_id"):
        _recalculate_rating(db, data["restaurant_id"])
    print(f"[review-worker] updated review {review_id}")


def handle_review_deleted(db, data: dict):
    review_id = data.get("review_id")
    restaurant_id = data.get("restaurant_id")
    if not review_id:
        return
    try:
        db.reviews.delete_one({"_id": ObjectId(review_id)})
    except InvalidId:
        return
    if restaurant_id:
        _recalculate_rating(db, restaurant_id)
    print(f"[review-worker] deleted review {review_id}")


HANDLERS = {
    "review.created": handle_review_created,
    "review.updated": handle_review_updated,
    "review.deleted": handle_review_deleted,
}


def main():
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    mongo = MongoClient(MONGO_URI)
    db = mongo[MONGO_DB_NAME]

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BROKER,
        "group.id": GROUP_ID,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
    })
    consumer.subscribe(TOPICS)
    print(f"Review Worker started (broker={KAFKA_BROKER}, topics={TOPICS})")

    try:
        while _running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise KafkaException(msg.error())

            try:
                event = json.loads(msg.value().decode("utf-8"))
                topic = event.get("event", msg.topic())
                data = event.get("data", {})
                handler = HANDLERS.get(topic)
                if handler:
                    handler(db, data)
                else:
                    print(f"[review-worker] no handler for topic: {topic}")
            except Exception as exc:
                print(f"[review-worker] error processing message: {exc}")
    finally:
        consumer.close()
        mongo.close()
        print("Review Worker stopped.")


if __name__ == "__main__":
    main()
