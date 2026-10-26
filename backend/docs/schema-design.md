# Schema design

This document describes the PostgreSQL schema that supports the Ledger API contract.

## Design goals

- Keep the schema aligned with the backend payload contract.
- Preserve decimal-safe money values at the database boundary.
- Enforce uniqueness and integrity rules in SQL, not just in application code.
- Support immutable transaction history and atomic balance updates.
- Keep the model simple enough for a single-service monolith with a relational database.

## Core tables

### `accounts`

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Notes

- The `id` is the canonical resource identifier used in the API.
- `name` is trimmed before persistence and enforced as a non-empty value.
- `balance` stores the current account net value as a decimal-safe number.
- `updated_at` is useful for auditing and future optimistic locking or data sync use cases.

### `transactions`

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL DEFAULT '',
    reference_id VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, reference_id)
);
```

#### Notes

- `type` is restricted to `credit` or `debit`.
- `amount` is positive because the backend contract rejects zero and negative values.
- `reference_id` is unique within an account; the same value may appear under different accounts.
- `description` is stored as-is after trimming at the API layer.
- Transactions are immutable by application design. The schema does not expose an update path.

## Supporting indexes

```sql
CREATE INDEX idx_accounts_name ON accounts (name);
CREATE INDEX idx_transactions_account_created_at
    ON transactions (account_id, created_at DESC);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX idx_transactions_reference_id ON transactions (reference_id);
```

#### Why these indexes matter

- account_name lookup in list/search endpoints is fast
- by-account transaction history is sorted by newest-first
- global transaction list supports filtering and ordering efficiently
- reference lookups are available for duplicate detection and validation

## Balance integrity rules

The balance must always stay consistent with the transaction ledger. In practice, the repository/service layer should enforce this with a transaction boundary like this:

1. Validate the request.
2. Lock the account row.
3. Check current balance and debit limits.
4. Insert the transaction.
5. Update the account balance.
6. Commit the database transaction.

Example pseudocode:

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = $1 FOR UPDATE;
-- validate debit / credit rules
INSERT INTO transactions (...)
VALUES (...);
UPDATE accounts
SET balance = balance + $delta,
    updated_at = NOW()
WHERE id = $1;
COMMIT;
```

This ensures that a transaction cannot be committed without the corresponding balance adjustment.

## Backend contract alignment

The schema should align directly with the following payloads:

- `AccountResponse`: `id`, `name`, `balance`, `created_at`
- `TransactionResponse`: `id`, `account_id`, `type`, `amount`, `description`, `reference_id`, `created_at`
- list responses: `items`, `page`, `page_size`, `total`, `total_pages`

## Future considerations

- Add a `version` or `updated_at` audit trail if row-level concurrency becomes important.
- If multi-currency support is introduced later, replace the single `balance`/`amount` currency assumptions with explicit `currency_code` fields.
- If there is a need for soft-delete or reversal support, add an explicit ledger state field rather than mutating historical rows.

This schema is intentionally small, deterministic, and compatible with the frontend and backend design described elsewhere in the docs.
