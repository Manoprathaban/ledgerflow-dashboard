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

This foundation establishes the project structure, configuration, shared contracts, and API bootstrap. The business logic, repository queries, and full PostgreSQL schema are planned for subsequent implementation phases.
