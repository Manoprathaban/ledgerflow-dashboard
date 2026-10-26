# Ledger

Ledger is a responsive transaction ledger dashboard for managing accounts, balances, and cash-flow activity. The project is currently frontend-only and uses mock ledger data to simulate realistic banking behavior.

## Repository layout

- `frontend/` — the React + Vite + TanStack application
- `README.md` — project setup and usage notes
- `.gitignore` — repository-level ignore rules

## Frontend stack

- React 19
- Vite
- TanStack Router / Start
- Tailwind CSS
- Vitest
- ESLint / Prettier

## Prerequisites

- Node.js 18+
- npm

## Local development

```sh
cd frontend
npm install
npm run dev
```

## Production build

```sh
cd frontend
npm run build
```

## Linting and tests

```sh
cd frontend
npm run lint
npm test
```

## Current behavior

The app includes:

- Dashboard summaries and recent activity
- Account creation and account detail views
- Credit and debit transactions
- Validation for duplicate references and insufficient funds
- Search, filters, sorting, and pagination
- Mock data persistence in browser storage for demo purposes

This is a frontend implementation intended to be replaced by a backend API later without changing the UI contract.

## Notes

- The project uses mock data only; no backend or database is implemented.
- The design is intentionally kept as a professional financial SaaS dashboard.
- The app name and browser metadata are branded as Ledger.
- Amount must be greater than zero.
- Reject invalid or malformed amounts.
- Description must be trimmed.
- Reference ID must not be empty.
- Reference IDs must be unique within an account.
- The same reference ID may be used for a different account.
- A debit must not exceed the current account balance.

### Confirmation behavior

Before processing a transaction, show a concise confirmation summary with:
- Account holder.
- Transaction type.
- Transaction amount.
- Current balance.
- Resulting balance if successful.

For a debit that exceeds the available balance, display a clear validation error and do not submit the transaction.

### On successful submission

- Generate a unique transaction ID.
- Generate the creation timestamp.
- Update the account balance.
- Add an immutable transaction record to the mock dataset.
- Update the dashboard KPIs.
- Update the account details and transaction history.
- Show a success toast.
- Close the modal.

### Duplicate transaction behavior

If the same account and reference ID are submitted again:
- Reject the duplicate.
- Do not add another transaction.
- Do not change the balance.
- Display a message such as "A transaction with this reference ID already exists for this account."

Use a conflict-style error presentation.

### Failed transaction behavior

If a transaction fails validation:
- Do not update the account balance.
- Do not add a transaction record.
- Preserve the form values so the user can correct the problem.

## 8. Transactions Page

Build a complete transaction history page.

### Summary section

Show:
- Total transaction count.
- Total credit amount.
- Total debit amount.

Calculate the values from the mock transaction dataset.

### Filters

Include:
- Search by transaction ID, account ID, description, or reference ID.
- Transaction type filter: All, Credit, Debit.
- Account filter.
- Start date and end date filters.
- Clear Filters action.

Filters must work together.

### Transaction table

Columns:
- Transaction ID
- Account Holder
- Account ID
- Type
- Amount
- Description
- Reference ID
- Created At

Requirements:
- Default sorting: newest first.
- Pagination with page number, page size, total records, and total pages.
- Configurable page size.
- Loading, empty, and error states.
- Responsive behavior on small screens.

Do not include Edit or Delete actions. Transactions are immutable once created.

Clicking a transaction may open a read-only detail drawer containing all transaction fields.

## 9. Settings Page

Create a simple settings page containing:
- Application name.
- Currency display: INR (₹).
- Date and time display preferences.
- Theme preference, if straightforward to implement.
- Application information.

Do not add unnecessary user management or authentication features for this assessment.

## 10. Mock Data and Frontend Architecture

Use a clean, modular frontend structure.

Suggested organization:

src/
  components/
    layout/
    dashboard/
    accounts/
    transactions/
    ui/
  pages/
    Dashboard.tsx
    Accounts.tsx
    AccountDetails.tsx
    Transactions.tsx
    Settings.tsx
  services/
    accountService.ts
    transactionService.ts
    mockData.ts
  types/
    account.ts
    transaction.ts
  utils/
    currency.ts
    date.ts

Adapt the exact structure to the framework and conventions already used by the project.

