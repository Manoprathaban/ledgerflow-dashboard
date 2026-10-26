import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { TransactionForm } from "@/components/ledger/TransactionForm";
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
import { getAccountById } from "@/services/accountService";
import { formatDateTime } from "@/utils/date";
import { formatINR } from "@/utils/money";

export const Route = createFileRoute("/accounts/$accountId")({
  component: AccountDetailPage,
});

function AccountDetailPage() {
  const { accountId } = Route.useParams();
  const navigate = useNavigate();
  const { accounts, transactions } = useLedger();
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const account = accounts.find((item) => item.id === accountId) ?? getAccountById(accountId);

  const pageSize = 8;

  const filteredLocal = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = transactions.filter(
      (tx) =>
        tx.account_id === accountId &&
        (typeFilter === "all" || tx.type === typeFilter) &&
        (!q ||
          tx.id.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          tx.reference_id.toLowerCase().includes(q)),
    );
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [accountId, search, typeFilter, transactions]);

  if (!account) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <EmptyState
            title="Account not found"
            description="The requested account ID is not available in the current ledger."
            action={
              <Button asChild>
                <Link to="/accounts">Back to accounts</Link>
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  const accountTransactions = filteredLocal;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate({ to: "/accounts" })}
              aria-label="Back to accounts"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account overview</p>
              <h2 className="font-display text-2xl">{account.name}</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Account ID" value={account.id} />
          <MetricCard label="Current balance" value={formatINR(account.balance)} />
          <MetricCard label="Created" value={formatDateTime(account.created_at)} />
          <MetricCard
            label="Transactions"
            value={String(transactions.filter((tx) => tx.account_id === account.id).length)}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-center">
                  <Link to="/transactions" search={{ accountId: account.id }}>
                    View all account transactions
                  </Link>
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() =>
                      navigate({
                        to: "/transactions",
                        search: { accountId: account.id, type: "credit" },
                      })
                    }
                  >
                    Credit actions
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() =>
                      navigate({
                        to: "/transactions",
                        search: { accountId: account.id, type: "debit" },
                      })
                    }
                  >
                    Debit actions
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => {
                      setTypeFilter(value as "all" | "credit" | "debit");
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="sm:max-w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search description or reference"
                      className="pl-9"
                    />
                  </div>
                </div>

                {accountTransactions.length === 0 ? (
                  <EmptyState
                    title="No matching transactions"
                    description="This account has no entries for the selected filters."
                  />
                ) : (
                  <div className="space-y-3">
                    {accountTransactions.slice(0, pageSize).map((tx) => (
                      <div key={tx.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <TypeBadge type={tx.type} />
                            <span className="font-medium">{tx.reference_id}</span>
                          </div>
                          <AmountText amount={tx.amount} type={tx.type} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {tx.description || "No description provided"}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDateTime(tx.created_at)}</span>
                          <span>{tx.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {accountTransactions.length > pageSize && (
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {Math.ceil(accountTransactions.length / pageSize)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= Math.ceil(accountTransactions.length / pageSize)}
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

          <div>
            <TransactionForm initialAccountId={account.id} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-lg font-semibold text-foreground break-all">{value}</p>
      </CardContent>
    </Card>
  );
}
