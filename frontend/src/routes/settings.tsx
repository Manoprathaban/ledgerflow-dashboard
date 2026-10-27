import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedger, useSettings } from "@/hooks/useLedger";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { accounts, transactions } = useLedger();
  const { settings, setTimeFormat } = useSettings();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Preferences</p>
          <h2 className="font-display text-2xl">Settings</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Application information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Accounts</p>
                <p className="mt-2 text-xl font-semibold">{accounts.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Transactions
                </p>
                <p className="mt-2 text-xl font-semibold">{transactions.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Time format</label>
              <Select
                value={settings.timeFormat}
                onValueChange={(value) => setTimeFormat(value as "12h" | "24h")}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Ledger records are loaded from the connected backend. Display preferences are saved
              locally in this browser.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
