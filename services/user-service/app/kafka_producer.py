"""
Kafka producer stub for user-service.

TODO (partner): Wire up confluent-kafka-python to publish events
to user.created, user.updated topics after signup / profile updates.
"""

import os

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")


async def publish_user_event(topic: str, data: dict) -> None:
    """Publish a user event to the given Kafka topic."""
    # TODO: Implement with confluent-kafka-python
    pass
