import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, Search, UserRound } from "lucide-react";

import { searchAccounts } from "@/services/accountService";
import { searchTransactions } from "@/services/transactionService";
import { formatINR } from "@/utils/money";
import { cn } from "@/lib/utils";
import { useLedger } from "@/hooks/useLedger";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { accounts, transactions } = useLedger();

  const accountResults = useMemo(() => searchAccounts(accounts, query), [accounts, query]);
  const transactionResults = useMemo(
    () => searchTransactions(transactions, query),
    [transactions, query],
  );
  const hasResults = accountResults.length > 0 || transactionResults.length > 0;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(e.target.value.trim().length > 0);
        }}
        onFocus={() => setOpen(query.trim().length > 0)}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        placeholder="Search accounts or transactions…"
        aria-label="Search accounts and transactions"
        className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />

      {open && query.trim() && (
        <>
          <button
            type="button"
            aria-label="Close search results"
            className="fixed inset-0 z-40 cursor-default"
            onClick={close}
          />
          <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            {!hasResults && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No accounts or transactions match “{query.trim()}”.
              </p>
            )}
            {accounts.length > 0 && (
              <div className="py-1.5">
                <p className="px-4 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Accounts
                </p>
                {accountResults.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      close();
                      navigate({ to: "/accounts/$accountId", params: { accountId: account.id } });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-accent"
                  >
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">{account.name}</span>
                    <span className="text-muted-foreground">{formatINR(account.balance)}</span>
                  </button>
                ))}
              </div>
            )}
            {transactionResults.length > 0 && (
              <div className={cn("border-t border-border py-1.5")}>
                <p className="px-4 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Transactions
                </p>
                {transactionResults.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      close();
                      navigate({ to: "/transactions" });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-accent"
                  >
                    <ArrowLeftRight
                      className={cn(
                        "h-4 w-4 shrink-0",
                        tx.type === "credit" ? "text-credit" : "text-debit",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{tx.reference_id}</span>
                    <span className="text-muted-foreground">{formatINR(tx.amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
