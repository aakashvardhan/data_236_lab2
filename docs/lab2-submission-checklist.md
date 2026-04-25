# Lab 2 Submission Checklist

Use this checklist before final submission.

## Code + Infra

- [x] Dockerfiles for core services
- [x] `docker-compose.yml` brings up full stack
- [x] Kubernetes manifests in `k8s/`
- [x] Kafka topics + producers/consumers implemented
- [x] MongoDB migration script + bcrypt + session storage
- [x] Redux store with auth/restaurant/review/favourites slices
- [x] Frontend lint + tests passing

## JMeter

- [x] Base JMeter test plan committed (`jmeter/test-plan.jmx`)
- [ ] Run tests at 100/200/300/400/500 users
- [ ] Fill `jmeter/results/summary-template.csv`
- [ ] Export JMeter HTML dashboard/screenshots
- [ ] Add response-time-vs-concurrency graph to report

## AWS / Deployment Evidence (manual)

- [ ] Deploy stack on AWS (EKS or EC2+K8s)
- [ ] Screenshot all pods/services running
- [ ] Screenshot Kafka flow evidence (logs/topics/consumer events)
- [ ] Screenshot Redux DevTools showing state changes in at least 2 slices

## Report (manual)

- [ ] Architecture diagram (Producer -> Kafka -> Consumers)
- [ ] Docker/K8s/Kafka/AWS integration explanation
- [ ] Redux integration explanation
- [ ] Mongo schema and session handling explanation
- [ ] JMeter results + analysis for 100-500 concurrency
- [ ] Final report PDF named per lab format

