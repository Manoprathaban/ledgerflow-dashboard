import { describe, expect, it } from "vitest";

import { getSupabaseConfigError, isValidSupabaseUrl } from "./supabase";

describe("isValidSupabaseUrl", () => {
  it("accepts HTTPS Supabase URLs", () => {
    expect(isValidSupabaseUrl("https://project.supabase.co")).toBe(true);
  });

  describe("getSupabaseConfigError", () => {
    it("reports the missing URL without exposing any values", () => {
      expect(getSupabaseConfigError(undefined, "secret-key")).toBe(
        "VITE_SUPABASE_URL is missing from this deployment.",
      );
    });

    it("reports an invalid URL", () => {
      expect(getSupabaseConfigError("not a URL", "secret-key")).toBe(
        "VITE_SUPABASE_URL must be a valid HTTPS Supabase project URL.",
      );
    });

    it("reports the missing anon key", () => {
      expect(getSupabaseConfigError("https://project.supabase.co", undefined)).toBe(
        "VITE_SUPABASE_ANON_KEY is missing from this deployment.",
      );
    });

    it("returns no error when both values are valid and present", () => {
      expect(getSupabaseConfigError("https://project.supabase.co", "public-key")).toBeNull();
    });
  });

  it("allows HTTP only for localhost development", () => {
    expect(isValidSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isValidSupabaseUrl("http://project.supabase.co")).toBe(false);
  });

  it("rejects malformed or missing URLs", () => {
    expect(isValidSupabaseUrl("your-project.supabase.co")).toBe(false);
    expect(isValidSupabaseUrl(undefined)).toBe(false);
  });
});
