import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useLedger } from "@/hooks/useLedger";

export function AppLayout({ children }: { children: ReactNode }) {
  const { error } = useLedger();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-64">
        <Topbar />
        <main className="space-y-4 p-4 md:p-6">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error instanceof Error ? error.message : "Unable to load ledger data."}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
