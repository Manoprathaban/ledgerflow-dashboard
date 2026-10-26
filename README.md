# LedgerFlow Dashboard

# Build a Transaction Ledger Management Dashboard

## 1. Project Overview

Build a professional, modern, responsive web application for a **Transaction Ledger System**. The application allows users to view bank-style account information, create accounts, perform credit and debit transactions, view account balances, and inspect transaction history.

This is a frontend-only implementation at this stage.

**Important technical constraints:**
- Do not build a backend.
- Do not connect Supabase, Firebase, or any external database.
- Do not create server-side functions or API endpoints.
- Do not integrate any real payment gateway or banking service.
- Use realistic mock data for demonstration.
- Keep all data operations in a dedicated mock service layer so it can later be replaced with API calls to a FastAPI backend.
- Do not introduce unnecessary dependencies or overengineered frontend architecture.

The eventual backend will use FastAPI, PostgreSQL, and raw SQL through Psycopg, organized as a layered monolithic service. Design the frontend contracts with this future backend integration in mind.

## 2. Design Direction

Create a premium financial SaaS dashboard with a clean, minimal, professional appearance.

### Visual style
- Use a white and light-gray interface.
- Use dark navy or charcoal for primary text.
- Use blue as the primary action color.
- Use green for credit transactions and positive balance indicators.
- Use red for debit transactions and destructive or rejected operations.
- Use subtle gray borders and restrained shadows.
- Use rounded cards and inputs with consistent spacing.
- Use clear typography and strong information hierarchy.
- Avoid excessive gradients, glassmorphism, oversized illustrations, and decorative animations.
- Use icons consistently and sparingly.
- Ensure adequate contrast and accessible form labels.

The dashboard should look suitable for a real financial software product, not a generic landing page or a marketing website.

## 3. Application Layout

Create a desktop-first dashboard that also works well on tablets and mobile devices.

### Sidebar navigation

Add a fixed or collapsible left sidebar containing:

- Product logo and name: **Ledger**
- Dashboard
- Accounts
- Transactions
- Settings

Highlight the active navigation item.

At the bottom, show a small profile section with a generic avatar and the label "Administrator".

Navigation must work. Each menu item should open its corresponding page or section.

### Top navigation bar

Include:
- Current page title and breadcrumb.
- A global search field for accounts and transactions.
- A notification icon with a small visual indicator.
- A profile menu with a Settings option.

Keep the top navigation clean and compact.

## 4. Dashboard Page

Make the Dashboard the default landing page.

### Summary cards

Display four KPI cards:

1. **Total Accounts** — number of accounts created.
2. **Total Ledger Balance** — sum of the current balances of all accounts.
3. **Total Credits** — sum of successful credit transactions.
4. **Total Debits** — sum of successful debit transactions.

Each card should contain:
- A clear title.
- A prominent numeric value.
- A relevant icon.
- A subtle supporting label.

All values must be calculated from the mock dataset rather than hardcoded independently.

Format monetary values consistently in INR (₹), with two decimal places where appropriate.

### Recent transactions

Display a recent transactions table with the latest records first.

Columns:
- Transaction ID
- Account
- Type
- Amount
- Reference ID
- Date and Time
- Status

Use green styling for credits and red styling for debits.

Display transaction types using compact badges.

Use a clear empty state if there are no transactions.

Add a "View All Transactions" action that navigates to the Transactions page.

### Account overview

Display a compact account table or list showing:
- Account holder name
- Account ID
- Current balance
- Account creation date

Provide a "View All Accounts" action and a prominent "Create Account" button.

## 5. Accounts Page

Build a dedicated account management page.

### Account listing

Display a searchable and paginated table with these columns:

- Account ID
- Account Holder
- Current Balance
- Created At
- Actions

Features:
- Search by account holder name or account ID.
- Pagination with configurable page size.
- Clear display of account balances.
- A "View Details" action for each account.
- A prominent "Create Account" button.

### Create Account modal

When the user clicks "Create Account", open a modal containing:

- Account Holder Name — required text field.
- Initial Balance — display a disabled field showing ₹0.00.

The initial balance must always be zero. Do not let the user change it.

Add:
- Cancel button.
- Create Account button.
- Inline validation for a missing or whitespace-only name.
- Loading state while submitting.
- Success and error feedback.

When an account is created successfully in the mock implementation:
- Generate a unique mock account ID.
- Generate the creation timestamp.
- Set the balance to zero.
- Add the account to the account listing.
- Update dashboard statistics.
- Show a success toast.
- Close the modal.

The generated account ID, balance, and timestamp must come from the mock service, not user-editable form fields.

## 6. Account Details Page

Clicking an account should open its details page.

Display:
- Account holder name.
- Account ID.
- Current balance.
- Account creation date.
- Account transaction count.

Provide two prominent actions:
- Add Credit
- Add Debit

Below the account summary, show the transaction history for that account.

Transaction history columns:
- Transaction ID
- Type
- Amount
- Description
- Reference ID
- Created At

Support:
- Credit/debit filtering.
- Latest-first sorting.
- Pagination.
- An empty state when the account has no transactions.

The account balance must update automatically when a valid mock transaction is successfully processed.

## 7. Add Transaction Workflow

Create a reusable transaction modal that supports both credit and debit operations.

### Form fields

- Account ID — prefilled and read-only when launched from an account details page.
- Transaction Type — Credit or Debit.
- Amount — positive monetary amount.
- Description — text field or textarea.
- Reference ID — required text field.

### Validation

- Account must exist.
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

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bab8bfd7-a81c-4663-83f7-347ff2f26f8e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
