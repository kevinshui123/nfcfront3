# Integration Test Report

Date: 

Summary:

Environment:
- Docker Compose: yes
- Backend: FastAPI scaffold
- DB: Postgres via docker-compose

Commands executed:
- docker-compose up -d
- docker-compose exec backend python -m app.init_db
- docker-compose exec backend pytest -q
- python backend/scripts/smoke_test.py

Results:
- Pytest summary:

- Smoke test results:

Issues found:

Next steps / Fixes:


