import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthContextValue["session"]>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const activeUserId = useRef<string | null>(null);

  const updateSession = useCallback(
    (nextSession: AuthContextValue["session"]) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== null && activeUserId.current !== nextUserId) {
        queryClient.clear();
      }
      activeUserId.current = nextUserId;
      setSession(nextSession);
    },
    [queryClient],
  );

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
        updateSession(nextSession);
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
          updateSession(data.session);
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
  }, [queryClient, updateSession]);

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
    queryClient.clear();
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
