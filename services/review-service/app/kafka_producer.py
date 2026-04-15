"""
Kafka producer stub for review-service.

TODO (partner): Wire up confluent-kafka-python to publish events
to review.created, review.updated, review.deleted topics after
each review CRUD operation.

Each message should be JSON with at minimum:
    {
        "correlation_id": "<uuid>",
        "event": "review.created",
        "data": { ... review fields ... },
        "timestamp": "<ISO 8601>"
    }
"""

import os

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")


async def publish_review_event(topic: str, data: dict) -> None:
    """Publish a review event to the given Kafka topic."""
    # TODO: Implement with confluent-kafka-python
    pass
