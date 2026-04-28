#!/usr/bin/env python3
"""
Summarize JMeter JTL CSV files into rubric-friendly metrics:
- average response time (ms)
- throughput (requests/sec)
- error rate (%)

Reads:  jmeter/results/results_<users>.jtl
Writes: jmeter/results/summary-template.csv (updated rows)
"""

from __future__ import annotations

import csv
import glob
import os
import re
from dataclasses import dataclass


@dataclass
class Metrics:
    concurrency: int
    avg_ms: float
    throughput_rps: float
    error_rate_pct: float


def parse_jtl(path: str, concurrency: int) -> Metrics | None:
    elapsed_values = []
    success_values = []
    first_ts = None
    last_ts = None
    total = 0

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            try:
                ts = int(row.get("timeStamp", "0"))
                elapsed = float(row.get("elapsed", "0"))
            except ValueError:
                continue

            if first_ts is None or ts < first_ts:
                first_ts = ts
            if last_ts is None or ts > last_ts:
                last_ts = ts

            elapsed_values.append(elapsed)
            success_values.append(str(row.get("success", "")).lower() == "true")

    if not elapsed_values or first_ts is None or last_ts is None:
        return None

    avg_ms = sum(elapsed_values) / len(elapsed_values)
    errors = sum(1 for ok in success_values if not ok)
    error_rate_pct = (errors / len(success_values)) * 100.0

    duration_s = max((last_ts - first_ts) / 1000.0, 1e-9)
    throughput_rps = total / duration_s

    return Metrics(
        concurrency=concurrency,
        avg_ms=avg_ms,
        throughput_rps=throughput_rps,
        error_rate_pct=error_rate_pct,
    )


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results_glob = os.path.join(root, "jmeter", "results", "results_*.jtl")
    summary_path = os.path.join(root, "jmeter", "results", "summary-template.csv")

    parsed: dict[int, Metrics] = {}
    for path in glob.glob(results_glob):
        m = re.search(r"results_(\d+)\.jtl$", path)
        if not m:
            continue
        users = int(m.group(1))
        metrics = parse_jtl(path, users)
        if metrics:
            parsed[users] = metrics

    if not os.path.exists(summary_path):
        raise FileNotFoundError(f"Missing summary template: {summary_path}")

    rows = []
    with open(summary_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or [
            "concurrency",
            "avg_response_time_ms",
            "throughput_rps",
            "error_rate_percent",
            "notes",
        ]
        for row in reader:
            try:
                users = int(row.get("concurrency", "0"))
            except ValueError:
                rows.append(row)
                continue

            m = parsed.get(users)
            if m:
                row["avg_response_time_ms"] = f"{m.avg_ms:.2f}"
                row["throughput_rps"] = f"{m.throughput_rps:.2f}"
                row["error_rate_percent"] = f"{m.error_rate_pct:.2f}"
            rows.append(row)

    with open(summary_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Updated summary: {summary_path}")
    for users in sorted(parsed):
        m = parsed[users]
        print(
            f"{users}: avg_ms={m.avg_ms:.2f}, "
            f"throughput_rps={m.throughput_rps:.2f}, "
            f"error_rate_pct={m.error_rate_pct:.2f}"
        )


if __name__ == "__main__":
    main()
