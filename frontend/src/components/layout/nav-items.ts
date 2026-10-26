import { ArrowLeftRight, LayoutDashboard, Settings, Users } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Exact match for the root path. */
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Accounts", url: "/accounts", icon: Users },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Settings", url: "/settings", icon: Settings },
];
