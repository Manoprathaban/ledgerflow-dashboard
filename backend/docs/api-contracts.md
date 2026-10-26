# API contracts (initial draft)

This document defines the intended backend API surface for the Ledger application.

The detailed request and response schemas are still pending design and validation. This file is intentionally a high-level contract outline only.

## Accounts

### `POST /api/v1/accounts`
Purpose: create a new account.

Status: pending schema design.

Notes:
- account holder name is required
- initial balance is server-controlled and should default to zero
- duplicate or invalid requests should produce clear validation errors

### `GET /api/v1/accounts`
Purpose: list accounts with optional pagination and filtering.

Status: pending schema design.

### `GET /api/v1/accounts/{account_id}`
Purpose: fetch one account by identifier.

Status: pending schema design.

### `GET /api/v1/accounts/{account_id}/balance`
Purpose: return the current ledger balance for a single account.

Status: pending schema design.

## Transactions

### `POST /api/v1/accounts/{account_id}/transactions`
Purpose: create a credit or debit transaction for an account.

Status: pending schema design.

Notes:
- amount must be positive
- duplicate reference IDs are rejected within the same account
- insufficient balance rejects debits
- balance changes and transaction insertions are atomic

### `GET /api/v1/accounts/{account_id}/transactions`
Purpose: fetch transaction history for one account, with filtering and pagination.

Status: pending schema design.

### `GET /api/v1/transactions`
Purpose: list transactions across all accounts with optional filters.

Status: pending schema design.

## Shared notes

- All monetary values are represented as decimal-safe amounts.
- Creation timestamps are server-generated.
- Transaction immutability is enforced at the application layer and in SQL constraints.
- Response contracts and pagination models will be finalized before implementation.
