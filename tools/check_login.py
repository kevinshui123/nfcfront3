import requests
import sys

def main():
    url = "http://localhost:8001/api/auth/token"
    payload = {"email": "admin@example.com", "password": "password123"}
    try:
        r = requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print("request_error", str(e))
        sys.exit(2)
    print("status_code:", r.status_code)
    try:
        print("json:", r.json())
    except Exception:
        print("text:", r.text)

if __name__ == "__main__":
    main()


