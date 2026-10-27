import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";
import { TransferForm } from "@/components/ledger/TransferForm";

export const Route = createFileRoute("/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Move funds securely</p>
          <h2 className="font-display text-3xl font-semibold">Money transfer</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Transfers are recorded as a debit and credit in a single atomic operation.
          </p>
        </div>
        <TransferForm />
      </div>
    </AppLayout>
  );
}
