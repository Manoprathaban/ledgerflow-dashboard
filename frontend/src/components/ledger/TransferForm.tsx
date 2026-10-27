import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ledgerQueryKeys, useLedger } from "@/hooks/useLedger";
import { createMoneyTransfer } from "@/services/transferService";
import { formatINR } from "@/utils/money";

const MAX_TRANSFER_AMOUNT = 999999999999999999n;

function parseAmountToMinorUnits(value: string): bigint | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const rupees = BigInt(match[1] ?? "0");
  const paise = BigInt((match[2] ?? "").padEnd(2, "0"));
  return rupees * 100n + paise;
}

function formatMinorUnits(amount: bigint): string {
  const whole = amount / 100n;
  const fraction = String(amount % 100n).padStart(2, "0");
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(whole)}.${fraction}`;
}

export function TransferForm() {
  const { accounts } = useLedger();
  const queryClient = useQueryClient();
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceAccount = accounts.find((account) => account.id === sourceAccountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  const parsedAmount = parseAmountToMinorUnits(amount);
  const sourceBalance = parseAmountToMinorUnits(sourceAccount?.balance ?? "0") ?? 0n;
  const destinationBalance = parseAmountToMinorUnits(destinationAccount?.balance ?? "0") ?? 0n;
  const formError = !sourceAccountId
    ? "Select a source account."
    : !destinationAccountId
      ? "Select a destination account."
      : sourceAccountId === destinationAccountId
        ? "Source and destination accounts must be different."
        : parsedAmount === null || parsedAmount <= 0n
          ? "Enter a valid amount greater than zero."
          : parsedAmount > MAX_TRANSFER_AMOUNT
            ? "Amount exceeds the supported account balance limit."
            : destinationBalance + parsedAmount > MAX_TRANSFER_AMOUNT
              ? "The destination account would exceed the supported balance limit."
              : parsedAmount > sourceBalance
                ? "The source account has insufficient funds."
                : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (formError) {
      setError(formError);
      return;
    }

    setIsSubmitting(true);
    try {
      await createMoneyTransfer({
        sourceAccountId,
        destinationAccountId,
        amount,
        description,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.accounts }),
        queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: ["ledger", "account"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger", "account-transactions"] }),
      ]);
      toast.success("Money transferred successfully.");
      setAmount("");
      setDescription("");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to complete this transfer.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6 rounded-xl border bg-card p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ArrowUpDown className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Transfer between accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Both account balances and ledger entries update together.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transfer-source">From account</Label>
          <Select
            value={sourceAccountId}
            onValueChange={(value) => {
              setSourceAccountId(value);
              setError("");
            }}
          >
            <SelectTrigger id="transfer-source">
              <SelectValue placeholder="Select source account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} · {formatINR(account.balance)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sourceAccount ? (
            <p className="text-xs text-muted-foreground">
              Available: {formatINR(sourceAccount.balance)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-destination">To account</Label>
          <Select
            value={destinationAccountId}
            onValueChange={(value) => {
              setDestinationAccountId(value);
              setError("");
            }}
          >
            <SelectTrigger id="transfer-destination">
              <SelectValue placeholder="Select destination account" />
            </SelectTrigger>
            <SelectContent>
              {accounts
                .filter((account) => account.id !== sourceAccountId)
                .map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {formatINR(account.balance)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {destinationAccount ? (
            <p className="text-xs text-muted-foreground">
              Current balance: {formatINR(destinationAccount.balance)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-amount">Amount</Label>
          <Input
            autoComplete="off"
            id="transfer-amount"
            inputMode="decimal"
            maxLength={19}
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
            }}
            placeholder="0.00"
            required
            value={amount}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-description">Description (optional)</Label>
          <Textarea
            id="transfer-description"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this transfer for?"
            rows={2}
            value={description}
          />
        </div>
      </div>

      {sourceAccount && destinationAccount && parsedAmount !== null && parsedAmount > 0n ? (
        <div className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-destructive" />
            {sourceAccount.name}: {formatMinorUnits(sourceBalance - parsedAmount)}
          </p>
          <p className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-primary" />
            {destinationAccount.name}: {formatMinorUnits(destinationBalance + parsedAmount)}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {accounts.length < 2 ? (
        <p className="text-sm text-muted-foreground" role="status">
          Create at least two accounts before making a transfer.
        </p>
      ) : null}

      <Button
        className="w-full sm:w-auto"
        disabled={isSubmitting || accounts.length < 2}
        type="submit"
      >
        {isSubmitting ? "Transferring…" : "Transfer money"}
      </Button>
    </form>
  );
}
