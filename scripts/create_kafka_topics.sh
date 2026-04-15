#!/bin/bash
# Create all Kafka topics for the Yelp platform.
# Run inside the Kafka container or with kafka-topics.sh on PATH.
#
# Usage:
#   docker-compose exec kafka bash /scripts/create_kafka_topics.sh
#   OR
#   kubectl exec -it kafka-0 -- bash /scripts/create_kafka_topics.sh

BROKER="${KAFKA_BROKER:-kafka:9092}"
PARTITIONS=3
REPLICATION=1

TOPICS=(
    "review.created"
    "review.updated"
    "review.deleted"
    "restaurant.created"
    "restaurant.updated"
    "restaurant.claimed"
    "user.created"
    "user.updated"
    "booking.status"
)

echo "Creating Kafka topics on broker: $BROKER"
echo "============================================"

for TOPIC in "${TOPICS[@]}"; do
    echo "Creating topic: $TOPIC"
    kafka-topics --bootstrap-server "$BROKER" \
        --create \
        --if-not-exists \
        --topic "$TOPIC" \
        --partitions "$PARTITIONS" \
        --replication-factor "$REPLICATION"
done

echo ""
echo "Listing all topics:"
kafka-topics --bootstrap-server "$BROKER" --list

echo ""
echo "Done. All ${#TOPICS[@]} topics created."
