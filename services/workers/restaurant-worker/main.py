"""
Restaurant Worker Service — Kafka consumer stub.

TODO (partner): Consume from restaurant.created, restaurant.updated,
restaurant.claimed topics. Process events and write to MongoDB.

Consumer group: restaurant-worker-group
"""

import os

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")

TOPICS = ["restaurant.created", "restaurant.updated", "restaurant.claimed"]
GROUP_ID = "restaurant-worker-group"


def main():
    print(f"Restaurant Worker starting (broker={KAFKA_BROKER}, topics={TOPICS})")
    # TODO: Implement Kafka consumer loop
    print("Restaurant Worker: consumer not yet implemented")


if __name__ == "__main__":
    main()
