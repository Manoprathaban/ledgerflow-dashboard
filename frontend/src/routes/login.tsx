import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseConfigError } from "@/services/supabase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { authError, isConfigured, loading, session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/", replace: true });
    }
  }, [loading, navigate, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      if (mode === "signIn") {
        await signIn(email.trim(), password);
        void navigate({ to: "/", replace: true });
      } else {
        const signedIn = await signUp(email.trim(), password);
        if (signedIn) {
          void navigate({ to: "/", replace: true });
        } else {
          setMode("signIn");
          setNotice("Account created. Check your email to confirm your address, then sign in.");
        }
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Authentication failed. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isSignIn = mode === "signIn";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Ledger</p>
          <CardTitle className="font-display text-2xl">
            {isSignIn ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {isSignIn
              ? "Sign in to continue to your transaction dashboard."
              : "Use your email address to create a Ledger account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConfigured ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              Supabase authentication is not configured. {supabaseConfigError} Redeploy after fixing
              the Production environment variables.
            </p>
          ) : null}
          {authError ? (
            <p
              className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              Could not restore your sign-in session: {authError}
            </p>
          ) : null}
          {error ? (
            <p
              className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
              role="status"
            >
              {notice}
            </p>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                disabled={!isConfigured || submitting}
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                autoComplete={isSignIn ? "current-password" : "new-password"}
                disabled={!isConfigured || submitting}
                id="password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <Button className="w-full" disabled={!isConfigured || submitting} type="submit">
              {submitting ? "Please wait…" : isSignIn ? "Sign in" : "Create account"}
            </Button>
          </form>
          {isConfigured ? (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {isSignIn ? "New to Ledger?" : "Already have an account?"}{" "}
              <button
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode(isSignIn ? "signUp" : "signIn");
                  setError("");
                  setNotice("");
                }}
                type="button"
              >
                {isSignIn ? "Create an account" : "Sign in"}
              </button>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
