# JMeter Performance Testing (Lab 2)

This folder contains reusable JMeter assets and result templates.

## Files

- `test-plan.jmx` — parameterized test plan (login, restaurant search, review submit)
- `data/user_credentials.csv` — credentials CSV used by the plan
- `results/summary-template.csv` — rubric metrics table to fill automatically
- `results/dashboard_*` — HTML dashboards generated per concurrency run

## One-time setup

1. Ensure your stack is running (`docker compose up -d`)
2. Choose a valid `restaurant_id` for the review API
3. The run script auto-prepares 500 load users and rewrites `jmeter/data/user_credentials.csv`

## Recommended run flow

From project root:

```bash
chmod +x scripts/run_jmeter_suite.sh
scripts/run_jmeter_suite.sh <restaurant_id> localhost 5173
python3 scripts/summarize_jmeter_results.py
```

This runs 5 passes at 100/200/300/400/500 users, auto-creates unique load users,
and updates:
- `jmeter/results/summary-template.csv`

## Direct JMeter CLI example

```bash
jmeter -n \
  -t jmeter/test-plan.jmx \
  -l jmeter/results/results_100.jtl \
  -e -o jmeter/results/dashboard_100 \
  -Jusers=100 -Jramp=25 -Jloops=1 \
  -Jrestaurant_id=<restaurant_id> -Jhost=localhost -Jport=5173
```

## APIs covered (rubric)

1. `POST /api/users/auth/login`
2. `GET /api/restaurants/restaurants`
3. `POST /api/reviews/restaurants/{restaurant_id}/reviews`

## Submission evidence to capture

- Average response time, throughput, error rate at each concurrency level
- Graph: average response time (y) vs concurrency (x)
- Screenshots from JMeter dashboard and summary output

