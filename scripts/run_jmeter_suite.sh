#!/usr/bin/env bash
set -euo pipefail

# Runs JMeter non-GUI tests for 100/200/300/400/500 users and stores
# one JTL + dashboard per concurrency level.
#
# Usage:
#   chmod +x scripts/run_jmeter_suite.sh
#   scripts/run_jmeter_suite.sh <restaurant_id> [host] [port]
#
# Example:
#   scripts/run_jmeter_suite.sh 662f9f0b8d6b7f1d2e4a1234 localhost 5173

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <restaurant_id> [host] [port]"
  exit 1
fi

RESTAURANT_ID="$1"
HOST="${2:-localhost}"
PORT="${3:-5173}"
USER_PORT="${USER_PORT:-8001}"
RESTAURANT_PORT="${RESTAURANT_PORT:-8002}"
REVIEW_PORT="${REVIEW_PORT:-8004}"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "Error: jmeter command not found. Install Apache JMeter first."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLAN="$ROOT_DIR/jmeter/test-plan.jmx"
RESULTS_DIR="$ROOT_DIR/jmeter/results"
PREP_USERS_SCRIPT="$ROOT_DIR/scripts/prepare_jmeter_users.py"
RUN_TAG="loadrun$(date +%s)"

mkdir -p "$RESULTS_DIR"

# Prepare enough unique users to avoid duplicate-review application errors.
python3 "$PREP_USERS_SCRIPT" 500 "$HOST" "$PORT" "$ROOT_DIR/jmeter/data/user_credentials.csv" "$RUN_TAG"

for USERS in 100 200 300 400 500; do
  RAMP=$((USERS / 4))
  [[ "$RAMP" -lt 20 ]] && RAMP=20

  JTL="$RESULTS_DIR/results_${USERS}.jtl"
  DASH="$RESULTS_DIR/dashboard_${USERS}"

  rm -f "$JTL"
  rm -rf "$DASH"

  echo "=============================================="
  echo "Running JMeter at concurrency: $USERS"
  echo "Host: $HOST API Ports(user/rest/review): $USER_PORT/$RESTAURANT_PORT/$REVIEW_PORT Restaurant: $RESTAURANT_ID"
  echo "=============================================="

  jmeter -n \
    -t "$PLAN" \
    -l "$JTL" \
    -e -o "$DASH" \
    -Jusers="$USERS" \
    -Jramp="$RAMP" \
    -Jloops=1 \
    -Jhost="$HOST" \
    -Jport="$PORT" \
    -Juser_port="$USER_PORT" \
    -Jrestaurant_port="$RESTAURANT_PORT" \
    -Jreview_port="$REVIEW_PORT" \
    -Jrestaurant_id="$RESTAURANT_ID"
done

echo
echo "JMeter suite complete."
echo "Results: $RESULTS_DIR/results_*.jtl"
echo "Dashboards: $RESULTS_DIR/dashboard_*"
echo "Next: python3 scripts/summarize_jmeter_results.py"
