export type LedgerErrorCode =
  | "ACCOUNT_NOT_FOUND"
  | "INVALID_NAME"
  | "INVALID_AMOUNT"
  | "INVALID_REFERENCE"
  | "INSUFFICIENT_BALANCE"
  | "DUPLICATE_REFERENCE"
  | "NOT_FOUND";

/** Typed error thrown by the ledger service layer. The future FastAPI backend should map to the same codes. */
export class LedgerError extends Error {
  constructor(
    public readonly code: LedgerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LedgerError";
  }
}
