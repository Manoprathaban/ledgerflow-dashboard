export type TransactionType = "credit" | "debit";

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  /** Decimal-safe monetary representation, e.g. "12500.50". */
  amount: string;
  description: string;
  reference_id: string;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Transaction joined with display-only account fields (frontend-only). */
export interface TransactionRow extends Transaction {
  account_name: string;
}
