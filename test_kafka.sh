#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Kafka integration test — verifies producer→topic→consumer→MongoDB flow.
# Each test: trigger an API operation, wait briefly, then query MongoDB
# via the REST API to confirm the worker wrote the expected data.
# ─────────────────────────────────────────────────────────────────────

BASE_USER="http://localhost:8001"
BASE_RESTAURANT="http://localhost:8002"
BASE_REVIEW="http://localhost:8004"

PASS=0
FAIL=0

TS=$(date +%s)
USER_EMAIL="kafka_test_${TS}@example.com"
OWNER_EMAIL="kafka_owner_${TS}@example.com"
PASSWORD="KafkaTest123!"

check() {
  local desc="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" -eq "$expected" ]; then
    echo "  ✅ $desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — expected $expected, got $actual"
    [ -n "$body" ] && echo "     $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

check_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo "  ✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — expected to find '$needle'"
    echo "     Got: $(echo "$haystack" | head -c 300)"
    FAIL=$((FAIL + 1))
  fi
}

# ── Helper: log worker output ─────────────────────────────────────────────────
worker_logs() {
  docker logs "data_236_lab2-${1}-1" 2>&1 | grep "\[${1}\]" | tail -5
}

echo "========================================"
echo " KAFKA INTEGRATION TEST"
echo "========================================"
echo ""

# ── Setup: create user + owner, get tokens ────────────────────────────────────
echo "[ Setup ] Creating test users..."

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Kafka User\",\"email\":\"$USER_EMAIL\",\"password\":\"$PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/signup (user)" 201 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Kafka Owner\",\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"owner\",\"restaurant_location\":\"San Jose, CA\"}")
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/owner/signup (owner)" 201 "$CODE" "$BODY"
OWNER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
USER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
OWNER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
echo ""

# ── Test 1: user.created ──────────────────────────────────────────────────────
echo "========================================"
echo " 1. user.created — signup triggers event"
echo "========================================"
sleep 3
LOGS=$(worker_logs "user-worker")
check_contains "user-worker consumed user.created" "$LOGS" "created user"
echo "  Worker logs: $LOGS"
echo ""

# ── Test 2: user.updated ──────────────────────────────────────────────────────
echo "========================================"
echo " 2. user.updated — profile update triggers event"
echo "========================================"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_USER/users/me" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"San Jose","state":"CA","about_me":"Kafka test user"}')
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "PUT /users/me triggers user.updated" 200 "$CODE" "$BODY"
sleep 3
LOGS=$(worker_logs "user-worker")
check_contains "user-worker consumed user.updated" "$LOGS" "updated user"
echo "  Worker logs: $LOGS"
echo ""

# ── Test 3: restaurant.created ────────────────────────────────────────────────
echo "========================================"
echo " 3. restaurant.created — create triggers event"
echo "========================================"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_RESTAURANT/restaurants" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kafka Bistro","cuisine_type":"Italian","address":"123 Test St","city":"San Jose","state":"CA","zip_code":"95112","phone":"408-555-0099","pricing_tier":"$$"}')
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "POST /restaurants triggers restaurant.created" 201 "$CODE" "$BODY"
RESTAURANT_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
sleep 3
LOGS=$(worker_logs "restaurant-worker")
check_contains "restaurant-worker consumed restaurant.created" "$LOGS" "created restaurant"
echo "  Worker logs: $LOGS"
echo ""

# ── Test 4: restaurant.updated ────────────────────────────────────────────────
echo "========================================"
echo " 4. restaurant.updated — update triggers event"
echo "========================================"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_RESTAURANT/restaurants/$RESTAURANT_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated via Kafka test"}')
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "PUT /restaurants/{id} triggers restaurant.updated" 200 "$CODE" "$BODY"
sleep 3
LOGS=$(worker_logs "restaurant-worker")
check_contains "restaurant-worker consumed restaurant.updated" "$LOGS" "updated restaurant"
echo "  Worker logs: $LOGS"
echo ""

# ── Test 5: review.created + rating recalculation ─────────────────────────────
echo "========================================"
echo " 5. review.created — create review, worker recalculates rating"
echo "========================================"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_REVIEW/restaurants/$RESTAURANT_ID/reviews" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"comment":"Amazing Kafka-driven review!"}')
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "POST /reviews triggers review.created" 201 "$CODE" "$BODY"
REVIEW_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
sleep 3
LOGS=$(worker_logs "review-worker")
check_contains "review-worker consumed review.created" "$LOGS" "created review"
echo "  Worker logs: $LOGS"
# Confirm rating recalculated by fetching the restaurant
RESTAURANT=$(curl -s "$BASE_RESTAURANT/restaurants/$RESTAURANT_ID")
check_contains "restaurant avg_rating updated after review" "$RESTAURANT" '"avg_rating":5'
echo ""

# ── Test 6: review.updated ────────────────────────────────────────────────────
echo "========================================"
echo " 6. review.updated — edit review triggers event"
echo "========================================"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_REVIEW/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":4,"comment":"Updated via Kafka test"}')
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "PUT /reviews/{id} triggers review.updated" 200 "$CODE" "$BODY"
sleep 3
LOGS=$(worker_logs "review-worker")
check_contains "review-worker consumed review.updated" "$LOGS" "updated review"
echo "  Worker logs: $LOGS"
echo ""

# ── Test 7: review.deleted ────────────────────────────────────────────────────
echo "========================================"
echo " 7. review.deleted — delete review triggers event"
echo "========================================"
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_REVIEW/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1); BODY=$(echo "$RESP" | sed '$d')
check "DELETE /reviews/{id} triggers review.deleted" 200 "$CODE" "$BODY"
sleep 3
LOGS=$(worker_logs "review-worker")
check_contains "review-worker consumed review.deleted" "$LOGS" "deleted review"
echo "  Worker logs: $LOGS"
# Rating should reset to 0.0 after last review deleted
RESTAURANT=$(curl -s "$BASE_RESTAURANT/restaurants/$RESTAURANT_ID")
check_contains "restaurant avg_rating reset to 0 after review deleted" "$RESTAURANT" '"avg_rating":0'
echo ""

# ── Results ───────────────────────────────────────────────────────────────────
echo "========================================"
echo " RESULTS"
echo "========================================"
echo "  Total: $((PASS + FAIL))  |  ✅ Passed: $PASS  |  ❌ Failed: $FAIL"
echo "========================================"
[ "$FAIL" -eq 0 ]
