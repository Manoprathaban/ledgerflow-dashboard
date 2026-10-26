# Ledger backend

This directory contains the Python backend foundation for the Ledger transaction management system.

## Architecture

The project follows a layered monolithic structure:

- API layer: HTTP entry points and route handling
- Schemas: request and response validation
- Services: business rules and workflow orchestration
- Repositories: raw SQL access via Psycopg
- Database layer: connection lifecycle and transaction boundaries
- Core: environment configuration and shared exceptions

## Prerequisites

- Python 3.12+
- PostgreSQL
- A local virtual environment

## Setup

```bash
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Environment configuration

Copy the example environment file and adjust the database URL as needed:

```bash
cp .env.example .env
```

## Supabase database migrations

The deployment migrations in [`../supabase/migrations/`](../supabase/migrations/) create the account and transaction tables, constraints, indexes, timestamp/immutability triggers, and backend-only row-level security policies. The app must use a trusted server-side database credential; never put database credentials or a Supabase service-role key in the frontend.

After confirming the intended Supabase project and environment, install the Supabase CLI, authenticate, link the project, inspect pending migrations, and apply them:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration list
supabase db push
```

`db push` changes the linked remote database. Confirm the project reference and review the migration before running it; do not apply this initial schema migration over pre-existing ledger tables without first inspecting and planning for their data.

## Run the app

```bash
uvicorn app.main:app --reload
```

## Run tests

```bash
pytest
```

## Current status

The backend is a FastAPI layered-monolith scaffold using Psycopg 3 and raw SQL. SQLAlchemy and other ORM packages are not dependencies. The target API, schema, and frontend payload designs are documented in [`docs/api-contracts.md`](docs/api-contracts.md), [`docs/schema-design.md`](docs/schema-design.md), and [`docs/frontend-design.md`](docs/frontend-design.md).

The current implementation is not a working ledger API:

- API routes return placeholders; they do not use request/response schemas or implement the documented status/error contract.
- The current transaction request schema requires a non-empty `description`, while the target API contract and existing frontend form allow it to be omitted or blank. Resolve this before wiring the frontend to the API.
- The transaction amount schema rejects leading-zero values that the frontend's mock parser accepts; normalize values at the API boundary or align the two validators.
- Services and repositories are scaffolds; they do not implement SQL-backed account or transaction operations.
- [`sql/schema.sql`](sql/schema.sql) is a local bootstrap snapshot; Supabase migration history is authoritative for remote deployments.
- The frontend still uses browser-persisted mock services; there is no HTTP client or live API integration.
- The current test suite passes, but its route tests only check placeholder responses and schema tests validate request models. There are no PostgreSQL integration, atomicity, concurrency, immutability, or end-to-end tests.

Before calling the backend complete, add PostgreSQL-backed tests for account and transaction flows, especially concurrent debits that must not overdraw, duplicate-reference rollback without balance changes, transaction immutability, and list filters/pagination.

## CI/CD and deployment status

The repository workflow is [`../.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml). It runs Ruff, mypy, pytest, frontend ESLint/TypeScript/Vitest/build, and applies the migration to an ephemeral PostgreSQL 17 service to check schema constraints and triggers.

Production deployments are intentionally disabled until repository settings and the application implementations are ready:

- Create a GitHub environment named `production` and add required reviewers.
- Configure environment variable `SUPABASE_PROJECT_REF` and secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. Set repository variable `SUPABASE_MIGRATIONS_ENABLED=true` to apply migrations automatically after successful checks on `main`; the production environment approval still gates the job.
- Configure secret `RENDER_DEPLOY_HOOK_URL` and set `RENDER_DEPLOY_ENABLED=true` only after the Render service is configured and the backend ledger implementation is ready. Manual dispatch supports an explicit backend deploy.
- Configure Vercel secrets `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`; set `VERCEL_DEPLOY_ENABLED=true` only after Vercel project/build configuration is verified. Manual dispatch supports an explicit frontend deploy.
- Production jobs require a successful database migration job first. Never expose the Supabase database password, access token, or Vercel token to client-side builds.

GitHub Actions must be enabled in the repository's Actions settings. No production deploy variables or credentials are committed in this repository. The backend routes are currently placeholders and the frontend still uses mock data; deployments remain opt-in until those limitations are resolved.
