import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { CreateAccountDialog } from "@/components/ledger/CreateAccountDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLedger } from "@/hooks/useLedger";
import { listAccounts } from "@/services/accountService";
import { formatDateTime } from "@/utils/date";
import { formatINR } from "@/utils/money";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { accounts } = useLedger();
  const pageSize = 6;

  const result = useMemo(() => listAccounts({ search, page, pageSize }), [search, page, accounts]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overview</p>
            <h2 className="font-display text-2xl">Accounts</h2>
          </div>
          <CreateAccountDialog onCreated={() => setPage(1)} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg">Account directory</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or ID"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0 px-6 pb-6">
            {result.items.length === 0 ? (
              <EmptyState
                title="No accounts found"
                description={
                  search
                    ? "Try a different name or account ID."
                    : "Create a new account to get started."
                }
                action={<CreateAccountDialog triggerLabel="Add first account" />}
              />
            ) : (
              <div className="space-y-3">
                {result.items.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">{account.name}</h3>
                        <Badge variant="secondary">{account.id}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Created {formatDateTime(account.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="text-left sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Balance
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {formatINR(account.balance)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate({
                            to: "/accounts/$accountId",
                            params: { accountId: account.id },
                          })
                        }
                        className="gap-2"
                      >
                        View details
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="min-w-18 text-center text-sm text-muted-foreground">
                    Page {result.page} of {result.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page >= result.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
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
