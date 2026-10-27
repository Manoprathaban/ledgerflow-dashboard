import { useEffect, useState, type ReactNode } from "react";

import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthContextValue["session"]>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setAuthError(null);
        setLoading(false);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAuthError(error.message);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthError(
          error instanceof Error ? error.message : "Could not restore your sign-in session.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Supabase authentication is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error("Supabase authentication is not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return data.session !== null;
  }

  async function signOut() {
    if (!supabase) throw new Error("Supabase authentication is not configured.");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        authError,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
