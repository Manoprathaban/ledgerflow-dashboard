const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Parse a user-entered amount into integer paise.
 * Returns null when the value is missing, malformed or has too many decimals.
 */
export function parseAmountToPaise(input: string): number | null {
  const cleaned = input.trim().replace(/[₹,\s]/g, "");
  if (!cleaned || !AMOUNT_PATTERN.test(cleaned)) return null;
  const [rupees, paisa = ""] = cleaned.split(".");
  return Number(rupees) * 100 + Number(paisa.padEnd(2, "0").slice(0, 2));
}

/** Convert integer paise back to the canonical decimal string. */
export function paiseToAmount(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Sum a list of decimal-safe amount strings exactly, returning paise. */
export function sumAmountsToPaise(amounts: string[]): number {
  return amounts.reduce((total, amount) => {
    const paise = parseAmountToPaise(amount);
    return paise === null ? total : total + paise;
  }, 0);
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a decimal-safe amount string as INR, e.g. "₹46,400.25". */
export function formatINR(amount: string): string {
  const paise = parseAmountToPaise(amount);
  if (paise === null) return inrFormatter.format(0);
  return inrFormatter.format(paise / 100);
}

export function formatSignedINR(amount: string, type: "credit" | "debit"): string {
  const formatted = formatINR(amount);
  return type === "credit" ? `+${formatted}` : `−${formatted}`;
}
