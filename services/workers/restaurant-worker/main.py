"""
Restaurant Worker Service — Kafka consumer.

Consumes restaurant.created, restaurant.updated, restaurant.claimed events
and writes the changes to MongoDB.
"""

import json
import os
import signal
import time
import traceback
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from confluent_kafka import Consumer, KafkaError, KafkaException
from pymongo import MongoClient

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")

TOPICS = ["restaurant.created", "restaurant.updated", "restaurant.claimed"]
GROUP_ID = "restaurant-worker-group"

_running = True


def _handle_signal(sig, frame):
    global _running
    print(f"Restaurant Worker: shutting down (signal {sig})")
    _running = False


def handle_restaurant_created(db, data: dict):
    restaurant_id = data.get("restaurant_id")
    if not restaurant_id:
        return
    try:
        oid = ObjectId(restaurant_id)
    except InvalidId:
        return
    existing = db.restaurants.find_one({"_id": oid})
    if not existing:
        db.restaurants.insert_one({
            "_id": oid,
            "name": data.get("name"),
            "cuisine_type": data.get("cuisine_type"),
            "owner_id": data.get("owner_id"),
            "city": data.get("city"),
            "avg_rating": 0.0,
            "review_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
    print(f"[restaurant-worker] created restaurant {restaurant_id}")


def handle_restaurant_updated(db, data: dict):
    restaurant_id = data.get("restaurant_id")
    if not restaurant_id:
        return
    update_fields = {k: v for k, v in data.items()
                     if k not in ("restaurant_id",)}
    update_fields["updated_at"] = datetime.now(timezone.utc)
    try:
        db.restaurants.update_one(
            {"_id": ObjectId(restaurant_id)}, {"$set": update_fields}
        )
    except InvalidId:
        return
    print(f"[restaurant-worker] updated restaurant {restaurant_id}")


def handle_restaurant_claimed(db, data: dict):
    restaurant_id = data.get("restaurant_id")
    owner_id = data.get("owner_id")
    if not restaurant_id or not owner_id:
        return
    try:
        db.restaurants.update_one(
            {"_id": ObjectId(restaurant_id)},
            {"$set": {"owner_id": owner_id, "updated_at": datetime.now(timezone.utc)}},
        )
    except InvalidId:
        return
    print(f"[restaurant-worker] claimed restaurant {restaurant_id} by {owner_id}")


HANDLERS = {
    "restaurant.created": handle_restaurant_created,
    "restaurant.updated": handle_restaurant_updated,
    "restaurant.claimed": handle_restaurant_claimed,
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
    print(f"Restaurant Worker started (broker={KAFKA_BROKER}, topics={TOPICS})")

    try:
        while _running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                code = msg.error().code()
                if code in (KafkaError._PARTITION_EOF, KafkaError.UNKNOWN_TOPIC_OR_PART):
                    time.sleep(2)
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
                    print(f"[restaurant-worker] no handler for topic: {topic}")
            except Exception as exc:
                print(f"[restaurant-worker] error processing message: {exc}")
                traceback.print_exc()
    finally:
        consumer.close()
        mongo.close()
        print("Restaurant Worker stopped.")


if __name__ == "__main__":
    main()
