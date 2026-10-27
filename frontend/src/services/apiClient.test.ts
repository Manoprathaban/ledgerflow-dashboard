import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./apiClient";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({
    data: { session: { access_token: "access-token" } },
    error: null,
  });
});

describe("apiRequest", () => {
  it("sends the active Supabase access token with API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "account-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/accounts");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
  });

  it("refuses API requests when there is no signed-in user", async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/accounts")).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

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
          Authorization: "Bearer access-token",
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
