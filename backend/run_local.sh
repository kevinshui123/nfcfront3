#!/usr/bin/env bash
set -euo pipefail

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
. .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

export DATABASE_URL="sqlite+aiosqlite:///./dev.db"
export SILRA_API_KEY="${SILRA_API_KEY:-}"
export SECRET_KEY="${SECRET_KEY:-dev-secret}"

python -m app.init_db
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


