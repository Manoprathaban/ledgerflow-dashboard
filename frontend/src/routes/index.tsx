import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { TransactionForm } from "@/components/ledger/TransactionForm";
import { AmountText, TypeBadge } from "@/components/shared/TypeBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedger } from "@/hooks/useLedger";
import { sumAmountsToPaise } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { formatINR } from "@/utils/money";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { accounts, transactions } = useLedger();
  const totalAccounts = accounts.length;
  const totalBalance = sumAmountsToPaise(accounts.map((account) => account.balance));
  const totalCredits = sumAmountsToPaise(
    transactions.filter((tx) => tx.type === "credit").map((tx) => tx.amount),
  );
  const totalDebits = sumAmountsToPaise(
    transactions.filter((tx) => tx.type === "debit").map((tx) => tx.amount),
  );
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Financial overview</p>
            <h2 className="font-display text-3xl font-semibold">Dashboard</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/accounts">View accounts</Link>
            </Button>
            <Button asChild>
              <Link to="/transactions">Open ledger</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Accounts"
            value={String(totalAccounts)}
            icon={<Landmark className="h-5 w-5" />}
          />
          <StatCard
            title="Total Ledger Balance"
            value={formatINR(String(totalBalance / 100))}
            icon={<Wallet className="h-5 w-5" />}
            highlight="text-foreground"
          />
          <StatCard
            title="Total Credits"
            value={formatINR(String(totalCredits / 100))}
            icon={<TrendingUp className="h-5 w-5" />}
            highlight="text-credit"
          />
          <StatCard
            title="Total Debits"
            value={formatINR(String(totalDebits / 100))}
            icon={<TrendingDown className="h-5 w-5" />}
            highlight="text-debit"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Recent transactions</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions" className="inline-flex items-center gap-1">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 p-0 px-6 pb-6">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                recentTransactions.map((tx) => {
                  const account = accounts.find((item) => item.id === tx.account_id);
                  return (
                    <div
                      key={tx.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <TypeBadge type={tx.type} />
                          <span className="font-medium">{account?.name ?? "Unknown account"}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tx.description || tx.reference_id}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(tx.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <AmountText amount={tx.amount} type={tx.type} />
                        <Button asChild variant="outline" size="sm">
                          <Link to="/accounts/$accountId" params={{ accountId: tx.account_id }}>
                            Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-0 px-6 pb-6">
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts available.</p>
              ) : (
                accounts.slice(0, 4).map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatINR(account.balance)}</p>
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                        <Link to="/accounts/$accountId" params={{ accountId: account.id }}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick entry</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  highlight = "text-primary",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  highlight?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${highlight}`}>{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
