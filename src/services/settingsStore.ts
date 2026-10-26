export type TimeFormat = "12h" | "24h";

export interface AppSettings {
  timeFormat: TimeFormat;
}

const STORAGE_KEY = "ledger-settings-v1";
const DEFAULTS: AppSettings = { timeFormat: "12h" };

let state: AppSettings = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      state = { ...DEFAULTS, ...parsed, timeFormat: parsed.timeFormat === "24h" ? "24h" : "12h" };
    }
  } catch {
    // ignore corrupt settings
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSettingsSnapshot(): AppSettings {
  ensureHydrated();
  return state;
}

export function getSettingsServerSnapshot(): AppSettings {
  return DEFAULTS;
}

export function setTimeFormat(timeFormat: TimeFormat): void {
  ensureHydrated();
  state = { ...state, timeFormat };
  persist();
  listeners.forEach((listener) => listener());
}
