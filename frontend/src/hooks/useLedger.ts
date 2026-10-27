import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { getAllAccounts } from "@/services/accountService";
import { getAllTransactions } from "@/services/transactionService";
import {
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  setTimeFormat,
  subscribeSettings,
  type TimeFormat,
} from "@/services/settingsStore";

export const ledgerQueryKeys = {
  accounts: ["ledger", "accounts"] as const,
  transactions: ["ledger", "transactions"] as const,
};

export function useLedger() {
  const accountsQuery = useQuery({
    queryKey: ledgerQueryKeys.accounts,
    queryFn: getAllAccounts,
  });
  const transactionsQuery = useQuery({
    queryKey: ledgerQueryKeys.transactions,
    queryFn: getAllTransactions,
  });

  return {
    accounts: accountsQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading,
    error: accountsQuery.error ?? transactionsQuery.error,
  };
}

/** Subscribe components to app-wide display settings. */
export function useSettings(): {
  settings: { timeFormat: TimeFormat };
  setTimeFormat: (t: TimeFormat) => void;
} {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );
  return { settings, setTimeFormat };
}
