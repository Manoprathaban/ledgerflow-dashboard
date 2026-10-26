import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSignedINR } from "@/utils/money";
import type { TransactionType } from "@/types/transaction";
import { Badge } from "@/components/ui/badge";

export function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge variant={type} className="gap-1">
      {type === "credit" ? (
        <ArrowDownLeft className="h-3 w-3" />
      ) : (
        <ArrowUpRight className="h-3 w-3" />
      )}
      {type === "credit" ? "Credit" : "Debit"}
    </Badge>
  );
}

export function AmountText({
  amount,
  type,
  className,
}: {
  amount: string;
  type: TransactionType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        type === "credit" ? "text-credit" : "text-debit",
        className,
      )}
    >
      {formatSignedINR(amount, type)}
    </span>
  );
}
