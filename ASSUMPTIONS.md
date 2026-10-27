# Product and technical assumptions

This document records the product assumptions and implementation boundaries
used by Ledger. Update it when product requirements change.

## Product scope

- Ledger tracks accounts and their transaction history for an individual signed-in
  user. It is not a bank, payment processor, or multi-organization accounting
  platform.
- A user can create and manage multiple accounts. Account names are labels and
  are not required to be unique.
- Accounts are created with a zero balance. Balances change only through
  successful credit/debit entries or an account-to-account transfer.
- Credits and debits are ledger entries, not external deposits or withdrawals.
  The application does not connect to banks or initiate real-world payments.
- Transactions are immutable. Corrections, refunds, and reversals are not
  currently modeled as editing or deleting an existing transaction; they would
  require new, explicitly linked ledger entries and product rules.

## Identity, ownership, and existing data

- Supabase Auth is the identity provider. A valid Supabase access token
  identifies the owner for each API operation.
- Each account belongs to one Supabase user. Transactions and transfers are
  visible only to that owner, with API-level owner filtering and PostgreSQL row
  level security as defenses in depth.
- Transfers are permitted only between two accounts belonging to the same
  authenticated user.
- Existing accounts created before tenant ownership was added cannot be safely
  attributed to users automatically. Their `owner_id` remains unset until an
  administrator maps each account to its correct Supabase user. They must not
  be bulk-assigned to one user without confirming ownership.
- User deletion does not cascade-delete account or ledger history; ownership
  references use restrictive deletion behavior.

## Money and ledger behavior

- A single currency is assumed throughout the application. No currency code or
  foreign-exchange conversion is currently stored; amounts should not be
  interpreted as supporting multiple currencies.
- Monetary input is a positive decimal string with at most two fractional
  digits. Monetary values are returned as decimal strings with exactly two
  fractional digits to avoid floating-point ambiguity.
- Stored balances cannot be negative. A debit or transfer exceeding the source
  balance is rejected.
- Account balances are maintained alongside immutable transactions. Each
  balance-changing operation updates the balance and writes its ledger entry in
  one database transaction.
- A transfer is one atomic operation: both accounts are locked, one transfer
  record and its paired debit/credit entries are written, and both balances are
  updated together. Any failure rolls back the entire transfer.
- Transaction reference IDs are unique case-insensitively within an account.
  References may be reused on a different account. Transfer-generated
  references are created by the server.
- Amounts and resulting balances are bounded by the database's
  `NUMERIC(18, 2)` representation.

## Dates, lists, and API behavior

- Server-generated timestamps are UTC. Date filters use ISO dates
  (`YYYY-MM-DD`), interpreted in UTC, with both boundary dates inclusive.
- Lists use stable newest-first ordering and 1-indexed pagination. Page size
  defaults to 10 and cannot exceed 100.
- Search and filtering are read-only and apply only to data owned by the
  authenticated user.
- The `/health` endpoint indicates application liveness only; it does not
  guarantee database or Supabase Auth availability.

## Deployment and configuration

- The frontend is a browser application deployed separately from the API. It
  uses public Supabase client configuration and a backend API URL.
- The backend validates user tokens with Supabase Auth and connects to
  PostgreSQL using server-side credentials. Database passwords, access tokens,
  service-role keys, and deploy hooks must never be embedded in frontend code
  or committed to the repository.
- Production migrations must target the intended Supabase project. Existing
  data ownership must be reviewed before enabling tenant-scoped production use.

For exact routes, payloads, response formats, and validation rules, see the
[API documentation](API_DOCUMENTATION.md).
