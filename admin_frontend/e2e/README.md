Playwright E2E tests (admin frontend)

Setup:

1. cd admin_frontend/e2e
2. npm install

Run tests:

- Start backend and frontend (see admin_frontend/README_RUN.md and backend README)
- Ensure frontend is available at http://localhost:5173 (or set E2E_FRONTEND_URL)
- Run: npm test

Notes:
- Tests log in with demo account `admin@example.com` / `password123` created by `init_db.py`.
- Tests assume backend and frontend are reachable and CORS/auth are correctly configured.


