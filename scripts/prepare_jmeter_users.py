#!/usr/bin/env python3
"""
Prepare load-test users for JMeter and write credentials CSV.

This script creates users via signup endpoint if they do not exist yet.
It is idempotent: existing users are skipped.
"""

from __future__ import annotations

import csv
import json
import sys
import urllib.error
import urllib.request


def usage() -> None:
    print(
        "Usage: prepare_jmeter_users.py <count> [host] [port] [output_csv] [email_prefix]\n"
        "Example: prepare_jmeter_users.py 500 localhost 5173 jmeter/data/user_credentials.csv loadrun1700000"
    )


def signup_user(base_url: str, name: str, email: str, password: str) -> tuple[bool, str]:
    payload = json.dumps(
        {
            "name": name,
            "email": email,
            "password": password,
            "role": "user",
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/users/auth/signup",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if 200 <= resp.status < 300:
                return True, "created"
            return False, f"unexpected_status_{resp.status}"
    except urllib.error.HTTPError as e:
        # Existing user returns 400 "Email already registered" in this app.
        if e.code == 400:
            return True, "exists"
        return False, f"http_{e.code}"
    except Exception as e:  # noqa: BLE001
        return False, str(e)


def main() -> int:
    if len(sys.argv) < 2:
        usage()
        return 1

    try:
        count = int(sys.argv[1])
    except ValueError:
        usage()
        return 1

    host = sys.argv[2] if len(sys.argv) > 2 else "localhost"
    port = sys.argv[3] if len(sys.argv) > 3 else "5173"
    output_csv = sys.argv[4] if len(sys.argv) > 4 else "jmeter/data/user_credentials.csv"
    email_prefix = sys.argv[5] if len(sys.argv) > 5 else "loaduser"

    base_url = f"http://{host}:{port}"
    password = "Password123!"

    created = 0
    existing = 0
    failed = 0
    rows: list[tuple[str, str]] = []

    for i in range(1, count + 1):
        email = f"{email_prefix}{i:04d}@sjsu.edu"
        name = f"{email_prefix} {i:04d}"
        ok, reason = signup_user(base_url, name, email, password)
        if ok and reason == "created":
            created += 1
        elif ok and reason == "exists":
            existing += 1
        else:
            failed += 1
            print(f"Failed {email}: {reason}")
            continue
        rows.append((email, password))

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["email", "password"])
        writer.writerows(rows)

    print(
        f"Prepared CSV: {output_csv} | rows={len(rows)} | created={created} | "
        f"existing={existing} | failed={failed}"
    )
    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
