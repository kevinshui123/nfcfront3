#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"

echo "Bringing up docker-compose services..."
docker-compose up -d

echo "Waiting 8 seconds for services to initialize..."
sleep 8

echo "Initializing database (seed data)..."
docker-compose exec backend python -m app.init_db

echo "Running backend pytest..."
docker-compose exec backend pytest -q | tee -a backend/scripts/integration_output.log

echo "Running smoke tests..."
python3 backend/scripts/smoke_test.py | tee -a backend/scripts/integration_output.log

echo "Integration run finished. See backend/scripts/integration_output.log for details."


