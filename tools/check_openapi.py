import requests, sys

def main():
    try:
        r = requests.get('http://localhost:8001/openapi.json', timeout=5)
    except Exception as e:
        print("request_error", e)
        sys.exit(2)
    print("status:", r.status_code)
    txt = r.text
    print("contains /api/debug/users ?", ("/api/debug/users" in txt) or ("/debug/users" in txt))
    if "/api/debug/users" in txt:
        print("found /api/debug/users")
    else:
        # print a small excerpt
        idx = txt.find("debug")
        print("debug index:", idx)

if __name__ == '__main__':
    main()


