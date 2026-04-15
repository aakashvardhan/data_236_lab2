"""
Review Worker Service — Kafka consumer stub.

TODO (partner): Consume from review.created, review.updated, review.deleted
topics. Process review events and write to MongoDB. Publish status updates
back to the frontend service.

Consumer group: review-worker-group
"""

import os

KAFKA_BROKER = os.environ.get("KAFKA_BROKER", "kafka:9092")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "yelp_db")

TOPICS = ["review.created", "review.updated", "review.deleted"]
GROUP_ID = "review-worker-group"


def main():
    print(f"Review Worker starting (broker={KAFKA_BROKER}, topics={TOPICS})")
    # TODO: Implement Kafka consumer loop
    print("Review Worker: consumer not yet implemented")


if __name__ == "__main__":
    main()
