# Frontend design aligned to the backend payload

This document describes how the frontend should be designed to match the backend contract, especially around typed payloads, validation, and UI behavior.

## Design principles

- The UI should treat the backend as the source of truth.
- Money is represented as decimal-safe strings, not JavaScript floats.
- API response envelopes are consistent across list endpoints.
- Validation should be mirrored on both the client and server for a better UX and safer data integrity.
- The frontend should not assume any backend-specific implementation details beyond the documented payload contract.

## Shared payload contracts

### Account payload

```ts
interface AccountResponse {
  id: string;
  name: string;
  balance: string; // decimal-safe string, e.g. "1250.00"
  created_at: string; // ISO 8601 UTC timestamp
}
```

### Transaction payload

```ts
interface TransactionResponse {
  id: string;
  account_id: string;
  type: "credit" | "debit";
  amount: string; // decimal-safe string, e.g. "125.50"
  description: string;
  reference_id: string;
  created_at: string; // ISO 8601 UTC timestamp
}
```

### Paged list payload

```ts
interface PagedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
```

For an empty result set, `total` and `total_pages` are `0`, while `page` remains `1`.

## API client contract mapping

### Account endpoints

- `POST /api/v1/accounts`
  - Request: `{ name: string }`
  - Success: `201` with `AccountResponse`

- `GET /api/v1/accounts`
  - Query: `search`, `page`, `page_size` (`1`-`100`)
  - Success: `PagedResponse<AccountResponse>`

- `GET /api/v1/accounts/{account_id}`
  - Success: `AccountResponse`

- `GET /api/v1/accounts/{account_id}/balance`
  - Success: `{ account_id: string; balance: string }`

### Transaction endpoints

- `POST /api/v1/accounts/{account_id}/transactions`
  - Request: `{ type: "credit" | "debit", amount: string, description?: string, reference_id: string }`
  - Success: `201` with `TransactionResponse`

- `GET /api/v1/accounts/{account_id}/transactions`
  - Query: `type`, `search`, `start_date`, `end_date`, `page`, `page_size` (`1`-`100`)
  - Success: `PagedResponse<TransactionResponse>`

- `GET /api/v1/transactions`
  - Query: `search`, `type`, `account_id`, `start_date`, `end_date`, `page`, `page_size` (`1`-`100`)
  - Success: `PagedResponse<TransactionRow>`

- `GET /api/v1/transactions/{transaction_id}`
  - Success: `TransactionResponse`

### Transaction row shape for global list

The cross-account transaction list includes the joined account name to avoid an extra lookup in the UI:

```ts
interface TransactionRow extends TransactionResponse {
  account_name: string;
}
```

This matches the frontend behavior already used in the mock ledger service, where list results include both transaction data and the owning account holder name.

## Frontend state model

The frontend should expose a single source of truth around these types:

```ts
type LedgerState = {
  accounts: AccountResponse[];
  transactions: TransactionResponse[];
};
```

The backend does not return an entire ledger snapshot. Keep paginated API results as query data rather than treating one page as the complete `LedgerState`; refresh affected account and transaction queries after mutations.

Use a derived view model for global transaction list rows:

```ts
type TransactionRow = TransactionResponse & {
  account_name: string;
};
```

## Money handling rules

The frontend must not rely on floating-point arithmetic for ledger operations. Instead:

- keep monetary values as decimal strings in API payloads
- convert to minor units only inside the app when arithmetic is required
- format back for display as INR with 2 decimal places

The current frontend money helper returns JavaScript `number` paise. That is not exact for all amounts accepted by `NUMERIC(18, 2)`, because a 16-digit rupee amount can exceed `Number.MAX_SAFE_INTEGER` when represented in paise. Before API integration, use `bigint` minor units or lower the shared maximum amount/balance so every possible paise value is a safe integer. Formatting must not convert an out-of-range `bigint` back to `number`.

## Validation behavior expected by the UI

### Account creation

Fields and validation:

- `name`: required, trimmed, 1-200 chars
- error surfaces should show field-level validation messages
- create request should be rejected gracefully if empty or too long

