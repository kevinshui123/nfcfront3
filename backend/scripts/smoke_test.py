#!/usr/bin/env python3
import requests
import os
import sys
import time

BASE = os.getenv("BASE_URL", "http://localhost:8000")

def ok_or_exit(resp):
    if resp.status_code >= 400:
        print("Request failed:", resp.status_code, resp.text)
        sys.exit(2)
    print("OK:", resp.status_code)

def main():
    print("Checking /health ...")
    r = requests.get(f"{BASE}/health", timeout=5)
    ok_or_exit(r)

    print("Checking /t/demo-token ...")
    r = requests.get(f"{BASE}/t/demo-token", timeout=5)
    ok_or_exit(r)

    print("Checking /ai/generate (mock) ...")
    payload = {"model":"deepseek-chat","messages":[{"role":"user","content":"测试"}]}
    # this will fail without SILRA_API_KEY; expect 500 if not configured
    r = requests.post(f"{BASE}/ai/generate", json=payload, timeout=10)
    if r.status_code == 200:
        print("AI generate OK")
    else:
        print("AI generate returned", r.status_code, " (may require SILRA_API_KEY).")

if __name__ == "__main__":
    main()


