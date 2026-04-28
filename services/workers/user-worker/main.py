"""
User Worker Service — Kafka consumer.

Consumes user.created and user.updated events and writes changes to MongoDB.
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

TOPICS = ["user.created", "user.updated"]
GROUP_ID = "user-worker-group"

_running = True


def _handle_signal(sig, frame):
    global _running
    print(f"User Worker: shutting down (signal {sig})")
    _running = False


def handle_user_created(db, data: dict):
    user_id = data.get("user_id")
    if not user_id:
        return
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        return
    existing = db.users.find_one({"_id": oid})
    if not existing:
        db.users.insert_one({
            "_id": oid,
            "name": data.get("name"),
            "email": data.get("email"),
            "role": data.get("role", "user"),
            "created_at": datetime.now(timezone.utc),
        })
    print(f"[user-worker] created user {user_id}")


def handle_user_updated(db, data: dict):
    user_id = data.get("user_id")
    if not user_id:
        return
    update_fields = {k: v for k, v in data.items() if k != "user_id"}
    update_fields["updated_at"] = datetime.now(timezone.utc)
    try:
        db.users.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_fields}
        )
    except InvalidId:
        return
    print(f"[user-worker] updated user {user_id}")


HANDLERS = {
    "user.created": handle_user_created,
    "user.updated": handle_user_updated,
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
    print(f"User Worker started (broker={KAFKA_BROKER}, topics={TOPICS})")

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
                    print(f"[user-worker] no handler for topic: {topic}")
            except Exception as exc:
                print(f"[user-worker] error processing message: {exc}")
                traceback.print_exc()
    finally:
        consumer.close()
        mongo.close()
        print("User Worker stopped.")


if __name__ == "__main__":
    main()