### Transaction creation

Fields and validation:

- `type`: `credit` or `debit`
- `amount`: positive decimal string, max 2 decimal places
- `description`: optional, trimmed
- `reference_id`: required, trimmed, case-folded, unique case-insensitively per account
- debit validation should compare the requested amount against the current balance before submitting

### API error handling

Frontend components should normalize backend errors as follows:

```ts
interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      issue: string;
    }>;
  };
}
```

Backend error codes:

- `VALIDATION_ERROR`
- `ACCOUNT_NOT_FOUND`
- `TRANSACTION_NOT_FOUND`
- `DUPLICATE_REFERENCE`
- `INSUFFICIENT_BALANCE`
- `BALANCE_LIMIT_EXCEEDED`
- `INTERNAL_ERROR`

Expected status mappings are `404` for missing resources, `409` for duplicate references or insufficient balance, `422` for invalid input/UUID/query parameters, and `500` for unexpected server errors. Display the backend `message` in toasts or inline validation. Map each `details` entry's `field` to form state. The API must translate FastAPI's default validation response into this envelope.

## UI mapping to backend resources

### Accounts page

Use the `GET /api/v1/accounts` response as the main list payload.

Includes:

- account card list
- search by account name or ID
- pagination controls
- empty/error/loading states

### Account details page

Use:

- `GET /api/v1/accounts/{account_id}` for account metadata
- `GET /api/v1/accounts/{account_id}/balance` for current balance
- `GET /api/v1/accounts/{account_id}/transactions` for transaction history

### Transactions page

Use:

- `GET /api/v1/transactions` for the global ledger list
- filter by `type`, `account_id`, search, and date range
- keep sorting defaulted to newest first

The current API list response is paginated, so totals for the full filtered result cannot be derived from the current page. The original assessment requires transaction count, credit total, and debit total. Before integration, decide whether these cards represent all ledger records or the active filters and define an aggregate payload or endpoint accordingly.

The existing frontend transactions route also does not currently render those required summary cards. This remains an assessment-coverage gap; it is recorded here for the frontend implementation phase and is not changed as part of the backend design review.

Other transaction-page acceptance gaps in the current frontend: page size is fixed rather than configurable, and the synchronous mock route does not expose loading/error states. The transaction form shows a live balance preview but submits directly; it does not provide the required pre-submit confirmation dialog/summary containing account holder, type, amount, current balance, and resulting balance. Address these before treating the assessment UI as complete.

### Transaction creation modal/form

Use:

- selected account from the route or account picklist
- `POST /api/v1/accounts/{account_id}/transactions`
- optimistic or verified client state refresh after a successful submission
- a confirmation summary showing account, type, amount, current balance, and projected balance

## Frontend state refresh strategy

When the backend is connected, refresh relevant queries after mutations:

- create account -> refetch account list
- create transaction -> refetch account details, account balance, account transaction history, and global transaction list
- keep server responses authoritative for totals and balances

Avoid storing derived totals like `balance` or `total credits` in separate mutable client state unless they are recomputed immediately from the API response.

The currently implemented frontend still uses the browser-persisted mock services. No HTTP API client or live FastAPI integration exists yet; this document describes the future integration contract.

## UX rules derived from payloads

- Show `created_at` in localized date/time format, but keep raw ISO values in the payload.
- For account detail cards, render `balance` with INR formatting.
- For transaction row items, display `type` as `credit` or `debit` with the appropriate color signal.
- Preserve `reference_id` and `description` exactly as returned by the backend, except for any client-side formatting needed in the UI.

## Recommended frontend types

```ts
export type TransactionType = "credit" | "debit";

export interface Account {
  id: string;
  name: string;
  balance: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: string;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface AccountListResponse {
  items: Account[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface TransactionListResponse {
  items: (Transaction & { account_name: string })[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
```

This frontend shape is intentionally aligned with the backend payload contract so the application can later swap its mock store for real HTTP calls without changing the UI contract.
