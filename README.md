# AI Career Compass

A full-stack starter focused on **efficient, user-friendly UI/UX** for AI tool adoption decisions:
- Discover practical AI tools.
- Generate integration plans.
- Follow a 4-week learning path.
- Evaluate whether to stay in a role or plan an exit.

## Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite (JavaScript)
- **Tests:** Pytest + Vitest/Testing Library

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
pytest
```

Frontend:
```bash
cd frontend
npm test
```
