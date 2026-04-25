# JMeter Performance Testing (Lab 2)

This folder contains the Lab 2 JMeter artifacts.

## Files

- `test-plan.jmx` — base test plan with thread groups for 100/200/300/400/500 users.
- `results/.gitkeep` — keeps the results folder in git.
- `results/summary-template.csv` — fill this after running tests.

## APIs to test (per lab rubric)

1. `POST /api/users/auth/login` (user authentication)
2. `GET /api/restaurants/restaurants` (restaurant search)
3. `POST /api/reviews/restaurants/{restaurant_id}/reviews` (review submit / Kafka flow)

The provided plan is a ready starting point for concurrency sweeps.
If your endpoints or auth flow differ, adjust host, path, and payloads in JMeter UI.

## Run in non-GUI mode

From project root:

```bash
jmeter -n \
  -t jmeter/test-plan.jmx \
  -l jmeter/results/lab2_results.jtl \
  -e -o jmeter/results/dashboard
```

## What to capture for submission

- Average response time
- Throughput (requests/sec)
- Error rate
- Runs at 100, 200, 300, 400, 500 users
- Graph of avg response time vs concurrency
- Screenshots from JMeter dashboard/report

