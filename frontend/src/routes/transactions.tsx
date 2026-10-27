import { createFileRoute } from "@tanstack/react-router";
import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { AmountText, TypeBadge } from "@/components/shared/TypeBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedger } from "@/hooks/useLedger";
import { listTransactions } from "@/services/transactionService";
import { formatDateTime } from "@/utils/date";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { accounts } = useLedger();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "credit" | "debit">("all");
  const [accountId, setAccountId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const resultQuery = useQuery({
    queryKey: [
      "ledger",
      "transactions",
      "list",
      search,
      type,
      accountId,
      startDate,
      endDate,
      page,
      pageSize,
    ],
    queryFn: () =>
      listTransactions({
        search,
        type,
        ...(accountId ? { accountId } : {}),
        startDate,
        endDate,
        page,
        pageSize,
      }),
  });
  const result = resultQuery.data ?? {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  };

  const clearFilters = () => {
    setSearch("");
    setType("all");
    setAccountId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Ledger</p>
            <h2 className="font-display text-2xl">Transactions</h2>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <Button variant="outline" onClick={clearFilters} className="w-fit gap-2">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search ID, description or reference"
                  className="pl-9"
                />
              </div>

              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as "all" | "credit" | "debit");
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={accountId}
                onValueChange={(value) => {
                  setAccountId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className="border-0 bg-transparent px-0 shadow-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 xl:col-span-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  className="border-0 bg-transparent px-0 shadow-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ledger entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0 px-6 pb-6">
            {resultQuery.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {resultQuery.error instanceof Error
                  ? resultQuery.error.message
                  : "Unable to load transactions."}
              </p>
            ) : null}
            {resultQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading transactions…</p>
            ) : null}
            {result.items.length === 0 ? (
              <EmptyState
                title="No transactions matched"
                description="Try broadening the search or adjusting the filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-3 font-medium">ID</th>
                      <th className="px-2 py-3 font-medium">Account</th>
                      <th className="px-2 py-3 font-medium">Type</th>
                      <th className="px-2 py-3 font-medium">Amount</th>
                      <th className="px-2 py-3 font-medium">Description</th>
                      <th className="px-2 py-3 font-medium">Reference</th>
                      <th className="px-2 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((tx) => (
                      <tr key={tx.id} className="border-b align-top">
                        <td className="px-2 py-3 font-medium text-primary">{tx.id}</td>
                        <td className="px-2 py-3">
                          <div>
                            <p className="font-medium">{tx.account_name}</p>
                            <p className="text-xs text-muted-foreground">{tx.account_id}</p>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <TypeBadge type={tx.type} />
                        </td>
                        <td className="px-2 py-3">
                          <AmountText amount={tx.amount} type={tx.type} />
                        </td>
                        <td className="px-2 py-3 max-w-[220px]">{tx.description || "—"}</td>
                        <td className="px-2 py-3 font-mono text-xs">{tx.reference_id}</td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {formatDateTime(tx.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.total > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Showing {(result.page - 1) * result.pageSize + 1}-
                  {Math.min(result.page * result.pageSize, result.total)} of {result.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span className="min-w-20 text-center text-sm text-muted-foreground">
                    Page {result.page} of {result.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page >= result.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
