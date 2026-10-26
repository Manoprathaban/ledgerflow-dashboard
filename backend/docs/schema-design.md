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
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00
        CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_name_not_blank CHECK (name ~ '[^[:space:]]')
);
```

#### Notes

- The `id` is the canonical resource identifier used in the API.
- `name` is trimmed before persistence and enforced as a non-empty value.
- `balance` stores the current account net value as a decimal-safe number.
- `updated_at` is useful for auditing and future optimistic locking or data sync use cases.

### `transactions`

```sql
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(500) NOT NULL DEFAULT '',
    reference_id VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transactions_reference_not_blank CHECK (reference_id ~ '[^[:space:]]'),
    CONSTRAINT transactions_reference_canonical CHECK (reference_id = lower(reference_id))
);

CREATE UNIQUE INDEX idx_transactions_unique_reference_per_account
    ON public.transactions (account_id, lower(reference_id));

CREATE OR REPLACE FUNCTION public.prevent_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Transactions are immutable'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER transactions_are_immutable
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_transaction_mutation();

CREATE TRIGGER transactions_truncate_are_immutable
BEFORE TRUNCATE ON public.transactions
FOR EACH STATEMENT
EXECUTE FUNCTION public.prevent_transaction_mutation();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
```

#### Notes

- `type` is restricted to `credit` or `debit`.
- `amount` is positive because the backend contract rejects zero and negative values.
- `reference_id` is trimmed and lower-cased by the API, unique case-insensitively within an account, and may be reused by another account.
- `description` is stored as-is after trimming at the API layer.
- Immutability triggers reject `UPDATE`, `DELETE`, and `TRUNCATE` on transaction rows. The application database role should not own the tables or have DDL privileges.
- The unique reference index is case-insensitive and supports the per-account duplicate check. The reference canonicalization rule must be the same in API validation and SQL.
- Row-level security uses backend-only policies. They allow the trusted `postgres` and `service_role` database roles while blocking Supabase `anon` and `authenticated` roles. Never expose privileged credentials to browser code.

## Supporting indexes

```sql
CREATE INDEX idx_accounts_created_at
    ON public.accounts (created_at DESC, id DESC);
CREATE INDEX idx_transactions_account_created_at
    ON public.transactions (account_id, created_at DESC, id DESC);
CREATE INDEX idx_transactions_created_at
    ON public.transactions (created_at DESC, id DESC);
```

#### Why these indexes matter

- account list and by-account transaction history use the API's deterministic newest-first order
- global transaction list supports date ordering and deterministic ties
- the unique reference index enforces duplicate prevention within each account

The account-name and transaction-description searches are substring searches in the frontend contract. These B-tree indexes do not accelerate arbitrary `%term%` matching; begin without a specialized search index and add `pg_trgm` only if measured query performance requires it.

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
-- Validate the debit against the locked, current balance.
INSERT INTO transactions (...)
VALUES (...);
UPDATE accounts
SET balance = balance + $delta,
    updated_at = NOW()
WHERE id = $1;
COMMIT;
```

Every transaction writer must lock the account row before reading its balance. The lock serializes concurrent debits for that account: a waiting debit reads the balance after the earlier transaction commits and is rejected if funds are no longer sufficient. Insert the transaction before updating the cached balance; if the insert violates the unique reference index, the transaction aborts before the balance changes. If the balance update or any later operation fails, the database transaction rolls back both writes.

The `accounts.balance` column is a cached projection. PostgreSQL's row-local checks can enforce non-negative values but cannot, by themselves, enforce equality to an aggregate over `transactions`. That cross-table invariant depends on all writes following this one repository/service transaction protocol. Do not claim that a `CHECK` constraint validates the aggregate balance.

The triggers reject row updates, deletes, and truncation. The application role must also lack table ownership and DDL privileges; database owners and superusers can otherwise bypass application-level protections.

## Backend contract alignment

The schema should align directly with the following payloads:

- `AccountResponse`: `id`, `name`, `balance`, `created_at`
- `TransactionResponse`: `id`, `account_id`, `type`, `amount`, `description`, `reference_id`, `created_at`
- list responses: `items`, `page`, `page_size`, `total`, `total_pages`
- `GET /api/v1/transactions` rows may include the joined `account_name` display field

The bootstrap DDL snapshot is [schema.sql](../sql/schema.sql). The deployable Supabase migration is in [`supabase/migrations/`](../../supabase/migrations/). Keep both synchronized with this design document. The current [indexes.sql](../sql/indexes.sql) is a placeholder, not an additional migration.

## Future considerations

- If multi-currency support is introduced later, replace the single `balance`/`amount` currency assumptions with explicit `currency_code` fields.
- If there is a need for soft-delete or reversal support, add an explicit ledger state field rather than mutating historical rows.

This schema is intentionally small, deterministic, and compatible with the frontend and backend design described elsewhere in the docs.
