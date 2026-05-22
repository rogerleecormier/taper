import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Wallet,
  Building2,
  Tag,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Anchor,
  Target,
  GripVertical,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Anchor className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground font-heading">
              Fether
            </span>
          </div>
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
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
          <Target className="h-3.5 w-3.5" />
          Tether every dollar to your goals
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground font-heading sm:text-6xl">
          Tether your budget.
          <br />
          <span className="text-primary">Ground your goals.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground leading-relaxed">
          Financial tethering that grounds every dollar. Track your income, bills, and occurrences 
          in one place. Your goal: 100% of income tethered, $0.00 left untethered.
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

      {/* Dashboard mockup */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 shadow-lg">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Browser chrome */}
            <div className="flex h-10 items-center gap-2 border-b border-border bg-secondary/20 px-4">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded-md bg-card border border-border h-5 max-w-xs text-xs text-muted-foreground/60 flex items-center px-2">
                fether.rcormier.workers.dev
              </div>
            </div>

            <div className="flex h-[500px]">
              {/* Sidebar */}
              <div className="w-52 flex-shrink-0 border-r border-border bg-card flex flex-col">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
                    <Anchor className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-foreground font-heading">Fether</span>
                </div>
                <nav className="flex-1 px-2 py-2 space-y-0.5">
                  {[
                    { icon: LayoutDashboard, label: "Dashboard", active: true },
                    { icon: CalendarDays, label: "Budget Tracker" },
                    { icon: Receipt, label: "Bills" },
                    { icon: Wallet, label: "Income" },
                    { icon: Building2, label: "Vendors" },
                    { icon: Tag, label: "Categories" },
                  ].map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                        active ? "bg-primary/10 text-primary" : "text-foreground/75"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {label}
                    </div>
                  ))}
                </nav>
                <div className="border-t border-border px-2 py-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground">
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="flex-1 overflow-hidden bg-background p-4 space-y-3">
                <div>
                  <div className="text-sm font-bold text-foreground">Dashboard</div>
                  <div className="text-[10px] text-muted-foreground">Your budget overview at a glance</div>
                </div>

                {/* Unallocated banner */}
                <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-success">
                        Every dollar is tethered! 🎯
                      </p>
                      <p className="text-[10px] text-success/90">100% of income tethered</p>
                    </div>
                    <span className="text-[10px] font-medium text-success/90 tabular-nums">
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
                    { label: "Net Balance", value: "$0", color: "text-accent", bg: "bg-accent/10", Icon: Anchor, iconColor: "text-accent" },
                    { label: "Untethered", value: "$0.00", color: "text-success", bg: "bg-success/10", Icon: Target, iconColor: "text-success" },
                  ].map(({ label, value, color, bg, Icon, iconColor }) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[9px] text-muted-foreground font-medium leading-tight">{label}</div>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${bg}`}>
                          <Icon className={`h-2.5 w-2.5 ${iconColor}`} />
                        </div>
                      </div>
                      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Activity panels */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Upcoming expenses */}
                  <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Upcoming Expenses
                      </div>
                      <div className="inline-flex rounded border border-border bg-secondary/30 p-0.5">
                        {["7d", "14d", "30d"].map((d, i) => (
                          <div
                            key={d}
                            className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
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
                        { name: "Rent", vendor: "Landlord", due: "In 3 days", amount: "$1,200", color: "#8b5cf6" },
                        { name: "Netflix", vendor: "Netflix", due: "In 5 days", amount: "$17", color: "var(--color-destructive)" },
                      ].map((b) => (
                        <div key={b.name} className="flex items-center gap-2 py-1.5 text-[10px]">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{b.name}</div>
                            <div className="text-muted-foreground truncate">{b.vendor}</div>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0">{b.due}</span>
                          <span className="font-semibold text-foreground tabular-nums flex-shrink-0">{b.amount}</span>
                          <span className="rounded border border-warning/20 bg-warning/10 px-1 py-0.5 text-[8px] font-medium text-warning flex-shrink-0">
                            pending
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent payments */}
                  <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Recent Payments
                    </div>
                    <div className="divide-y divide-border/60">
                      {[
                        { name: "Electric", vendor: "Duke Energy", paid: "May 12", amount: "$95", color: "#f59e0b" },
                        { name: "Internet", vendor: "AT&T", paid: "May 10", amount: "$60", color: "var(--color-primary)" },
                        { name: "Groceries", vendor: "Whole Foods", paid: "May 8", amount: "$142", color: "#6366f1" },
                      ].map((p) => (
                        <div key={p.name} className="flex items-center gap-2 py-1.5 text-[10px]">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{p.name}</div>
                            <div className="text-muted-foreground truncate">{p.vendor}</div>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0">{p.paid}</span>
                          <span className="font-semibold text-foreground tabular-nums flex-shrink-0">{p.amount}</span>
                          <span className="rounded border border-success/20 bg-success/10 px-1 py-0.5 text-[8px] font-medium text-success flex-shrink-0">
                            paid
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary/35 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground font-heading">
              Everything you need to anchor your budget
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built around financial tethering — every dollar has an anchor,
              nothing is left untethered.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-5 w-5 text-accent" />}
              iconBg="bg-accent/10"
              title="Budget Tracker"
              description="Expandable rows for every income source and expense. See each scheduled occurrence, then mark it paid, received, or skipped — with drag-to-reorder to stay organized."
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
              How financial tethering works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three steps to financial clarity every month.
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
                title: "Tether every dollar",
                desc: "Add bills and expenses until your untethered balance reaches exactly $0.00. The dashboard shows your status in real time.",
                icon: <TrendingDown className="h-6 w-6 text-accent" />,
                iconBg: "bg-accent/10",
              },
              {
                step: "03",
                title: "Ground your cash",
                desc: "Open the Budget Tracker, expand any row, and mark each occurrence paid or received. Watch your month close out perfectly anchored.",
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
            Ready to ground your goals?
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
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Anchor className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground font-heading">Fether</span>
          </div>
          <p className="text-sm text-muted-foreground">Tether every dollar to your goals.</p>
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
  return (
    <div className="rounded-lg border border-border overflow-hidden text-[10px] bg-card">
      {/* Summary bar */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "Income", value: "$2,400", color: "text-success" },
          { label: "Expenses", value: "$1,850", color: "text-destructive" },
          { label: "Untethered", value: "$550", color: "text-warning" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-2 bg-secondary/10">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Income section header */}
      <div className="flex items-center justify-between border-b border-border bg-success/5 px-3 py-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-success" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-success">
            Income
          </span>
          <span className="text-[9px] text-success/70">2 sources</span>
        </div>
        <span className="text-[10px] font-semibold text-success">$2,400</span>
      </div>

      {/* Main Job row — expanded */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-border flex-shrink-0" />
          <Wallet className="h-3 w-3 text-success flex-shrink-0" />
          <span className="flex-1 font-medium text-foreground">Main Job</span>
          <span className="rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">Biweekly</span>
          <span className="font-semibold text-success">$2,400</span>
          <span className="rounded-full bg-secondary px-1 text-[9px] text-muted-foreground">2</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="border-t border-dashed border-border">
          <div className="flex items-center gap-2 px-3 pl-7 py-1 border-b border-dashed border-border/50">
            <span className="w-16 text-[9px] tabular-nums text-muted-foreground">2026-05-01</span>
            <span className="w-14 text-[9px] font-medium text-success">$1,200</span>
            <span className="rounded border border-success/20 bg-success/15 px-1 py-0.5 text-[8px] text-success">
              received
            </span>
            <span className="text-[9px] text-muted-foreground">Received 05/01</span>
            <div className="ml-auto">
              <div className="rounded border border-success/30 px-1.5 py-0.5 text-[8px] text-success">
                Adjust
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 pl-7 py-1">
            <span className="w-16 text-[9px] tabular-nums text-muted-foreground">2026-05-15</span>
            <span className="w-14 text-[9px] font-medium text-success">$1,200</span>
            <span className="rounded border border-warning/20 bg-warning/10 px-1 py-0.5 text-[8px] text-warning">
              pending
            </span>
            <div className="ml-auto flex gap-1">
              <div className="rounded border border-success/30 px-1.5 py-0.5 text-[8px] text-success">
                Receive
              </div>
              <div className="rounded px-1.5 py-0.5 text-[8px] text-muted-foreground">Skip</div>
            </div>
          </div>
        </div>
      </div>

      {/* SSDI row — collapsed */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-border flex-shrink-0" />
          <Wallet className="h-3 w-3 text-success flex-shrink-0" />
          <span className="flex-1 font-medium text-foreground">SSDI</span>
          <span className="rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">Monthly</span>
          <span className="font-semibold text-success">$950</span>
          <span className="rounded-full bg-secondary px-1 text-[9px] text-muted-foreground">1</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </div>
      </div>

      {/* Expenses section header */}
      <div className="flex items-center justify-between border-b border-border bg-destructive/5 px-3 py-1">
        <div className="flex items-center gap-1.5">
          <Receipt className="h-3 w-3 text-destructive" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-destructive">
            Expenses
          </span>
          <span className="text-[9px] text-destructive/70">3 items</span>
        </div>
        <span className="text-[10px] font-semibold text-destructive">$1,850</span>
      </div>

      {/* Rent — expanded, paid */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-border flex-shrink-0" />
          <Receipt className="h-3 w-3 text-destructive flex-shrink-0" />
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
          <span className="flex-1 font-medium text-foreground">Rent</span>
          <span className="text-[9px] text-muted-foreground truncate">Landlord · Housing</span>
          <span className="rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">Monthly</span>
          <span className="font-semibold text-destructive">$1,200</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="border-t border-dashed border-border">
          <div className="flex items-center gap-2 px-3 pl-7 py-1">
            <span className="w-16 text-[9px] tabular-nums text-muted-foreground">2026-05-01</span>
            <span className="w-14 text-[9px] font-medium text-destructive">$1,200</span>
            <span className="rounded border border-success/20 bg-success/15 px-1 py-0.5 text-[8px] text-success">
              paid
            </span>
            <span className="text-[9px] text-muted-foreground">Paid 05/01</span>
            <div className="ml-auto">
              <div className="rounded border border-accent/20 px-1.5 py-0.5 text-[8px] text-accent">
                Adjust
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verizon — expanded, pending */}
      <div className="bg-card">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-border flex-shrink-0" />
          <Receipt className="h-3 w-3 text-destructive flex-shrink-0" />
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
          <span className="flex-1 font-medium text-foreground">Verizon</span>
          <span className="text-[9px] text-muted-foreground truncate">Verizon · Utilities</span>
          <span className="rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">Monthly</span>
          <span className="font-semibold text-destructive">$85</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="border-t border-dashed border-border">
          <div className="flex items-center gap-2 px-3 pl-7 py-1">
            <span className="w-16 text-[9px] tabular-nums text-muted-foreground">2026-05-18</span>
            <span className="w-14 text-[9px] font-medium text-destructive">$85</span>
            <span className="rounded border border-warning/20 bg-warning/10 px-1 py-0.5 text-[8px] text-warning">
              pending
            </span>
            <div className="ml-auto flex gap-1">
              <div className="rounded border border-accent/20 px-1.5 py-0.5 text-[8px] text-accent">
                Pay
              </div>
              <div className="rounded px-1.5 py-0.5 text-[8px] text-muted-foreground">Skip</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillsMockup() {
  const bills = [
    { name: "Rent", vendor: "Landlord", category: { name: "Housing", color: "#8b5cf6" }, amount: "$1,200", interval: "Monthly" },
    { name: "Verizon", vendor: "Verizon", category: { name: "Utilities", color: "#3b82f6" }, amount: "$85", interval: "Monthly" },
    { name: "Netflix", vendor: "Netflix", category: { name: "Entertainment", color: "var(--color-destructive)" }, amount: "$17", interval: "Monthly" },
    { name: "Groceries", vendor: "Whole Foods", category: { name: "Food", color: "var(--color-primary)" }, amount: "$300", interval: "Biweekly" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-[10px]">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary/15">
          <tr>
            {["Name", "Vendor", "Category", "Amount", "Interval", "Status"].map((h) => (
              <th
                key={h}
                className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {bills.map((b) => (
            <tr key={b.name}>
              <td className="px-2 py-1.5 font-medium text-foreground">{b.name}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{b.vendor}</td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: b.category.color }}
                  />
                  <span className="text-foreground/95">{b.category.name}</span>
                </div>
              </td>
              <td className="px-2 py-1.5 font-medium tabular-nums text-foreground">{b.amount}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{b.interval}</td>
              <td className="px-2 py-1.5">
                <span className="rounded border border-success/20 bg-success/15 px-1.5 py-0.5 text-[8px] font-medium text-success">
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
    { name: "Main Job", type: "Paycheck", amount: "$2,400", interval: "Biweekly", color: "bg-success/15 text-success border border-success/20" },
    { name: "SSDI", type: "Disability", amount: "$950", interval: "Monthly", color: "bg-accent/15 text-accent border border-accent/20" },
    { name: "Side Work", type: "Freelance", amount: "$500", interval: "Monthly", color: "bg-warning/15 text-warning border border-warning/20" },
  ];

  const total = 2400 + 950 + 500;

  return (
    <div className="space-y-2 text-[10px]">
      {/* Total banner */}
      <div className="rounded-lg bg-success/5 border border-success/20 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-success" />
          <span className="font-semibold text-success text-[10px]">Total Monthly Income</span>
        </div>
        <span className="font-bold text-success text-[11px]">${total.toLocaleString()}</span>
      </div>

      {/* Source rows */}
      {sources.map((s) => (
        <div
          key={s.name}
          className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-2"
        >
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${s.color}`}>
              {s.type}
            </span>
            <div>
              <div className="font-semibold text-foreground">{s.name}</div>
              <div className="text-muted-foreground">{s.interval}</div>
            </div>
          </div>
          <div className="font-bold text-foreground tabular-nums">{s.amount}</div>
        </div>
      ))}
    </div>
  );
}

