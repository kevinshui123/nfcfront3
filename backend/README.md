FastAPI backend scaffold for AllValue Link

Quick start (requires Docker & docker-compose):

1. Copy `.env.example` to `.env` and fill in values.
2. Run: `docker-compose up --build`
3. Backend will be available at `http://localhost:8000`

Included:
- FastAPI minimal app at `backend/app/main.py`
- Dockerfile for backend
- docker-compose.yml at repo root to run Postgres + backend
Next steps:
- Implement DB models and migrations (Alembic)
- Implement GET /t/{token} to resolve NFC token -> content
- Configure Silra AI proxy:
  - Set `SILRA_API_KEY` environment variable (do NOT commit keys into repo).
  - Optional: set `SILRA_API_URL` if you need a different endpoint.
  - Call POST `/ai/generate` with JSON body: `{ "model":"deepseek-chat", "messages":[{"role":"user","content":"..."}] }`

Database initialization
- To create tables and seed demo data locally, after `docker-compose up` run:
  - `docker-compose exec backend python -m app.init_db`
  - Or run locally (with DATABASE_URL pointing to your DB): `python backend/app/init_db.py`

Notes:
- This script uses SQLAlchemy async engine to create tables from models and insert a small demo dataset (shop, tag, content).
- For production migrations, replace this with Alembic-based migrations (not included in scaffold).

Developer setup (Windows PowerShell)
- Quick setup script:
  - From repo root run: `cd backend` then `.\setup_dev.ps1`
  - This creates a virtual environment at `backend/.venv`, activates it, and installs Python dependencies.

- VSCode
  - If you use VSCode, open the workspace at repo root. The project includes `.vscode/settings.json` configured to use the backend venv.
  - After running the setup script, reload the VSCode window and ensure the Python interpreter is set to `backend/.venv`.

Troubleshooting import warnings
- If your editor shows "Import ... could not be resolved", ensure:
  - You've activated `backend/.venv` and installed dependencies (`pip install -r backend/requirements.txt`).
  - VSCode `python.defaultInterpreterPath` points to `backend/.venv/Scripts/python.exe`.
  - Restart the language server or reload the editor window.

Devcontainer (recommended)
- This repository includes a VS Code devcontainer configuration to create a reproducible development environment.
- Usage:
  1. Open this repository in VS Code.
  2. Install "Remote - Containers" extension if you don't have it.
  3. From the Command Palette choose "Remote-Containers: Open Folder in Container..."
  4. The container will start using `docker-compose.yml`, build the `backend` service, and run `postCreateCommand` which creates a venv and installs backend dependencies.
  5. After the container is ready, the Python interpreter will point to the created venv inside the container.

Notes:
- Devcontainer forwards ports 8000 and 5432 so you can run backend and DB inside the containerized environment and access them from the host (or other containers).
- The devcontainer is the recommended way to eliminate "Import could not be resolved" warnings across different developer machines.

Continuous Integration
- The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` which runs Python tests in `backend/` on push/PR to main/master.

Smoke tests
- A small smoke test script is available at `backend/scripts/smoke_test.py`. Run it after starting the backend:
  - `BASE_URL=http://localhost:8000 python backend/scripts/smoke_test.py`
  - Note: `/ai/generate` requires `SILRA_API_KEY` to be set to return a successful 200 response.


