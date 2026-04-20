#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Comprehensive API endpoint test script
# Tests all endpoints across user, restaurant, owner, and review services
# ─────────────────────────────────────────────────────────────────────

BASE_USER="http://localhost:8001"
BASE_RESTAURANT="http://localhost:8002"
BASE_OWNER="http://localhost:8003"
BASE_REVIEW="http://localhost:8004"

PASS=0
FAIL=0
SKIP=0

# Unique test email to avoid conflicts with existing data
TIMESTAMP=$(date +%s)
TEST_USER_EMAIL="testuser_${TIMESTAMP}@example.com"
TEST_OWNER_EMAIL="testowner_${TIMESTAMP}@example.com"
TEST_PASSWORD="testpass123"

check() {
  local description="$1"
  local expected_code="$2"
  local actual_code="$3"
  local body="$4"

  if [ "$actual_code" -eq "$expected_code" ]; then
    echo "  ✅ $description (HTTP $actual_code)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $description — expected $expected_code, got $actual_code"
    echo "     Response: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " 1. HEALTH CHECKS"
echo "========================================"

for svc in "$BASE_USER" "$BASE_RESTAURANT" "$BASE_OWNER" "$BASE_REVIEW"; do
  RESP=$(curl -s -w "\n%{http_code}" "$svc/health")
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check "GET $svc/health" 200 "$CODE" "$BODY"
done

echo ""
echo "========================================"
echo " 2. USER SERVICE — Auth"
echo "========================================"

# Signup regular user
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/signup (regular user)" 201 "$CODE" "$BODY"

# Duplicate signup should fail
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/signup (duplicate → 400)" 400 "$CODE" "$BODY"

# Login
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/login" 200 "$CODE" "$BODY"
USER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

# Login with wrong password
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"wrongpassword\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/login (bad password → 401)" 401 "$CODE" "$BODY"

# Signup owner
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/owner/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Owner\",\"email\":\"$TEST_OWNER_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"role\":\"owner\",\"restaurant_location\":\"San Jose, CA\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/owner/signup" 201 "$CODE" "$BODY"

# Login as owner
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_OWNER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/login (owner)" 200 "$CODE" "$BODY"
OWNER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

# Logout
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/logout" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/logout" 200 "$CODE" "$BODY"

# Logout without token → 401
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/logout")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/logout (no token → 401)" 401 "$CODE" "$BODY"

# Re-login to get a fresh session for subsequent tests
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /auth/login (re-login after logout)" 200 "$CODE" "$BODY"
USER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

echo ""
echo "========================================"
echo " 3. USER SERVICE — Profile"
echo "========================================"

# Get profile
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/users/me" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /users/me" 200 "$CODE" "$BODY"

# Update profile
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_USER/users/me" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"San Jose","state":"CA","about_me":"Test user bio"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "PUT /users/me" 200 "$CODE" "$BODY"

# Get profile without auth → 401
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/users/me")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /users/me (no auth → 401)" 401 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 4. USER SERVICE — Preferences"
echo "========================================"

# Save preferences
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/users/me/preferences" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cuisines":"Italian,Mexican","price_range":"$$","dietary_needs":"vegetarian"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /users/me/preferences" 201 "$CODE" "$BODY"

# Get preferences
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/users/me/preferences" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /users/me/preferences" 200 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 5. RESTAURANT SERVICE — CRUD"
echo "========================================"

# Create restaurant (as owner)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_RESTAURANT/restaurants" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Restaurant","cuisine_type":"Italian","description":"A test restaurant","address":"123 Main St","city":"San Jose","state":"CA","zip_code":"95112","phone":"408-555-1234","pricing_tier":"$$","hours":"Mon-Fri 11am-10pm"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /restaurants (create)" 201 "$CODE" "$BODY"
RESTAURANT_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# Get single restaurant
RESP=$(curl -s -w "\n%{http_code}" "$BASE_RESTAURANT/restaurants/$RESTAURANT_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /restaurants/{id}" 200 "$CODE" "$BODY"

# Search/list restaurants
RESP=$(curl -s -w "\n%{http_code}" "$BASE_RESTAURANT/restaurants?city=San+Jose")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /restaurants?city=San+Jose (search)" 200 "$CODE" "$BODY"

# Search by cuisine
RESP=$(curl -s -w "\n%{http_code}" "$BASE_RESTAURANT/restaurants?cuisine_type=Italian")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /restaurants?cuisine_type=Italian" 200 "$CODE" "$BODY"

# Search by keywords
RESP=$(curl -s -w "\n%{http_code}" "$BASE_RESTAURANT/restaurants?keywords=test")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /restaurants?keywords=test" 200 "$CODE" "$BODY"

# Update restaurant (as owner)
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_RESTAURANT/restaurants/$RESTAURANT_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description for the test restaurant"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "PUT /restaurants/{id} (update)" 200 "$CODE" "$BODY"

# Update restaurant as regular user → 403
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_RESTAURANT/restaurants/$RESTAURANT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Should not work"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "PUT /restaurants/{id} (non-owner → 403)" 403 "$CODE" "$BODY"

# Get nonexistent restaurant → 404
RESP=$(curl -s -w "\n%{http_code}" "$BASE_RESTAURANT/restaurants/000000000000000000000000")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /restaurants/{bad_id} (→ 404)" 404 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 6. REVIEW SERVICE"
echo "========================================"

# Create review (as regular user)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_REVIEW/restaurants/$RESTAURANT_ID/reviews" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":4,"comment":"Great food, nice ambiance!"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /restaurants/{id}/reviews (create)" 201 "$CODE" "$BODY"
REVIEW_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# Duplicate review → 400
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_REVIEW/restaurants/$RESTAURANT_ID/reviews" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"comment":"Duplicate review"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /restaurants/{id}/reviews (duplicate → 400)" 400 "$CODE" "$BODY"

# List reviews for restaurant
RESP=$(curl -s -w "\n%{http_code}" "$BASE_REVIEW/restaurants/$RESTAURANT_ID/reviews")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /restaurants/{id}/reviews (list)" 200 "$CODE" "$BODY"

# Update review
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_REVIEW/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"comment":"Updated: Amazing food!"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "PUT /reviews/{id} (update)" 200 "$CODE" "$BODY"

# Update review as different user → 403
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_REVIEW/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":1}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "PUT /reviews/{id} (wrong user → 403)" 403 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 7. RESTAURANT OWNER SERVICE"
echo "========================================"

# Get own restaurants
RESP=$(curl -s -w "\n%{http_code}" "$BASE_OWNER/owner/restaurants" \
  -H "Authorization: Bearer $OWNER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /owner/restaurants" 200 "$CODE" "$BODY"

# Get reviews for owned restaurant
RESP=$(curl -s -w "\n%{http_code}" "$BASE_OWNER/owner/restaurants/$RESTAURANT_ID/reviews" \
  -H "Authorization: Bearer $OWNER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /owner/restaurants/{id}/reviews" 200 "$CODE" "$BODY"

# Get analytics for owned restaurant
RESP=$(curl -s -w "\n%{http_code}" "$BASE_OWNER/owner/restaurants/$RESTAURANT_ID/analytics" \
  -H "Authorization: Bearer $OWNER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /owner/restaurants/{id}/analytics" 200 "$CODE" "$BODY"

# Regular user accessing owner endpoint → 403
RESP=$(curl -s -w "\n%{http_code}" "$BASE_OWNER/owner/restaurants" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /owner/restaurants (non-owner → 403)" 403 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 8. USER SERVICE — Favorites"
echo "========================================"

# Add favorite
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/favorites/$RESTAURANT_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /favorites/{restaurant_id} (add)" 201 "$CODE" "$BODY"

# Duplicate favorite → 400
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/favorites/$RESTAURANT_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /favorites/{id} (duplicate → 400)" 400 "$CODE" "$BODY"

# List favorites
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/favorites" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /favorites (list)" 200 "$CODE" "$BODY"

# User history
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/favorites/me/history" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /favorites/me/history" 200 "$CODE" "$BODY"

# Remove favorite
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_USER/favorites/$RESTAURANT_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "DELETE /favorites/{restaurant_id}" 200 "$CODE" "$BODY"

# Remove again → 404
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_USER/favorites/$RESTAURANT_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "DELETE /favorites/{id} (already removed → 404)" 404 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 9. AI ASSISTANT (may skip if no API key)"
echo "========================================"

# Chat history (should work even without API keys)
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/ai-assistant/chat/history?session_id=test" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /ai-assistant/chat/history" 200 "$CODE" "$BODY"

# List sessions
RESP=$(curl -s -w "\n%{http_code}" "$BASE_USER/ai-assistant/sessions" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /ai-assistant/sessions" 200 "$CODE" "$BODY"

# Clear chat
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_USER/ai-assistant/chat/clear?session_id=test" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /ai-assistant/chat/clear" 200 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " 10. CLEANUP — Delete test review"
echo "========================================"

RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_REVIEW/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "DELETE /reviews/{id}" 200 "$CODE" "$BODY"

# Delete already-deleted review → 404
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_REVIEW/reviews/$REVIEW_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "DELETE /reviews/{id} (already deleted → 404)" 404 "$CODE" "$BODY"

echo ""
echo "========================================"
echo " RESULTS"
echo "========================================"
TOTAL=$((PASS + FAIL))
echo "  Total: $TOTAL  |  ✅ Passed: $PASS  |  ❌ Failed: $FAIL"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
