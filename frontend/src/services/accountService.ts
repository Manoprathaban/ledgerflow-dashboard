import type { Account } from "@/types/account";
import { apiRequest } from "./apiClient";

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

interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function fromApiPage<T>(result: ApiPage<T>): PagedResult<T> {
  return {
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.page_size,
    totalPages: result.total_pages,
  };
}

export async function listAccounts(params: ListAccountsParams = {}): Promise<PagedResult<Account>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("page_size", String(params.pageSize));
  const suffix = query.size ? `?${query.toString()}` : "";
  return fromApiPage(await apiRequest<ApiPage<Account>>(`/accounts${suffix}`));
}

export async function getAllAccounts(): Promise<Account[]> {
  const first = await listAccounts({ page: 1, pageSize: 100 });
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      listAccounts({ page: index + 2, pageSize: 100 }),
    ),
  );
  return [...first.items, ...remaining.flatMap((page) => page.items)];
}

export async function getAccountById(id: string): Promise<Account> {
  return apiRequest<Account>(`/accounts/${encodeURIComponent(id)}`);
}

export async function createAccount(input: { name: string }): Promise<Account> {
  return apiRequest<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify({ name: input.name.trim() }),
  });
}

export function searchAccounts(accounts: Account[], query: string, limit = 5): Account[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return accounts
    .filter(
      (account) =>
        account.name.toLowerCase().includes(normalized) ||
        account.id.toLowerCase().includes(normalized),
    )
    .slice(0, limit);
}
