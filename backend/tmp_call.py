import requests 
r = requests.get('http://127.0.0.1:8001/api/shops', headers={'Authorization':'Bearer mock-token'}) 
print(r.status_code) 
print(r.text[:1000]) 
