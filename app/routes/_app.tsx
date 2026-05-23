import { useState, useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { getSession } from "~/server/middleware";
import { authClient } from "~/auth/client";
import { Logo } from "~/components/layout/logo";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Wallet,
  Store,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  BadgeDollarSign,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Budget Tracker", to: "/tracker", icon: CalendarDays },
  { label: "Expenses", to: "/bills", icon: Receipt },
  { label: "Credits", to: "/credits", icon: BadgeDollarSign },
  { label: "Goals", to: "/goals", icon: Target },
  { label: "Payments", to: "/payments", icon: CreditCard },
  { label: "Income", to: "/income", icon: Wallet },
  { label: "Vendors", to: "/vendors", icon: Store },
  { label: "Categories", to: "/categories", icon: Tag },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Backdrop overlay — mobile only, shown when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          // Mobile: fixed overlay that slides in from the left
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-shrink-0 flex-col bg-card border-r border-border",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: static flex child, always visible
          "md:relative md:inset-auto md:z-auto md:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-16 flex-shrink-0 items-center border-b border-border px-6">
          <Logo size="md" />
          {/* Close button visible only on mobile */}
          <button
            className="ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden animate-hover"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="flex-shrink-0 border-t border-border px-3 py-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with hamburger — hidden on desktop */}
        <div className="flex flex-shrink-0 items-center h-14 gap-3 border-b border-border bg-card px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-1 rounded-md p-2 text-foreground/80 hover:bg-secondary transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo size="sm" />
        </div>

        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
