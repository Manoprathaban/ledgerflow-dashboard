import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLedger } from "@/hooks/useLedger";
import { createTransaction } from "@/services/transactionService";
import { parseAmountToPaise, paiseToAmount } from "@/utils/money";

interface TransactionFormProps {
  initialAccountId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

interface FormState {
  accountId: string;
  type: "credit" | "debit";
  amount: string;
  description: string;
  referenceId: string;
}

const emptyForm = (accountId = ""): FormState => ({
  accountId,
  type: "credit",
  amount: "",
  description: "",
  referenceId: "",
});

export function TransactionForm({
  initialAccountId,
  onSuccess,
  onCancel,
  submitLabel = "Submit transaction",
}: TransactionFormProps) {
  const { accounts, transactions } = useLedger();
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(initialAccountId ?? accounts[0]?.id ?? ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialAccountId && initialAccountId !== form.accountId) {
      setForm((current) => ({ ...current, accountId: initialAccountId }));
    }
  }, [form.accountId, initialAccountId]);

  const account = useMemo(
    () => accounts.find((item) => item.id === form.accountId) ?? null,
    [accounts, form.accountId],
  );

  const amountPaise = parseAmountToPaise(form.amount) ?? 0;
  const balancePaise = parseAmountToPaise(account?.balance ?? "0.00") ?? 0;
  const projectedBalancePaise =
    form.amount && amountPaise > 0
      ? form.type === "credit"
        ? balancePaise + amountPaise
        : balancePaise - amountPaise
      : balancePaise;

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {};

    if (!form.accountId) {
      nextErrors.accountId = "Select an account.";
    } else if (!accounts.some((item) => item.id === form.accountId)) {
      nextErrors.accountId = "The selected account does not exist.";
    }

    const parsedAmount = parseAmountToPaise(form.amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      nextErrors.amount = "Amount must be a valid positive value with up to two decimal places.";
    }

    const trimmedReference = form.referenceId.trim();
    if (!trimmedReference) {
      nextErrors.referenceId = "Reference ID is required.";
    }

    if (form.type === "debit" && parsedAmount !== null && parsedAmount > balancePaise) {
      nextErrors.amount = "Debit exceeds the available account balance.";
    }

    const duplicate = transactions.some(
      (tx) =>
        tx.account_id === form.accountId &&
        tx.reference_id.toLowerCase() === trimmedReference.toLowerCase(),
    );
    if (trimmedReference && duplicate) {
      nextErrors.referenceId = "A transaction with this reference already exists on this account.";
    }

    return nextErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      createTransaction({
        accountId: form.accountId,
        type: form.type,
        amount: form.amount,
        description: form.description.trim(),
        referenceId: form.referenceId.trim(),
      });
      toast.success(`${form.type === "credit" ? "Credit" : "Debit"} recorded successfully.`);
      onSuccess?.();
      setForm(emptyForm(initialAccountId ?? accounts[0]?.id ?? ""));
      setErrors({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save the transaction.";
      toast.error(message);
      setErrors((current) => ({ ...current, form: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Ledger transfer</p>
          <h3 className="font-display text-xl">Add transaction</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-foreground">Account</label>
          <Select
            value={form.accountId}
            onValueChange={(value) => updateField("accountId", value)}
            disabled={Boolean(initialAccountId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.accountId ? <p className="text-sm text-destructive">{errors.accountId}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Type</label>
          <Select
            value={form.type}
            onValueChange={(value) => updateField("type", value as "credit" | "debit")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="transaction-amount" className="text-sm font-medium text-foreground">
            Amount
          </label>
          <Input
            id="transaction-amount"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            placeholder="1500.00"
          />
          {errors.amount ? <p className="text-sm text-destructive">{errors.amount}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="transaction-description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            id="transaction-description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Optional transaction description"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="transaction-reference" className="text-sm font-medium text-foreground">
            Reference ID
          </label>
          <Input
            id="transaction-reference"
            value={form.referenceId}
            onChange={(event) => updateField("referenceId", event.target.value)}
            placeholder="INV-1024"
          />
          {errors.referenceId ? (
            <p className="text-sm text-destructive">{errors.referenceId}</p>
          ) : null}
        </div>
      </div>

      {account ? (
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Transaction preview
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current balance
              </p>
              <p className="mt-1 text-base font-semibold">₹{account.balance}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Projected balance
              </p>
              <p className="mt-1 text-base font-semibold">
                ₹
                {form.amount &&
                parseAmountToPaise(form.amount) !== null &&
                parseAmountToPaise(form.amount)! > 0
                  ? paiseToAmount(projectedBalancePaise)
                  : account.balance}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Impact</p>
              <p className="mt-1 text-base font-semibold text-primary">
                {form.type === "credit" ? "Add" : "Reduce"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
