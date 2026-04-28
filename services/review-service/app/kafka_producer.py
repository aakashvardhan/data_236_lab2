import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from functools import partial

from confluent_kafka import Producer

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")

_producer: Producer | None = None


def _get_producer() -> Producer:
    global _producer
    if _producer is None:
        _producer = Producer({"bootstrap.servers": KAFKA_BROKER})
    return _producer


def _delivery_callback(err, msg):
    if err:
        print(f"[review-producer] delivery failed {msg.topic()}: {err}")
    else:
        print(f"[review-producer] delivered to {msg.topic()} [{msg.partition()}]")


def _sync_publish(topic: str, payload: str) -> None:
    global _producer
    try:
        producer = _get_producer()
        producer.produce(topic, value=payload.encode(), callback=_delivery_callback)
        producer.poll(0)
    except Exception as exc:
        print(f"[review-producer] kafka publish error (non-fatal): {exc}")
        _producer = None


async def publish_review_event(topic: str, data: dict) -> None:
    """Fire-and-forget publish — Kafka errors are logged but never propagated."""
    payload = json.dumps({
        "correlation_id": uuid.uuid4().hex,
        "event": topic,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, partial(_sync_publish, topic, payload))
    except Exception as exc:
        print(f"[review-producer] executor error (non-fatal): {exc}")
