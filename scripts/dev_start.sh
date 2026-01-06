#!/usr/bin/env bash
set -euo pipefail

echo "Starting backend (run_local.sh) in background..."
pushd backend
./run_local.sh > ../backend_dev.log 2>&1 &
BACKEND_PID=$!
popd

echo "Waiting 6s for backend to initialize..."
sleep 6

echo "Starting frontend (mock mode)..."
cd admin_frontend
VITE_MOCK=true npm install
VITE_MOCK=true npm run dev


