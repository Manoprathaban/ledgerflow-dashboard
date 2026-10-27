import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"]?.trim();
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"]?.trim();

export function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      Boolean(url.hostname) &&
      (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost"))
    );
  } catch {
    return false;
  }
}

export function getSupabaseConfigError(
  url: string | undefined,
  anonKey: string | undefined,
): string | null {
  if (!url) return "VITE_SUPABASE_URL is missing from this deployment.";
  if (!isValidSupabaseUrl(url)) {
    return "VITE_SUPABASE_URL must be a valid HTTPS Supabase project URL.";
  }
  if (!anonKey) return "VITE_SUPABASE_ANON_KEY is missing from this deployment.";
  return null;
}

const validSupabaseUrl = isValidSupabaseUrl(supabaseUrl) ? supabaseUrl : null;

export const supabaseConfigError = getSupabaseConfigError(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = supabaseConfigError === null;

export const supabase =
  validSupabaseUrl && supabaseAnonKey ? createClient(validSupabaseUrl, supabaseAnonKey) : null;
