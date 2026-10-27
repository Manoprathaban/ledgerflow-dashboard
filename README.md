# Ledger

Ledger is a full-stack transaction management application for creating accounts,
recording credits and debits, reviewing transaction history, and transferring
money between accounts.

## Features

- Account creation, balances, search, and detail views
- Credit and debit transactions with duplicate-reference and balance validation
- Transaction history with filtering and pagination
- Atomic transfers between accounts: both accounts are checked and locked, and
  the debit, credit, and balance updates commit or roll back together
- Supabase email/password sign-in and per-user account ownership enforced by
  authenticated API requests and PostgreSQL row-level security

## Project structure

- `frontend/` — React, TypeScript, Vite, and TanStack Start application
- `backend/` — FastAPI service with PostgreSQL persistence
- `supabase/migrations/` — database schema migrations

## Run locally

### Frontend

Requires Node.js and npm.

```sh
cd frontend
npm ci
cp .env.example .env
```

Set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_ANON_KEY` in `frontend/.env`, then run:

```sh
npm run dev
```

### Backend

Requires Python 3.12+ and PostgreSQL. Configure `DATABASE_URL`,
`SUPABASE_URL`, and `SUPABASE_ANON_KEY` in `backend/.env` using
`backend/.env.example`, then run:

```sh
cd backend
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

The API is served under `/api/v1`. See the [API documentation](API_DOCUMENTATION.md)
for endpoints and request/response formats. See [ASSUMPTIONS.md](ASSUMPTIONS.md)
for product scope, data ownership, money handling, and deployment assumptions.

Apply the Supabase migrations in `supabase/migrations/` before starting the API.
The tenant migration keeps pre-existing accounts but leaves their owner unset;
those accounts remain inaccessible until an administrator assigns each account
to the correct Supabase user. New accounts are private to the signed-in user.

## Tests and checks

```sh
cd frontend
npm test
npx tsc --noEmit
npm run lint

cd ../backend
ruff check .
ruff format --check .
mypy
pytest -q
```

## Deployment

The frontend is configured for Vercel (`frontend/` as the project root; build
with `npm run build:vercel`). The backend can be deployed as a FastAPI service
and configured to use PostgreSQL. Set the frontend's API URL to the deployed
backend URL, configure the required Supabase environment variables, and allow
the frontend origin in the backend's CORS settings.

The API validates Supabase access tokens when `SUPABASE_URL` and
`SUPABASE_ANON_KEY` are configured on the backend. Protected API endpoints
return an error if authentication is missing or unavailable. Never expose
database credentials or a privileged database role to the browser.

Application link:https://frontend-rho-swart-9gkfcypwxz.vercel.app/login
