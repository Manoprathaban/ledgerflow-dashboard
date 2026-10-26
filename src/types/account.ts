export interface Account {
  id: string;
  name: string;
  /** Decimal-safe monetary representation, e.g. "46400.25". */
  balance: string;
  /** ISO 8601 timestamp. */
  created_at: string;
}
