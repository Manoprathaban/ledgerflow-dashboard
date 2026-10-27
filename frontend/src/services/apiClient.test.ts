import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sends JSON requests to the configured ledger API and parses success bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "account-id" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ id: string }>("/accounts", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ledgerflow-dashboard-xi1j.onrender.com/api/v1/accounts",
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }),
    );
    expect(result).toEqual({ id: "account-id" });
  });

  it("converts API error envelopes into typed errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "INSUFFICIENT_BALANCE",
              message: "Not enough balance.",
              details: [],
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(apiRequest("/accounts/account-id/transactions")).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      code: "INSUFFICIENT_BALANCE",
      message: "Not enough balance.",
    });
  });

  it("reports network failures without hiding them as successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiRequest("/accounts")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not connect to the Ledger API.",
    });
  });
});
