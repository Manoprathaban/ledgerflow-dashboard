import type { Account } from "@/types/account";
import type { Transaction } from "@/types/transaction";
import { buildSeedData } from "./mockData";

/**
 * Shared in-memory ledger store with optional browser persistence.
 * This is the single source of truth behind the mock services; replacing the
 * services with FastAPI calls later must not require UI changes.
 */
export interface LedgerData {
  accounts: Account[];
  transactions: Transaction[];
}

const STORAGE_KEY = "ledger-mock-data-v1";

let data: LedgerData = buildSeedData();
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LedgerData;
      if (Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) {
        data = parsed;
      }
    }
  } catch {
    // Corrupt stored data — fall back to the seed dataset.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable (private mode, quota) — keep working in memory.
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot; hydrates from browser storage on first read. */
export function getSnapshot(): LedgerData {
  ensureHydrated();
  return data;
}

/** SSR/hydration snapshot: the seed dataset, never touching browser storage. */
export function getServerSnapshot(): LedgerData {
  return data;
}

/** Apply a mutation atomically, persist and notify subscribers. */
export function mutate(update: (current: LedgerData) => LedgerData): void {
  ensureHydrated();
  data = update(data);
  persist();
  listeners.forEach((listener) => listener());
}

/** Test-only helper: restore the pristine seed dataset. */
export function resetLedgerForTests(): void {
  data = buildSeedData();
  hydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  listeners.forEach((listener) => listener());
}
