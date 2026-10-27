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

const validSupabaseUrl = isValidSupabaseUrl(supabaseUrl) ? supabaseUrl : null;

export const isSupabaseConfigured = Boolean(validSupabaseUrl && supabaseAnonKey);

export const supabase =
  validSupabaseUrl && supabaseAnonKey ? createClient(validSupabaseUrl, supabaseAnonKey) : null;
