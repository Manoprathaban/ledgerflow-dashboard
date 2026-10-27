import { describe, expect, it } from "vitest";

import { isValidSupabaseUrl } from "./supabase";

describe("isValidSupabaseUrl", () => {
  it("accepts HTTPS Supabase URLs", () => {
    expect(isValidSupabaseUrl("https://project.supabase.co")).toBe(true);
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
