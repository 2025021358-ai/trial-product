# AI Career Compass

A full-stack app focused on **efficient, user-friendly UI/UX** for AI tool adoption decisions:
- Discover practical AI tools.
- Generate integration plans.
- Follow a 4-week learning path.
- Evaluate whether to stay in a role or plan an exit.
- Sign in with username/password (seeded user database).

## Stack
- **Backend:** FastAPI (Python) + SQLite
- **Frontend:** React + Vite (JavaScript)
- **Tests:** Pytest + Vitest/Testing Library

## Authentication and user database
- On backend startup, a SQLite DB is created at `backend/data/users.db`.
- The app ensures at least **1000 users** exist (`user0001` ... `user1000`).
- Default password for seeded users is: `Password@123`.
- Frontend requires login before loading the dashboard.

## Run locally

### 1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

Set optional env var for frontend:
```bash
VITE_API_BASE=http://localhost:8000
```

## Tests

Backend:
```bash
cd backend
PYTHONPATH=. pytest
```

Frontend:
```bash
cd frontend
npm test
```