### Type definitions

Create explicit TypeScript types.

Account:
- id: string
- name: string
- balance: string or a consistent decimal-safe monetary representation
- created_at: string

Transaction:
- id: string
- account_id: string
- type: "credit" | "debit"
- amount: string or a consistent decimal-safe monetary representation
- description: string
- reference_id: string
- created_at: string

Use additional frontend-only fields only where needed for display.

### Service layer

Create account and transaction service modules.

For the initial version, these services should operate on mock data.

Components must call the service layer rather than directly modifying shared datasets.

The service layer should expose functions conceptually equivalent to:

Account service:
- listAccounts
- getAccountById
- createAccount

Transaction service:
- listTransactions
- getTransactionsByAccount
- createTransaction
- getTransactionById

Support filtering, sorting, and pagination through service functions.

Centralize mock business rules, especially balance calculations and duplicate-reference validation.

### Backend integration readiness

Keep mock implementations separate from page components.

Later, we should be able to replace mock service functions with HTTP requests to FastAPI without redesigning the UI.

Prepare for these future endpoints:

- POST /api/v1/accounts
- GET /api/v1/accounts
- GET /api/v1/accounts/{account_id}
- GET /api/v1/accounts/{account_id}/balance
- GET /api/v1/accounts/{account_id}/transactions
- POST /api/v1/accounts/{account_id}/transactions
- GET /api/v1/transactions

The final backend route contracts may be adjusted during implementation.

Use snake_case for backend-facing JSON fields and map them to frontend naming conventions only if needed.

Do not call these endpoints yet. They are future integration targets.

## 11. Data Integrity and UI Behavior

The frontend must respect the following rules:

- New accounts always start with a zero balance.
- Credit transactions increase the balance.
- Debit transactions decrease the balance.
- Debits exceeding the balance are rejected.
- Duplicate reference IDs are rejected within the same account.
- Failed operations must not alter data.
- Transactions cannot be edited or deleted.
- Transaction history defaults to newest first.
- All displayed totals must remain consistent with the underlying mock dataset.

Treat frontend validation as a user-experience feature. The eventual backend must independently enforce every business rule.

Use a single shared state or data-access mechanism so updates are reflected across pages and dashboard statistics.

Mock data persistence across page navigation is required. Local persistence may be used for demo purposes, but keep the mock implementation replaceable and do not mistake browser storage for a real database.

## 12. User Experience Requirements

- Use toast notifications for success and failure.
- Provide inline field validation.
- Disable submit buttons while an operation is in progress.
- Prevent accidental double submission.
- Show skeletons or lightweight loading indicators where appropriate.
- Provide useful empty states.
- Use confirmation dialogs for transaction submission.
- Ensure keyboard-accessible modals and clear focus states.
- Maintain consistent spacing, typography, buttons, badges, and table styles.
- Avoid fake chart data that conflicts with actual ledger totals.
- Make every visible button and navigation item functional.
- Avoid placeholder links and decorative controls that do nothing.

## 13. Initial Demo Dataset

Seed the frontend with:
- Five sample accounts.
- A mix of accounts with zero and non-zero balances.
- At least fifteen transactions.
- Both credit and debit transactions.
- Different transaction descriptions and reference IDs.
- Timestamps spread across several days.

Ensure every seeded account balance matches the sum of its valid transactions.

Use fictional names, UUID-like IDs, and sample reference IDs. Do not use actual financial or personal data.

## 14. Final Acceptance Criteria

The frontend is complete when:

1. The dashboard displays accurate account and transaction statistics.
2. Accounts can be created with a mandatory name and zero initial balance.
3. Account details show correct balances and transaction histories.
4. Credits and debits update balances correctly in the mock implementation.
5. Insufficient-balance debits are rejected.
6. Duplicate references are rejected within the same account.
7. Transactions cannot be edited or deleted.
8. Transaction filters, sorting, search, and pagination work.
9. All pages share consistent data.
10. The interface is responsive and visually polished.
11. Mock services are isolated from the UI.
12. The project is ready for future FastAPI and PostgreSQL integration.

Build the complete, working frontend rather than just a static dashboard mockup. Prioritize correct ledger behavior, reusable components, clean TypeScript, and a professional financial SaaS interface.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
cd frontend
npm i
npm run dev
```
