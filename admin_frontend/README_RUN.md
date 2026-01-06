Run Admin Frontend (development)

1. Install dependencies:
   cd admin_frontend
   npm install

2. Copy env example if needed:
   cp .env.example .env

3. Run dev server:
   npm run dev

Notes:
- The frontend calls backend at `VITE_BACKEND_URL` (default: `http://localhost:8000`). Adjust `.env` or export `VITE_BACKEND_URL` in your shell.
- Ensure backend is running (`docker-compose up` or direct run) and CORS allows the frontend origin.
 - You can run frontend in mock mode without backend by setting `VITE_MOCK=true`.
   - Example: `VITE_MOCK=true npm run dev`

