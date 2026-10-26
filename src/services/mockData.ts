import type { Account } from "@/types/account";
import type { Transaction, TransactionType } from "@/types/transaction";
import { parseAmountToPaise, paiseToAmount } from "@/utils/money";

/** Fictional seed accounts. Balances are derived from the seed transactions below. */
const SEED_ACCOUNTS: Array<Pick<Account, "id" | "name"> & { created_at: string }> = [
  { id: "7a1e9c2e-4b6f-4d3a-9c81-2f6a1d9e5b01", name: "Arjun Mehta", created_at: "2026-10-08T09:15:00.000Z" },
  { id: "c3d2f8a4-91b7-4e5c-8d62-6b4a7f0c3e22", name: "Priya Sharma", created_at: "2026-10-09T11:40:00.000Z" },
  { id: "e5b6a1c7-3d84-4f29-b7a5-8c2e6d4f9a33", name: "Rahul Verma", created_at: "2026-10-10T14:05:00.000Z" },
  { id: "9f4c7d2b-6e15-4a83-b0d9-4a1c8e5f7d44", name: "Neha Nair", created_at: "2026-10-11T08:50:00.000Z" },
  { id: "b8d3e6f1-2a94-4c56-a7e8-1d5b9c0a2e55", name: "Vikram Singh", created_at: "2026-10-12T16:30:00.000Z" },
];

interface SeedTx {
  accountId: string;
  type: TransactionType;
  amount: string;
  description: string;
  reference_id: string;
  created_at: string;
}

const [ARJUN, PRIYA, RAHUL, NEHA] = SEED_ACCOUNTS.map((a) => a.id);

/** At least fifteen transactions, credits and debits, spread across several days. */
const SEED_TRANSACTIONS: SeedTx[] = [
  { accountId: ARJUN, type: "credit", amount: "50000.00", description: "Opening deposit — salary credit", reference_id: "SAL-2026-001", created_at: "2026-10-13T10:20:00.000Z" },
  { accountId: PRIYA, type: "credit", amount: "125000.00", description: "Opening deposit — business funding", reference_id: "BIZ-FUND-01", created_at: "2026-10-13T12:45:00.000Z" },
  { accountId: NEHA, type: "credit", amount: "80000.00", description: "Deposit — consultancy retainer", reference_id: "CONS-RET-07", created_at: "2026-10-14T09:10:00.000Z" },
  { accountId: ARJUN, type: "debit", amount: "12500.50", description: "Rent transfer — October", reference_id: "RENT-OCT-77", created_at: "2026-10-14T18:05:00.000Z" },
  { accountId: RAHUL, type: "credit", amount: "30000.00", description: "Salary credit — October", reference_id: "SAL-OCT-114", created_at: "2026-10-15T11:00:00.000Z" },
  { accountId: PRIYA, type: "debit", amount: "68000.00", description: "Vendor payment — Sundar Traders", reference_id: "VND-3321", created_at: "2026-10-15T15:30:00.000Z" },
  { accountId: ARJUN, type: "credit", amount: "8200.00", description: "Freelance invoice INV-2041", reference_id: "INV-2041", created_at: "2026-10-16T10:15:00.000Z" },
  { accountId: RAHUL, type: "debit", amount: "9875.50", description: "Grocery and household purchase", reference_id: "GRC-8891", created_at: "2026-10-16T19:20:00.000Z" },
  { accountId: NEHA, type: "debit", amount: "40250.75", description: "Loan EMI — housing", reference_id: "EMI-HOUSING-10", created_at: "2026-10-17T08:35:00.000Z" },
  { accountId: PRIYA, type: "debit", amount: "15400.25", description: "Office equipment purchase", reference_id: "OFF-1142", created_at: "2026-10-17T13:50:00.000Z" },
  { accountId: ARJUN, type: "debit", amount: "1500.00", description: "Utility bill payment — electricity", reference_id: "UTL-BILL-0912", created_at: "2026-10-18T09:40:00.000Z" },
  { accountId: RAHUL, type: "debit", amount: "2500.00", description: "Fuel card settlement", reference_id: "FUEL-552", created_at: "2026-10-18T17:25:00.000Z" },
  { accountId: NEHA, type: "debit", amount: "6120.40", description: "Insurance premium — annual", reference_id: "INS-PREM-23", created_at: "2026-10-19T10:55:00.000Z" },
  { accountId: ARJUN, type: "credit", amount: "2200.75", description: "Cashback reward — card spends", reference_id: "CB-77341", created_at: "2026-10-20T12:10:00.000Z" },
  { accountId: NEHA, type: "credit", amount: "15000.00", description: "Reimbursement — client travel", reference_id: "TRV-REIMB-44", created_at: "2026-10-20T16:45:00.000Z" },
  { accountId: RAHUL, type: "credit", amount: "4400.00", description: "Refund — cancelled order", reference_id: "REF-9910", created_at: "2026-10-21T09:30:00.000Z" },
];

export interface LedgerSeed {
  accounts: Account[];
  transactions: Transaction[];
}

export function buildSeedData(): LedgerSeed {
  const transactions: Transaction[] = SEED_TRANSACTIONS.map((tx, index) => ({
    id: `9d2f${String(index + 1).padStart(2, "0")}-8c41-4b7e-a6d3-${String(1000 + index)}5e2b`,
    account_id: tx.accountId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    reference_id: tx.reference_id,
    created_at: tx.created_at,
  }));

  // Balances are always derived from transactions so seed data stays consistent.
  const balances = new Map<string, number>();
  for (const tx of transactions) {
    const paise = parseAmountToPaise(tx.amount) ?? 0;
    const delta = tx.type === "credit" ? paise : -paise;
    balances.set(tx.account_id, (balances.get(tx.account_id) ?? 0) + delta);
  }

  const accounts: Account[] = SEED_ACCOUNTS.map((account) => ({
    ...account,
    balance: paiseToAmount(balances.get(account.id) ?? 0),
  }));

  return { accounts, transactions };
}
