import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronRight, LogOut, Menu, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLedger } from "@/hooks/useLedger";
import { useAuth } from "@/hooks/useAuth";
import { formatINR } from "@/utils/money";
import { GlobalSearch } from "./GlobalSearch";
import { SidebarNav } from "./AppSidebar";

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/accounts") return "Accounts";
  if (pathname.startsWith("/accounts/")) return "Account Details";
  if (pathname === "/transactions") return "Transactions";
  if (pathname === "/settings") return "Settings";
  return "Ledger";
}

export function Topbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { transactions, accounts } = useLedger();
  const [signOutError, setSignOutError] = useState("");
  const title = pageTitle(pathname);
  const onAccountDetails = pathname.startsWith("/accounts/");
  const email = session?.user.email ?? "Signed-in user";
  const initials = email.slice(0, 2).toUpperCase();

  const notifications = transactions.slice(0, 3);

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      {/* Mobile navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="font-display">Ledger</SheetTitle>
          </SheetHeader>
          <div className="px-3 py-3">
            <SidebarNav />
          </div>
        </SheetContent>
      </Sheet>

      {/* Title + breadcrumb */}
      <div className="min-w-0">
        <h1 className="truncate font-display text-base font-semibold md:text-lg">{title}</h1>
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {onAccountDetails ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/accounts">Accounts</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Details</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />

        {/* Notifications: derived from recent ledger activity */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-debit" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No recent activity.
              </p>
            )}
            {notifications.map((tx) => (
              <DropdownMenuItem
                key={tx.id}
                className="cursor-pointer gap-2"
                onSelect={() => navigate({ to: "/transactions" })}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {tx.type === "credit" ? "Credit" : "Debit"} of {formatINR(tx.amount)} ·{" "}
                    {accounts.find((a) => a.id === tx.account_id)?.name ?? "Account"}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => navigate({ to: "/transactions" })}
            >
              View all transactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-0.5 pr-2 outline-none focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Open profile menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-40 truncate text-sm font-medium lg:block">{email}</span>
              <ChevronRight className="hidden h-3.5 w-3.5 rotate-90 text-muted-foreground lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <span className="block max-w-64 truncate">{email}</span>
              <Badge variant="secondary" className="mt-1 block w-fit font-normal">
                Signed in
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {signOutError ? (
              <p className="px-2 py-1 text-xs text-destructive" role="alert">
                {signOutError}
              </p>
            ) : null}
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => navigate({ to: "/settings" })}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
