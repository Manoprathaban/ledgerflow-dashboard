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
- [`sql/schema.sql`](sql/schema.sql) is a bootstrap DDL design, but there is no migration runner or automated database initialization.
- The frontend still uses browser-persisted mock services; there is no HTTP client or live API integration.
- The current test suite passes, but its route tests only check placeholder responses and schema tests validate request models. There are no PostgreSQL integration, atomicity, concurrency, immutability, or end-to-end tests.

Before calling the backend complete, add PostgreSQL-backed tests for account and transaction flows, especially concurrent debits that must not overdraw, duplicate-reference rollback without balance changes, transaction immutability, and list filters/pagination.

## CI/CD and deployment status

No GitHub Actions workflow, Dockerfile, Docker Compose configuration, or deployment guide is currently provided. The `.env.example` documents local application settings, but production secrets, database provisioning, schema rollout, health/readiness checks, and deployment procedures are not defined. These remain deployment work; the repository should not be described as production-deployable until they are addressed.
