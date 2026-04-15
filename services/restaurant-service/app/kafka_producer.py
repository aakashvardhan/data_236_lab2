"""
Kafka producer stub for restaurant-service.

TODO (partner): Wire up confluent-kafka-python to publish events
to restaurant.created, restaurant.updated, restaurant.claimed topics.
"""

import os

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")


async def publish_restaurant_event(topic: str, data: dict) -> None:
    """Publish a restaurant event to the given Kafka topic."""
    # TODO: Implement with confluent-kafka-python
    pass
