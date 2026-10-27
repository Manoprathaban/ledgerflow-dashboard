const API_BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"] ?? "https://ledgerflow-dashboard-xi1j.onrender.com"
).replace(/\/+$/, "");

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; issue?: string }>;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: Array<{ field?: string; issue?: string }> = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Could not connect to the Ledger API.", 0, "NETWORK_ERROR");
  }

  const body = (await response.json().catch(() => null)) as (T & ApiErrorResponse) | null;
  if (!response.ok) {
    const error = body && "error" in body ? body.error : undefined;
    throw new ApiError(
      error?.message ?? `The API request failed with status ${response.status}.`,
      response.status,
      error?.code ?? "API_ERROR",
      error?.details ?? [],
    );
  }
  if (body === null) {
    throw new ApiError(
      "The API returned an invalid response.",
      response.status,
      "INVALID_RESPONSE",
    );
  }
  return body as T;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
