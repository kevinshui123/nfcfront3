Non-Docker deployment (static frontend + backend)

1) Build frontend (on build machine)

```bash
cd admin_frontend
npm ci
npm run build
```

This produces `admin_frontend/dist/`. Serve this directory with any static server (nginx, Caddy, IIS, or a simple systemd service running `python -m http.server` for quick demos).

2) Backend (Python)

- Create a virtualenv on the server, install `requirements_dev.txt` (uses aiosqlite for dev) or `requirements.txt` for production Postgres.
- Run uvicorn as a service:

systemd unit (example)
```
[Unit]
Description=AllValue Link backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/allvaluelink/backend
Environment="PATH=/srv/allvaluelink/.venv/bin"
ExecStart=/srv/allvaluelink/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

3) Reverse proxy

Use nginx to proxy static and API:

```
server {
  listen 80;
  server_name example.com;
  root /srv/allvaluelink/admin_frontend/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:8001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

4) TLS

Use certbot or managed cert (Caddy/Chef) to enable TLS. Ensure backend knows public origin if you need absolute redirect URLs.


