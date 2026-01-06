Admin Frontend (React + Vite + Ant Design)

Quick start:

1. Requirements: Node 18+, npm or yarn.
2. From repo root:
   cd admin_frontend
   npm install
   npm run dev

This scaffold includes:
- Vite React app (`src/`) with Ant Design UI.
- Pages: Login, Tags management (batch generate & CSV export).
- Minimal API client in `src/api.js` to call backend endpoints (`/api/auth/token`, `/api/shops/{id}/tags/batch_encode`).

Notes:
- Configure backend base URL in `src/api.js` if needed.
- This is an MVP scaffold for rapid iteration and manual testing.


