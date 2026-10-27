import { apiRequest } from "./apiClient";

export interface MoneyTransfer {
  transfer_id: string;
  source_transaction: {
    id: string;
    account_id: string;
    type: "debit";
    amount: string;
    description: string;
    reference_id: string;
    created_at: string;
  };
  destination_transaction: {
    id: string;
    account_id: string;
    type: "credit";
    amount: string;
    description: string;
    reference_id: string;
    created_at: string;
  };
  source_balance: string;
  destination_balance: string;
}

export async function createMoneyTransfer(input: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  description?: string;
}): Promise<MoneyTransfer> {
  return apiRequest<MoneyTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      source_account_id: input.sourceAccountId,
      destination_account_id: input.destinationAccountId,
      amount: input.amount.trim(),
      description: input.description?.trim() ?? "",
    }),
  });
}
