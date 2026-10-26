import type { Account } from "@/types/account";
import { LedgerError } from "./errors";
import { getSnapshot, mutate } from "./ledgerStore";
import { uuid } from "@/utils/id";

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListAccountsParams {
  search?: string;
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

/** All accounts, newest first. */
export function getAllAccounts(): Account[] {
  return [...getSnapshot().accounts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function listAccounts(params: ListAccountsParams = {}): PagedResult<Account> {
  const { page, pageSize } = normalizePaging(params.page, params.pageSize);
  const query = (params.search ?? "").trim().toLowerCase();
  const accounts = getAllAccounts().filter(
    (account) =>
      !query ||
      account.name.toLowerCase().includes(query) ||
      account.id.toLowerCase().includes(query),
  );
  return paginate(accounts, page, pageSize);
}

export function getAccountById(id: string): Account | null {
  return getSnapshot().accounts.find((account) => account.id === id) ?? null;
}

export function searchAccounts(query: string, limit = 5): Account[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getAllAccounts()
    .filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
    .slice(0, limit);
}

/**
 * Create an account. The id, zero balance and timestamp are generated here —
 * never by the UI form.
 */
export function createAccount(input: { name: string }): Account {
  const name = (input.name ?? "").trim();
  if (!name) {
    throw new LedgerError("INVALID_NAME", "Account holder name is required.");
  }
  const account: Account = {
    id: uuid(),
    name,
    balance: "0.00",
    created_at: new Date().toISOString(),
  };
  mutate((data) => ({ ...data, accounts: [account, ...data.accounts] }));
  return account;
}
