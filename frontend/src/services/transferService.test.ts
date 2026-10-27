import { afterEach, describe, expect, it, vi } from "vitest";

import { createMoneyTransfer } from "./transferService";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createMoneyTransfer", () => {
  it("sends a transfer request to the atomic transfers endpoint", async () => {
    const result = {
      transfer_id: "transfer-id",
      source_balance: "70.00",
      destination_balance: "80.00",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createMoneyTransfer({
        sourceAccountId: "source-id",
        destinationAccountId: "destination-id",
        amount: " 30.00 ",
        description: "  savings  ",
      }),
    ).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ledgerflow-dashboard-xi1j.onrender.com/api/v1/transfers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          source_account_id: "source-id",
          destination_account_id: "destination-id",
          amount: "30.00",
          description: "savings",
        }),
      }),
    );
  });
});
