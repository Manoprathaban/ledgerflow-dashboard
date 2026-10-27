import type { Transaction, TransactionRow, TransactionType } from "@/types/transaction";
import type { PagedResult } from "./accountService";
import { apiRequest } from "./apiClient";

export type TypeFilter = TransactionType | "all";

export interface ListTransactionsParams {
  search?: string;
  type?: TypeFilter;
  accountId?: string;
  startDate?: string;
  endDate?: string;
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

function toQuery(params: ListTransactionsParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.type) query.set("type", params.type);
  if (params.accountId) query.set("account_id", params.accountId);
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("page_size", String(params.pageSize));
  return query.size ? `?${query.toString()}` : "";
}

export async function listTransactions(
  params: ListTransactionsParams = {},
): Promise<PagedResult<TransactionRow>> {
  const result = await apiRequest<ApiPage<TransactionRow>>(`/transactions${toQuery(params)}`);
  return fromApiPage(result);
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const first = await listTransactions({ page: 1, pageSize: 100 });
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      listTransactions({ page: index + 2, pageSize: 100 }),
    ),
  );
  return [...first.items, ...remaining.flatMap((page) => page.items)];
}

export async function getTransactionsByAccount(
  accountId: string,
  params: ListTransactionsParams = {},
): Promise<PagedResult<Transaction>> {
  const result = await apiRequest<ApiPage<Transaction>>(
    `/accounts/${encodeURIComponent(accountId)}/transactions${toQuery(params)}`,
  );
  return fromApiPage(result);
}

export async function getTransactionById(id: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${encodeURIComponent(id)}`);
}

export async function createTransaction(input: {
  accountId: string;
  type: TransactionType;
  amount: string;
  description?: string;
  referenceId: string;
}): Promise<Transaction> {
  return apiRequest<Transaction>(`/accounts/${encodeURIComponent(input.accountId)}/transactions`, {
    method: "POST",
    body: JSON.stringify({
      type: input.type,
      amount: input.amount,
      description: input.description?.trim() ?? "",
      reference_id: input.referenceId.trim(),
    }),
  });
}

export function searchTransactions(
  transactions: TransactionRow[],
  query: string,
  limit = 5,
): TransactionRow[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return transactions
    .filter((transaction) =>
      `${transaction.id} ${transaction.account_id} ${transaction.description} ${transaction.reference_id}`
        .toLowerCase()
        .includes(normalized),
    )
    .slice(0, limit);
}
