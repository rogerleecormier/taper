import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Wallet,
  Building2,
  Tag,
  Anchor,
  LogOut,
  BadgeDollarSign,
  Target,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { authClient } from "~/auth/client";
import { Button } from "~/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Budget Tracker", icon: CalendarDays },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/credits", label: "Credits", icon: BadgeDollarSign },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/categories", label: "Categories", icon: Tag },
];

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo / App Title */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Anchor className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground font-heading">Fether</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              currentPath === href || currentPath.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  to={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign Out */}
      <div className="border-t px-3 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
