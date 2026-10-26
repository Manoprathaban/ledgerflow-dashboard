import { useSyncExternalStore } from "react";

import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type LedgerData,
} from "@/services/ledgerStore";
import {
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  setTimeFormat,
  subscribeSettings,
  type TimeFormat,
} from "@/services/settingsStore";

/** Subscribe components to the shared ledger data. */
export function useLedger(): LedgerData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Subscribe components to app-wide display settings. */
export function useSettings(): { settings: { timeFormat: TimeFormat }; setTimeFormat: (t: TimeFormat) => void } {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );
  return { settings, setTimeFormat };
}
