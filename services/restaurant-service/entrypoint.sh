#!/bin/sh
set -e

echo "=== Running database seed ==="
python seeds/seed.py
echo "=== Seed complete, starting server ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8002
