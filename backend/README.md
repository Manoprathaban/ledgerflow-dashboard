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

Copy the example environment file and set the database URL plus the Supabase
project URL and public anon key. The API uses the Supabase Auth user endpoint to
validate incoming access tokens.

```bash
cp .env.example .env
```

## Supabase database migrations

The deployment migrations in [`../supabase/migrations/`](../supabase/migrations/)
create tenant-owned accounts, transactions, transfer records, integrity
constraints, indexes, timestamp/immutability triggers, and row-level security
policies. The `ledger_app` role is a non-bypass RLS role used by the API. The
migration grants it to the migration role and, when present, the standard
`postgres` and `service_role` roles. Keep database credentials server-side.

After confirming the intended Supabase project and environment, install the Supabase CLI, authenticate, link the project, inspect pending migrations, and apply them:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration list
supabase db push
```

`db push` changes the linked remote database. Confirm the project reference and
review the migration before running it. The tenant migration preserves existing
accounts but leaves their new `owner_id` unset because ownership cannot be
inferred safely. Those accounts and their transaction history stay hidden from
users until an administrator assigns each account to the correct
`auth.users.id`. Do not assign all existing records to one user unless that is
the intended ownership mapping.

## Run the app

```bash
uvicorn app.main:app --reload
```

## Run tests

```bash
pytest
```

## Current status

The backend is a FastAPI layered monolith using Psycopg 3 and raw SQL. SQLAlchemy and other ORM packages are not dependencies. The target API, schema, and frontend payload designs are documented in [`docs/api-contracts.md`](docs/api-contracts.md), [`docs/schema-design.md`](docs/schema-design.md), and [`docs/frontend-design.md`](docs/frontend-design.md).

Account creation, retrieval, balance reads, paginated account search,
transaction creation, transaction detail, filtered transaction history, and
account-to-account transfers are implemented with PostgreSQL persistence.
Every API request requires a valid Supabase Bearer token. Accounts are owned by
the authenticated Supabase user; account and transaction queries are explicitly
scoped, and PostgreSQL RLS applies the same owner check. Transfers are recorded
in a dedicated table and are restricted to accounts owned by the same user.
Transfers lock both accounts in UUID order and commit the transfer record, two
immutable ledger entries, and both balance updates in one database
transaction.

- Transaction amount validation accepts positive decimal strings with up to two fractional digits; descriptions are optional and normalized to an empty string when omitted or blank.
- Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the backend, and restrict CORS origins to deployed frontend domains before production use.
- [`sql/schema.sql`](sql/schema.sql) is a local bootstrap snapshot; Supabase migration history is authoritative for remote deployments.
- The frontend calls the Render API for accounts, transactions, and money transfers.
- API tests cover success/error response shapes and validation. A PostgreSQL-backed smoke flow has been run against a temporary database, but PostgreSQL integration tests are not yet part of the automated suite. Add automated concurrency tests for simultaneous debits and transaction rollback invariants before production use.

Before calling the backend complete, add PostgreSQL-backed tests for account and transaction flows, especially concurrent debits that must not overdraw, duplicate-reference rollback without balance changes, transaction immutability, and list filters/pagination.

## CI/CD and deployment status

The repository workflow is [`../.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml). It runs Ruff, mypy, pytest, frontend ESLint/TypeScript/Vitest/build, and applies the migration to an ephemeral PostgreSQL 17 service to check schema constraints and triggers.

Production deployments are intentionally disabled until repository settings and the application implementations are ready:

- Create a GitHub environment named `production` and add required reviewers.
- Configure environment variable `SUPABASE_PROJECT_REF` and secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. Set repository variable `SUPABASE_MIGRATIONS_ENABLED=true` to apply migrations automatically after successful checks on `main`; the production environment approval still gates the job.
- Configure secret `RENDER_DEPLOY_HOOK_URL` and set `RENDER_DEPLOY_ENABLED=true` only after the Render service is configured and the backend ledger implementation is ready. Manual dispatch supports an explicit backend deploy.
- Configure Vercel secrets `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`; set `VERCEL_DEPLOY_ENABLED=true` only after Vercel project/build configuration is verified. Manual dispatch supports an explicit frontend deploy.
- Production jobs require a successful database migration job first. Never expose the Supabase database password, access token, or Vercel token to client-side builds.

GitHub Actions must be enabled in the repository's Actions settings. No production deploy variables or credentials are committed in this repository. Production deployment jobs remain opt-in until repository deployment settings and credentials are configured.
