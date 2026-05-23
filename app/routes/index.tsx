import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "~/components/layout/logo";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Receipt,
  Wallet,
  Building2,
  Tag,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Target,
  GripVertical,
  LogOut,
  Sparkles,
  HelpCircle,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "tracker">("dashboard");
  const [trackerView, setTrackerView] = useState<"calendar" | "timeline">("calendar");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-pulse">
          <Target className="h-3.5 w-3.5" />
          Funnel your income with absolute precision.
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground font-heading sm:text-6xl">
          Taper your budget.
          <br />
          <span className="text-primary">Balance your allocations.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground leading-relaxed">
          Take your raw monthly income and taper it into targeted, balanced category buckets.
          No waste. Complete alignment. Funnel every dollar to a clean, precise point.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm"
          >
            Start for free
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-semibold text-foreground/85 hover:bg-secondary/40 hover:text-foreground transition-colors"
          >
            Log in to your account
          </Link>
        </div>
      </section>

      {/* Main Interactive Browser Mockup */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 shadow-lg">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Browser chrome header */}
            <div className="flex h-10 items-center gap-2 border-b border-border bg-secondary/20 px-4">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded-md bg-card border border-border h-5 max-w-xs text-xs text-muted-foreground/60 flex items-center px-2">
                taper.rcormier.dev
              </div>
              <div className="text-[10px] text-muted-foreground/40 font-mono hidden sm:block">
                Interactive Mockup • Click Tabs below
              </div>
            </div>

            <div className="flex h-[540px]">
              {/* Sidebar */}
              <div className="w-52 flex-shrink-0 border-r border-border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <Logo size="sm" />
                  </div>
                  <nav className="px-2 py-2.5 space-y-1">
                    {[
                      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
                      { id: "tracker", icon: CalendarDays, label: "Budget Tracker" },
                      { id: "expenses", icon: Receipt, label: "Expenses" },
                      { id: "income", icon: Wallet, label: "Income" },
                      { id: "vendors", icon: Building2, label: "Vendors" },
                      { id: "categories", icon: Tag, label: "Categories" },
                    ].map(({ id, icon: Icon, label }) => {
                      const isActive = activeTab === id;
                      const isClickable = id === "dashboard" || id === "tracker";
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            if (isClickable) setActiveTab(id as any);
                          }}
                          className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all text-left ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : isClickable
                              ? "text-foreground/75 hover:bg-secondary/40 hover:text-foreground cursor-pointer"
                              : "text-foreground/45 cursor-not-allowed"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex-1">{label}</span>
                          {!isClickable && (
                            <span className="text-[8px] opacity-40 font-normal">soon</span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
                <div className="border-t border-border px-2 py-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground">
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </div>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto bg-background p-4 space-y-4 custom-scrollbar">
                {activeTab === "dashboard" ? (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-black text-foreground">Dashboard</div>
                        <div className="text-[10px] text-muted-foreground">Your budget overview at a glance</div>
                      </div>
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[8.5px] font-bold text-primary flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Live Overview
                      </span>
                    </div>

                    {/* Unallocated banner */}
                    <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-success">
                            Fully funneled to a point! 🎯
                          </p>
                          <p className="text-[10px] text-success/90">100% of income allocated</p>
                        </div>
                        <span className="text-[10px] font-bold text-success/90 tabular-nums">
                          $4,850 / $4,850
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                        <div className="h-full w-full rounded-full bg-success" />
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Monthly Income", value: "$4,850", color: "text-success", bg: "bg-success/10", Icon: TrendingUp, iconColor: "text-success" },
                        { label: "Monthly Expenses", value: "$4,850", color: "text-destructive", bg: "bg-destructive/10", Icon: TrendingDown, iconColor: "text-destructive" },
                        { label: "Net Balance", value: "$0", color: "text-accent", bg: "bg-accent/10", Icon: Target, iconColor: "text-accent" },
                        { label: "Left to Taper", value: "$0.00", color: "text-success", bg: "bg-success/10", Icon: Target, iconColor: "text-success" },
                      ].map(({ label, value, color, bg, Icon, iconColor }) => (
                        <div key={label} className="rounded-lg border border-border bg-card p-2.5 shadow-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[9px] text-muted-foreground font-bold leading-tight">{label}</div>
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full ${bg}`}>
                              <Icon className={`h-2.5 w-2.5 ${iconColor}`} />
                            </div>
                          </div>
                          <div className={`text-xs font-extrabold tabular-nums ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Activity panels */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Upcoming expenses */}
                      <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                            Upcoming Expenses
                          </div>
                          <div className="inline-flex rounded border border-border bg-secondary/30 p-0.5">
                            {["7d", "14d", "30d"].map((d, i) => (
                              <div
                                key={d}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                                  i === 0
                                    ? "bg-card border border-border/50 text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="divide-y divide-border/60">
                          {[
                            { name: "Verizon", vendor: "Verizon", due: "Today", amount: "$85", color: "var(--color-accent)" },
                            { name: "Rent", vendor: "Landlord", due: "In 3 days", amount: "$1,200", color: "var(--color-primary)" },
                            { name: "Netflix", vendor: "Netflix", due: "In 5 days", amount: "$17", color: "var(--color-destructive)" },
                          ].map((b) => (
                            <div key={b.name} className="flex items-center gap-2 py-2 text-[10px]">
                              <span className="h-2 w-2 flex-shrink-0 rounded-full animate-pulse" style={{ backgroundColor: b.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-foreground truncate">{b.name}</div>
                                <div className="text-muted-foreground/80 truncate text-[9px]">{b.vendor}</div>
                              </div>
                              <span className="text-muted-foreground text-[9px] flex-shrink-0">{b.due}</span>
                              <span className="font-bold text-foreground tabular-nums flex-shrink-0">{b.amount}</span>
                              <span className="rounded border border-warning/20 bg-warning/10 px-1 py-0.2 text-[8px] font-bold text-warning flex-shrink-0 ml-1">
                                pending
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent payments */}
                      <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
                          Recent Payments
                        </div>
                        <div className="divide-y divide-border/60">
                          {[
                            { name: "Electric", vendor: "Duke Energy", paid: "May 12", amount: "$95", color: "var(--color-accent)" },
                            { name: "Internet", vendor: "AT&T", paid: "May 10", amount: "$60", color: "var(--color-primary)" },
                            { name: "Groceries", vendor: "Whole Foods", paid: "May 8", amount: "$142", color: "var(--color-success)" },
                          ].map((p) => (
                            <div key={p.name} className="flex items-center gap-2 py-2 text-[10px]">
                              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-foreground truncate">{p.name}</div>
                                <div className="text-muted-foreground/80 truncate text-[9px]">{p.vendor}</div>
                              </div>
                              <span className="text-muted-foreground text-[9px] flex-shrink-0">{p.paid}</span>
                              <span className="font-bold text-foreground tabular-nums flex-shrink-0">{p.amount}</span>
                              <span className="rounded border border-success/20 bg-success/10 px-1.5 py-0.2 text-[8px] font-bold text-success flex-shrink-0 ml-1">
                                paid
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Budget Tracker Tab Mockup */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <div>
                          <div className="text-sm font-black text-foreground">Budget Tracker</div>
                          <div className="text-[10px] text-muted-foreground">View and manage occurrences by period.</div>
                        </div>

                        {/* Toggle Calendar vs Timeline */}
                        <div className="inline-flex rounded-md border border-border bg-muted p-0.5 shadow-inner">
                          {[
                            { value: "calendar", label: "Calendar View" },
                            { value: "timeline", label: "Timeline Flow" },
                          ].map((v) => (
                            <button
                              key={v.value}
                              onClick={() => setTrackerView(v.value as any)}
                              className={`rounded px-3 py-1 text-[9.5px] font-bold transition-all cursor-pointer ${
                                trackerView === v.value
                                  ? "bg-card text-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display Selected View */}
                      {trackerView === "calendar" ? (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
                            {/* Calendar Days Header */}
                            <div className="grid grid-cols-7 border-b border-border bg-secondary/15">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="py-2 text-center text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                  {day}
                                </div>
                              ))}
                            </div>

                            {/* 7x5 Calendar Grid */}
                            <div className="grid grid-cols-7 bg-border/20 gap-[1px]">
                              {Array.from({ length: 35 }).map((_, idx) => {
                                // Mock calendar mapping. May 1st is Friday (index 5)
                                const isMay = idx >= 5 && idx <= 35;
                                const dayNum = isMay ? idx - 4 : (idx < 5 ? 26 + idx : idx - 35);
                                const isToday = isMay && dayNum === 15;
                                
                                const cellItems: Array<{ name: string; amount: string; status: "paid" | "received" | "pending"; type: "income" | "bill" | "credit" }> = [];
                                
                                if (isMay && dayNum === 1) {
                                  cellItems.push({ name: "Paycheck", amount: "+$2.4k", status: "received", type: "income" });
                                  cellItems.push({ name: "Rent", amount: "-$1.2k", status: "paid", type: "bill" });
                                }
                                if (isMay && dayNum === 8) {
                                  cellItems.push({ name: "Groceries", amount: "-$142", status: "paid", type: "bill" });
                                }
                                if (isMay && dayNum === 12) {
                                  cellItems.push({ name: "Electric", amount: "-$95", status: "paid", type: "bill" });
                                }
                                if (isMay && dayNum === 15) {
                                  cellItems.push({ name: "Paycheck", amount: "+$2.4k", status: "pending", type: "income" });
                                }
                                if (isMay && dayNum === 18) {
                                  cellItems.push({ name: "Verizon", amount: "-$85", status: "pending", type: "bill" });
                                }
                                if (isMay && dayNum === 22) {
                                  cellItems.push({ name: "Side Work", amount: "+$500", status: "pending", type: "credit" });
                                }

                                return (
                                  <div
                                    key={idx}
                                    className={`min-h-[58px] p-1 flex flex-col justify-between bg-card ${
                                      !isMay ? "bg-muted/10 opacity-50" : ""
                                    } ${isToday ? "bg-primary/5 border border-primary/20" : ""}`}
                                  >
                                    <div className="flex justify-between items-center text-[8.5px] font-bold text-muted-foreground/80">
                                      <span className={isToday ? "rounded-full bg-primary text-primary-foreground px-1 py-0.2" : ""}>
                                        {dayNum}
                                      </span>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-0.5 justify-end overflow-hidden mt-1">
                                      {cellItems.map((item, i) => {
                                        let style = "bg-warning/10 border-warning/20 text-warning";
                                        if (item.status === "paid" || item.status === "received") {
                                          style = "bg-success/10 border-success/20 text-success";
                                        }
                                        if (item.type === "credit") {
                                          style = "bg-accent/10 border-accent/20 text-accent";
                                        }

                                        return (
                                          <div
                                            key={i}
                                            className={`rounded px-1.5 py-0.5 text-[7px] font-bold flex items-center justify-between gap-0.5 border ${style} cursor-grab active:cursor-grabbing hover:scale-102 transition-transform`}
                                            title="Drag to reschedule date"
                                          >
                                            <span className="truncate max-w-[28px]">{item.name}</span>
                                            <span className="tabular-nums font-extrabold">{item.amount}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 bg-secondary/20 p-2 rounded-lg border border-border/50">
                            <span className="flex h-2 w-2 rounded-full bg-primary" />
                            <span><strong>Calendar Rescheduling:</strong> Drag & drop any item across the calendar to instantly update dates. Click any badge to trigger action gates.</span>
                          </div>
                        </div>
                      ) : (
                        /* Split Timeline Flow view */
                        <div className="grid grid-cols-12 gap-4">
                          {/* Ledger (Left) */}
                          <div className="col-span-7 space-y-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[9px]">
                              <CalendarDays className="h-3.5 w-3.5 text-primary" />
                              <span className="uppercase tracking-wider">Split Timeline Flow Ledger</span>
                            </div>
                            <div className="relative pl-3 space-y-3">
                              <div className="absolute left-[3px] top-1.5 bottom-1.5 w-[1.5px] bg-border" />
                              
                              {[
                                { name: "Paycheck 1", date: "May 1", amount: "$2,400", type: "income", status: "received", interval: "Biweekly" },
                                { name: "Rent", date: "May 1", amount: "-$1,200", type: "bill", status: "paid", interval: "Monthly • Housing" },
                                { name: "Paycheck 2", date: "May 15", amount: "$2,400", type: "income", status: "pending", interval: "Biweekly" },
                                { name: "Verizon", date: "May 18", amount: "-$85", type: "bill", status: "pending", interval: "Monthly • Utilities" },
                              ].map((o, index) => {
                                const isIncome = o.type === "income";
                                const isPaid = o.status === "paid" || o.status === "received";
                                return (
                                  <div key={index} className="relative pl-3">
                                    {/* Connective Node */}
                                    <div className={`absolute left-0 top-2 h-2.5 w-2.5 rounded-full border border-background transition-colors ${
                                      isIncome ? "bg-success" : isPaid ? "bg-primary" : "bg-warning"
                                    }`} />

                                    <div className="rounded-xl border border-border bg-card p-2.5 hover:border-primary/20 transition-all hover:shadow-xs">
                                      <div className="flex items-center justify-between font-bold text-[10px]">
                                        <span className="text-foreground">{o.name}</span>
                                        <span className={isIncome ? "text-success" : "text-destructive"}>
                                          {o.amount}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-[8.5px] text-muted-foreground">
                                        <span>{o.date} • {o.interval}</span>
                                        <span className={`rounded border px-1.5 py-0.2 font-bold uppercase text-[7px] ${
                                          isPaid ? "bg-success/15 border-success/30 text-success" : "bg-warning/15 border-warning/30 text-warning"
                                        }`}>
                                          {o.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Budgets (Right) */}
                          <div className="col-span-5 space-y-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[9px]">
                              <Target className="h-3.5 w-3.5 text-primary" />
                              <span className="uppercase tracking-wider">Category Budgets</span>
                            </div>
                            <div className="space-y-2.5">
                              {[
                                { name: "Housing", spent: "$1,200", limit: "$1,200", color: "bg-primary", pct: 100 },
                                { name: "Utilities", spent: "$0", limit: "$180", color: "bg-muted-foreground/20", pct: 0 },
                                { name: "Food", spent: "$142", limit: "$300", color: "bg-accent", pct: 47 },
                              ].map((c, i) => (
                                <div key={i} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between font-bold text-[9px]">
                                    <span className="text-foreground/90">{c.name}</span>
                                    <span className="text-muted-foreground">{c.spent} / {c.limit}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                                    <div className={`h-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-secondary/35 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground font-heading">
              Everything you need to balance your budget
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built around precision funneling — every dollar is balanced,
              nothing is left to waste.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-5 w-5 text-accent" />}
              iconBg="bg-accent/10"
              title="Budget Tracker"
              description="A split chronological timeline flow ledger and interactive calendar view. Drag and drop occurrences to reschedule, view category cards, and track allocations."
              mockup={<TrackerMockup />}
            />

            <FeatureCard
              icon={<Receipt className="h-5 w-5 text-destructive" />}
              iconBg="bg-destructive/10"
              title="Bills & Expenses"
              description="Weekly, biweekly, monthly, and one-time bills — each linked to a vendor and category. Edit or delete any time and all occurrences update automatically."
              mockup={<BillsMockup />}
            />

            <FeatureCard
              icon={<Wallet className="h-5 w-5 text-success" />}
              iconBg="bg-success/10"
              title="Multiple Income Sources"
              description="Track paychecks, disability, child support, and any recurring income with flexible schedules. Each paycheck shows up as its own trackable occurrence."
              mockup={<IncomeMockup />}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground font-heading">
              How precision tapering works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three steps to financial balance and clarity.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Enter your income",
                desc: "Add every income source — jobs, benefits, side income — and their pay schedule. Each paycheck generates its own trackable occurrence.",
                icon: <Wallet className="h-6 w-6 text-success" />,
                iconBg: "bg-success/10",
              },
              {
                step: "02",
                title: "Taper your income",
                desc: "Add bills and expenses until your unfunneled balance reaches exactly $0.00 (the clean, precise point). Taper's alerts show your balance in real time.",
                icon: <TrendingDown className="h-6 w-6 text-accent" />,
                iconBg: "bg-accent/10",
              },
              {
                step: "03",
                title: "Funnel allocations",
                desc: "Open the Budget Tracker, view your split chronological flow ledger, and mark occurrences paid or received. Watch your cash distribute cleanly to zero waste.",
                icon: <CalendarDays className="h-6 w-6 text-warning" />,
                iconBg: "bg-warning/10",
              },
            ].map(({ step, title, desc, icon, iconBg }) => (
              <div key={step} className="flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
                    {icon}
                  </div>
                  <span className="text-4xl font-black text-muted-foreground/15">{step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold font-heading mb-4 text-primary-foreground">
            Ready to balance your budget?
          </h2>
          <p className="text-primary-foreground/90 text-lg mb-8">
            Free to use. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-6 py-3 text-base font-semibold text-primary hover:bg-primary-foreground/95 transition-colors shadow-sm"
            >
              Create your account
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              Already have one? Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">Funnel your income with absolute precision.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  mockup,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5 border-b border-border bg-secondary/10">{mockup}</div>
      <div className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} mb-3`}>
          {icon}
        </div>
        <h3 className="text-base font-semibold text-foreground font-heading mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TrackerMockup() {
  const [view, setView] = useState<"calendar" | "timeline">("calendar");

  return (
    <div className="rounded-lg border border-border overflow-hidden text-[10px] bg-card shadow-xs">
      {/* Header View toggle */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/15 px-3 py-1.5">
        <span className="font-bold text-foreground text-[8px] uppercase tracking-wider">Tracker View Mock</span>
        <div className="inline-flex rounded border border-border bg-muted p-0.5">
          {[
            { value: "calendar", label: "Calendar" },
            { value: "timeline", label: "Ledger" }
          ].map((v) => (
            <button
              key={v.value}
              onClick={(e) => {
                e.preventDefault();
                setView(v.value as any);
              }}
              className={`rounded px-1.5 py-0.5 text-[8px] font-bold cursor-pointer transition-all ${
                view === v.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "calendar" ? (
        /* Calendar view mini-mockup */
        <div className="p-2 space-y-1.5">
          <div className="grid grid-cols-7 gap-0.5 text-center text-[7px] font-bold text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 bg-border/10">
            {Array.from({ length: 14 }).map((_, idx) => {
              const day = idx + 10;
              const isToday = day === 15;
              
              return (
                <div
                  key={idx}
                  className={`min-h-[36px] p-0.5 border border-border/30 bg-card rounded flex flex-col justify-between ${
                    isToday ? "bg-primary/5 border-primary/20" : ""
                  }`}
                >
                  <span className={`text-[7px] font-bold text-muted-foreground/60 ${
                    isToday ? "text-primary font-black" : ""
                  }`}>{day}</span>
                  <div className="flex-1 flex flex-col justify-end gap-0.2 select-none overflow-hidden">
                    {day === 12 && (
                      <div className="rounded bg-success/15 border border-success/30 text-success-foreground text-[6px] font-extrabold px-0.5 truncate leading-tight">
                        Rent
                      </div>
                    )}
                    {day === 15 && (
                      <div className="rounded bg-warning/15 border border-warning/30 text-warning-foreground text-[6px] font-extrabold px-0.5 truncate leading-tight">
                        Pay
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Original Split view mockup */
        <div className="grid grid-cols-12 gap-2 p-2 items-start">
          {/* Timeline Flow (Left Column) */}
          <div className="col-span-7 space-y-1.5">
            {/* Timeline occurrences */}
            <div className="relative pl-2.5 space-y-1.5">
              {/* Timeline axis */}
              <div className="absolute left-[2.5px] top-1 bottom-1 w-[1px] bg-border/55" />

              {/* Paycheck 1 */}
              <div className="relative pl-2 text-[8px]">
                <div className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full border border-background bg-success" />
                <div className="rounded border border-border bg-card p-1 shadow-2xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">Paycheck</span>
                    <span className="text-success">$1,200</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-[6.5px] text-muted-foreground">
                    <span>May 1</span>
                    <span className="text-success font-bold">received</span>
                  </div>
                </div>
              </div>

              {/* Rent Bill */}
              <div className="relative pl-2 text-[8px]">
                <div className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full border border-background bg-destructive" />
                <div className="rounded border border-border bg-card p-1 shadow-2xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">Rent</span>
                    <span className="text-destructive">-$1.2k</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-[6.5px] text-muted-foreground">
                    <span>May 1</span>
                    <span className="text-success font-bold">paid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category breakdown (Right Column) */}
          <div className="col-span-5 space-y-1.5">
            <div className="space-y-1.5">
              {/* Housing Budget */}
              <div className="rounded border border-border bg-card p-1 shadow-2xs space-y-0.5">
                <div className="flex items-center justify-between font-bold text-[7.5px]">
                  <span>Housing</span>
                  <span>100%</span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: "100%" }} />
                </div>
              </div>

              {/* Food Budget */}
              <div className="rounded border border-border bg-card p-1 shadow-2xs space-y-0.5">
                <div className="flex items-center justify-between font-bold text-[7.5px]">
                  <span>Food</span>
                  <span>47%</span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "47%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BillsMockup() {
  const bills = [
    { name: "Rent", vendor: "Landlord", category: { name: "Housing", color: "var(--color-primary)" }, amount: "$1,200", interval: "Monthly" },
    { name: "Verizon", vendor: "Verizon", category: { name: "Utilities", color: "var(--color-accent)" }, amount: "$85", interval: "Monthly" },
    { name: "Netflix", vendor: "Netflix", category: { name: "Entertainment", color: "var(--color-destructive)" }, amount: "$17", interval: "Monthly" },
    { name: "Groceries", vendor: "Whole Foods", category: { name: "Food", color: "var(--color-success)" }, amount: "$300", interval: "Biweekly" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-[10px]">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary/15">
          <tr>
            {["Name", "Vendor", "Category", "Amount", "Interval", "Status"].map((h) => (
              <th
                key={h}
                className="px-2 py-1.5 text-left text-[8.5px] font-black uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {bills.map((b) => (
            <tr key={b.name} className="hover:bg-secondary/10 transition-colors">
              <td className="px-2 py-1.5 font-bold text-foreground">{b.name}</td>
              <td className="px-2 py-1.5 text-muted-foreground/80">{b.vendor}</td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: b.category.color }}
                  />
                  <span className="text-foreground/95 text-[9px]">{b.category.name}</span>
                </div>
              </td>
              <td className="px-2 py-1.5 font-bold tabular-nums text-foreground">{b.amount}</td>
              <td className="px-2 py-1.5 text-muted-foreground/80">{b.interval}</td>
              <td className="px-2 py-1.5">
                <span className="rounded border border-success/20 bg-success/15 px-1.5 py-0.2 text-[8px] font-bold text-success">
                  Active
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncomeMockup() {
  const sources = [
    { name: "Main Job", type: "Paycheck", amount: "$2,400", interval: "Biweekly", color: "bg-success/10 text-success border-success/20" },
    { name: "SSDI", type: "Disability", amount: "$950", interval: "Monthly", color: "bg-primary/10 text-primary border-primary/20" },
    { name: "Side Work", type: "Freelance", amount: "$500", interval: "Monthly", color: "bg-accent/10 text-accent border-accent/20" },
  ];

  const total = 2400 + 950 + 500;

  return (
    <div className="space-y-2 text-[10px]">
      {/* Total banner */}
      <div className="rounded-lg bg-success/5 border border-success/20 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
          <span className="font-bold text-success text-[9.5px]">Total Monthly Income</span>
        </div>
        <span className="font-black text-success text-[11px]">${total.toLocaleString()}</span>
      </div>

      {/* Source rows */}
      {sources.map((s) => (
        <div
          key={s.name}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-2 hover:border-primary/20 transition-all"
        >
          <div className="flex items-center gap-2">
            <span className={`rounded border px-1.5 py-0.2 text-[7.5px] font-bold uppercase ${s.color}`}>
              {s.type}
            </span>
            <div>
              <div className="font-bold text-foreground">{s.name}</div>
              <div className="text-muted-foreground/80 text-[9px]">{s.interval}</div>
            </div>
          </div>
          <div className="font-bold text-foreground tabular-nums">{s.amount}</div>
        </div>
      ))}
    </div>
  );
}


