import type { Account } from "@/types/account";
import type { Transaction, TransactionRow, TransactionType } from "@/types/transaction";
import { getAccountById, type PagedResult } from "./accountService";
import { LedgerError } from "./errors";
import { getSnapshot, mutate } from "./ledgerStore";
import { uuid } from "@/utils/id";
import { parseAmountToPaise, paiseToAmount } from "@/utils/money";

export type TypeFilter = TransactionType | "all";

export interface ListTransactionsParams {
  search?: string;
  type?: TypeFilter;
  accountId?: string;
  /** ISO date (yyyy-mm-dd), inclusive. */
  startDate?: string;
  /** ISO date (yyyy-mm-dd), inclusive. */
  endDate?: string;
  page?: number;
  pageSize?: number;
}

function normalizePaging(page?: number, pageSize?: number) {
  const size = pageSize && pageSize > 0 ? pageSize : 10;
  return { page: page && page > 0 ? page : 1, pageSize: size };
}

function paginate<T>(items: T[], page: number, pageSize: number): PagedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

function withAccountName(tx: Transaction): TransactionRow {
  const account = getAccountById(tx.account_id);
  return { ...tx, account_name: account?.name ?? "Unknown account" };
}

function sortByNewest<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function matchesFilters(tx: Transaction, params: ListTransactionsParams): boolean {
  if (params.accountId && tx.account_id !== params.accountId) return false;
  if (params.type && params.type !== "all" && tx.type !== params.type) return false;

  const query = (params.search ?? "").trim().toLowerCase();
  if (query) {
    const haystack = `${tx.id} ${tx.account_id} ${tx.description} ${tx.reference_id}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  const created = new Date(tx.created_at).getTime();
  if (params.startDate) {
    const start = new Date(`${params.startDate}T00:00:00`).getTime();
    if (!Number.isNaN(start) && created < start) return false;
  }
  if (params.endDate) {
    const end = new Date(`${params.endDate}T23:59:59.999`).getTime();
    if (!Number.isNaN(end) && created > end) return false;
  }
  return true;
}

/** All transactions, newest first, joined with the account holder name. */
export function getAllTransactions(): TransactionRow[] {
  return sortByNewest(getSnapshot().transactions).map(withAccountName);
}

export function listTransactions(params: ListTransactionsParams = {}): PagedResult<TransactionRow> {
  const { page, pageSize } = normalizePaging(params.page, params.pageSize);
  const filtered = getAllTransactions().filter((tx) => matchesFilters(tx, params));
  return paginate(filtered, page, pageSize);
}

export function getTransactionsByAccount(
  accountId: string,
  params: { type?: TypeFilter; page?: number; pageSize?: number } = {},
): PagedResult<Transaction> {
  const { page, pageSize } = normalizePaging(params.page, params.pageSize);
  const type = params.type ?? "all";
  const items = sortByNewest(
    getSnapshot().transactions.filter(
      (tx) => tx.account_id === accountId && (type === "all" || tx.type === type),
    ),
  );
  return paginate(items, page, pageSize);
}

export function getTransactionById(id: string): TransactionRow | null {
  const tx = getSnapshot().transactions.find((t) => t.id === id);
  return tx ? withAccountName(tx) : null;
}

export function searchTransactions(query: string, limit = 5): TransactionRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getAllTransactions()
    .filter((tx) =>
      `${tx.id} ${tx.account_id} ${tx.description} ${tx.reference_id}`.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export interface CreateTransactionInput {
  accountId: string;
  type: TransactionType;
  /** Decimal-safe amount string, e.g. "1500.00". */
  amount: string;
  description?: string;
  referenceId: string;
}

/**
 * Create an immutable transaction and update the account balance.
 * Centralizes every ledger business rule; the future FastAPI backend must
 * enforce the same rules independently.
 */
export function createTransaction(input: CreateTransactionInput): {
  transaction: Transaction;
  account: Account;
} {
  const account = getAccountById(input.accountId);
  if (!account) {
    throw new LedgerError("ACCOUNT_NOT_FOUND", "The selected account does not exist.");
  }

  const paise = parseAmountToPaise(input.amount);
  if (paise === null || paise <= 0) {
    throw new LedgerError("INVALID_AMOUNT", "Amount must be a valid value greater than zero.");
  }

  const referenceId = (input.referenceId ?? "").trim();
  if (!referenceId) {
    throw new LedgerError("INVALID_REFERENCE", "Reference ID is required.");
  }

  const snapshot = getSnapshot();
  const duplicate = snapshot.transactions.some(
    (tx) =>
      tx.account_id === account.id && tx.reference_id.toLowerCase() === referenceId.toLowerCase(),
  );
  if (duplicate) {
    throw new LedgerError(
      "DUPLICATE_REFERENCE",
      "A transaction with this reference ID already exists for this account.",
    );
  }

  const balancePaise = parseAmountToPaise(account.balance) ?? 0;
  if (input.type === "debit" && paise > balancePaise) {
    throw new LedgerError(
      "INSUFFICIENT_BALANCE",
      "Debit amount exceeds the available account balance.",
    );
  }

  const transaction: Transaction = {
    id: uuid(),
    account_id: account.id,
    type: input.type,
    amount: paiseToAmount(paise),
    description: (input.description ?? "").trim(),
    reference_id: referenceId,
    created_at: new Date().toISOString(),
  };

  const updatedBalance = paiseToAmount(
    input.type === "credit" ? balancePaise + paise : balancePaise - paise,
  );

  mutate((data) => ({
    accounts: data.accounts.map((a) =>
      a.id === account.id ? { ...a, balance: updatedBalance } : a,
    ),
    transactions: [transaction, ...data.transactions],
  }));

  return { transaction, account: { ...account, balance: updatedBalance } };
}
