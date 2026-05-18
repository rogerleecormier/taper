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
  DollarSign,
  Target,
  GripVertical,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Zero Dollar Budget
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
          <Target className="h-3.5 w-3.5" />
          Give every dollar a job
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Budget down to{" "}
          <span className="text-blue-600">zero.</span>
          <br />
          Every month.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500 leading-relaxed">
          Zero-based budgeting that tracks every dollar — bills, income,
          vendors, and recurring expenses — all in one place. Your goal: $0
          unallocated.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start for free
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log in to your account
          </Link>
        </div>
      </section>

      {/* Dashboard mockup */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-lg">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {/* Browser chrome */}
            <div className="flex h-10 items-center gap-2 border-b border-gray-100 bg-gray-50 px-4">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded-md bg-white border border-gray-200 h-5 max-w-xs text-xs text-gray-400 flex items-center px-2">
                zero-dollar-budget-tracker.rcormier.workers.dev
              </div>
            </div>

            <div className="flex h-[500px]">
              {/* Sidebar */}
              <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Zero Dollar</span>
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
                        active ? "bg-blue-50 text-blue-700" : "text-gray-500"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {label}
                    </div>
                  ))}
                </nav>
                <div className="border-t border-gray-100 px-2 py-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-400">
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-4 space-y-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">Dashboard</div>
                  <div className="text-[10px] text-gray-400">Your budget overview at a glance</div>
                </div>

                {/* Unallocated banner */}
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-green-800">
                        Every dollar is allocated! 🎯
                      </p>
                      <p className="text-[10px] text-green-700">100% of income allocated</p>
                    </div>
                    <span className="text-[10px] font-medium text-green-700 tabular-nums">
                      $4,850 / $4,850
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                    <div className="h-full w-full rounded-full bg-green-500" />
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Monthly Income", value: "$4,850", color: "text-green-600", bg: "bg-green-100", Icon: TrendingUp, iconColor: "text-green-600" },
                    { label: "Monthly Expenses", value: "$4,850", color: "text-red-600", bg: "bg-red-100", Icon: TrendingDown, iconColor: "text-red-600" },
                    { label: "Net Balance", value: "$0", color: "text-blue-600", bg: "bg-blue-100", Icon: DollarSign, iconColor: "text-blue-600" },
                    { label: "Unallocated", value: "$0.00", color: "text-green-600", bg: "bg-green-100", Icon: Target, iconColor: "text-green-600" },
                  ].map(({ label, value, color, bg, Icon, iconColor }) => (
                    <div key={label} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[9px] text-gray-500 font-medium leading-tight">{label}</div>
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
                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                        Upcoming Expenses
                      </div>
                      <div className="inline-flex rounded border bg-gray-50 p-0.5">
                        {["7d", "14d", "30d"].map((d, i) => (
                          <div
                            key={d}
                            className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                              i === 0
                                ? "bg-white shadow text-gray-700"
                                : "text-gray-400"
                            }`}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="divide-y">
                      {[
                        { name: "Verizon", vendor: "Verizon", due: "Today", amount: "$85", color: "#3b82f6" },
                        { name: "Rent", vendor: "Landlord", due: "In 3 days", amount: "$1,200", color: "#8b5cf6" },
                        { name: "Netflix", vendor: "Netflix", due: "In 5 days", amount: "$17", color: "#ef4444" },
                      ].map((b) => (
                        <div key={b.name} className="flex items-center gap-2 py-1.5 text-[10px]">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-700 truncate">{b.name}</div>
                            <div className="text-gray-400 truncate">{b.vendor}</div>
                          </div>
                          <span className="text-gray-400 flex-shrink-0">{b.due}</span>
                          <span className="font-semibold text-gray-800 tabular-nums flex-shrink-0">{b.amount}</span>
                          <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] font-medium text-amber-700 flex-shrink-0">
                            pending
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent payments */}
                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Recent Payments
                    </div>
                    <div className="divide-y">
                      {[
                        { name: "Electric", vendor: "Duke Energy", paid: "May 12", amount: "$95", color: "#f59e0b" },
                        { name: "Internet", vendor: "AT&T", paid: "May 10", amount: "$60", color: "#10b981" },
                        { name: "Groceries", vendor: "Whole Foods", paid: "May 8", amount: "$142", color: "#6366f1" },
                      ].map((p) => (
                        <div key={p.name} className="flex items-center gap-2 py-1.5 text-[10px]">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-700 truncate">{p.name}</div>
                            <div className="text-gray-400 truncate">{p.vendor}</div>
                          </div>
                          <span className="text-gray-400 flex-shrink-0">{p.paid}</span>
                          <span className="font-semibold text-gray-800 tabular-nums flex-shrink-0">{p.amount}</span>
                          <span className="rounded border border-green-200 bg-green-50 px-1 py-0.5 text-[8px] font-medium text-green-700 flex-shrink-0">
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
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need to zero out your budget
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Built around zero-based budgeting — every dollar allocated,
              nothing left over.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-5 w-5 text-purple-600" />}
              iconBg="bg-purple-50"
              title="Budget Tracker"
              description="Expandable rows for every income source and expense. See each scheduled occurrence, then mark it paid, received, or skipped — with drag-to-reorder to stay organized."
              mockup={<TrackerMockup />}
            />

            <FeatureCard
              icon={<Receipt className="h-5 w-5 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Bills & Expenses"
              description="Weekly, biweekly, monthly, and one-time bills — each linked to a vendor and category. Edit or delete any time and all occurrences update automatically."
              mockup={<BillsMockup />}
            />

            <FeatureCard
              icon={<Wallet className="h-5 w-5 text-green-600" />}
              iconBg="bg-green-50"
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
            <h2 className="text-3xl font-bold text-gray-900">
              How zero-based budgeting works
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Three steps to financial clarity every month.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Enter your income",
                desc: "Add every income source — jobs, benefits, side income — and their pay schedule. Each paycheck generates its own trackable occurrence.",
                icon: <Wallet className="h-6 w-6 text-green-600" />,
              },
              {
                step: "02",
                title: "Allocate every dollar",
                desc: "Add bills and expenses until your unallocated balance reaches exactly $0. The dashboard shows you how close you are in real time.",
                icon: <TrendingDown className="h-6 w-6 text-blue-600" />,
              },
              {
                step: "03",
                title: "Track as you go",
                desc: "Open the Budget Tracker, expand any row, and mark each occurrence paid or received. Watch your month close out perfectly balanced.",
                icon: <CalendarDays className="h-6 w-6 text-purple-600" />,
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    {icon}
                  </div>
                  <span className="text-4xl font-black text-gray-100">{step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to give every dollar a job?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Free to use. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
            >
              Create your account
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-400 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Already have one? Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Zero Dollar Budget</span>
          </div>
          <p className="text-sm text-gray-400">Built to help every dollar find a home.</p>
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
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5 border-b border-gray-100 bg-gray-50">{mockup}</div>
      <div className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} mb-3`}>
          {icon}
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TrackerMockup() {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden text-[10px] bg-white">
      {/* Summary bar */}
      <div className="grid grid-cols-3 divide-x border-b">
        {[
          { label: "Income", value: "$2,400", color: "text-green-600" },
          { label: "Expenses", value: "$1,850", color: "text-red-600" },
          { label: "Unallocated", value: "$550", color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              {label}
            </span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Income section header */}
      <div className="flex items-center justify-between border-b bg-green-50/70 px-3 py-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-green-700">
            Income
          </span>
          <span className="text-[9px] text-green-600">2 sources</span>
        </div>
        <span className="text-[10px] font-semibold text-green-700">$2,400</span>
      </div>

      {/* Main Job row — expanded */}
      <div className="border-b bg-white">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0" />
          <Wallet className="h-3 w-3 text-green-500 flex-shrink-0" />
          <span className="flex-1 font-medium text-gray-700">Main Job</span>
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-500">Biweekly</span>
          <span className="font-semibold text-green-600">$2,400</span>
          <span className="rounded-full bg-gray-100 px-1 text-[9px] text-gray-400">2</span>
          <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </div>
        <div className="border-t border-dashed border-gray-100">
          <div className="flex items-center gap-2 px-3 pl-7 py-1 border-b border-dashed border-gray-50">
            <span className="w-16 text-[9px] tabular-nums text-gray-400">2026-05-01</span>
            <span className="w-14 text-[9px] font-medium text-green-700">$1,200</span>
            <span className="rounded border border-green-200 bg-green-100 px-1 py-0.5 text-[8px] text-green-800">
              received
            </span>
            <span className="text-[9px] text-gray-400">Received 05/01</span>
            <div className="ml-auto">
              <div className="rounded border border-green-200 px-1.5 py-0.5 text-[8px] text-green-700">
                Adjust
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 pl-7 py-1">
            <span className="w-16 text-[9px] tabular-nums text-gray-400">2026-05-15</span>
            <span className="w-14 text-[9px] font-medium text-green-700">$1,200</span>
            <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] text-amber-700">
              pending
            </span>
            <div className="ml-auto flex gap-1">
              <div className="rounded border border-green-200 px-1.5 py-0.5 text-[8px] text-green-700">
                Receive
              </div>
              <div className="rounded px-1.5 py-0.5 text-[8px] text-gray-400">Skip</div>
            </div>
          </div>
        </div>
      </div>

      {/* SSDI row — collapsed */}
      <div className="border-b bg-white">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0" />
          <Wallet className="h-3 w-3 text-green-500 flex-shrink-0" />
          <span className="flex-1 font-medium text-gray-700">SSDI</span>
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-500">Monthly</span>
          <span className="font-semibold text-green-600">$950</span>
          <span className="rounded-full bg-gray-100 px-1 text-[9px] text-gray-400">1</span>
          <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </div>
      </div>

      {/* Expenses section header */}
      <div className="flex items-center justify-between border-b bg-red-50/70 px-3 py-1">
        <div className="flex items-center gap-1.5">
          <Receipt className="h-3 w-3 text-red-600" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-700">
            Expenses
          </span>
          <span className="text-[9px] text-red-600">3 items</span>
        </div>
        <span className="text-[10px] font-semibold text-red-700">$1,850</span>
      </div>

      {/* Rent — expanded, paid */}
      <div className="border-b bg-white">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0" />
          <Receipt className="h-3 w-3 text-red-400 flex-shrink-0" />
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
          <span className="flex-1 font-medium text-gray-700">Rent</span>
          <span className="text-[9px] text-gray-400 truncate">Landlord · Housing</span>
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-500">Monthly</span>
          <span className="font-semibold text-red-600">$1,200</span>
          <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </div>
        <div className="border-t border-dashed border-gray-100">
          <div className="flex items-center gap-2 px-3 pl-7 py-1">
            <span className="w-16 text-[9px] tabular-nums text-gray-400">2026-05-01</span>
            <span className="w-14 text-[9px] font-medium text-red-600">$1,200</span>
            <span className="rounded border border-green-200 bg-green-100 px-1 py-0.5 text-[8px] text-green-800">
              paid
            </span>
            <span className="text-[9px] text-gray-400">Paid 05/01</span>
            <div className="ml-auto">
              <div className="rounded border border-blue-200 px-1.5 py-0.5 text-[8px] text-blue-700">
                Adjust
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verizon — expanded, pending */}
      <div className="bg-white">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0" />
          <Receipt className="h-3 w-3 text-red-400 flex-shrink-0" />
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
          <span className="flex-1 font-medium text-gray-700">Verizon</span>
          <span className="text-[9px] text-gray-400 truncate">Verizon · Utilities</span>
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-500">Monthly</span>
          <span className="font-semibold text-red-600">$85</span>
          <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </div>
        <div className="border-t border-dashed border-gray-100">
          <div className="flex items-center gap-2 px-3 pl-7 py-1">
            <span className="w-16 text-[9px] tabular-nums text-gray-400">2026-05-18</span>
            <span className="w-14 text-[9px] font-medium text-red-600">$85</span>
            <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] text-amber-700">
              pending
            </span>
            <div className="ml-auto flex gap-1">
              <div className="rounded border border-blue-200 px-1.5 py-0.5 text-[8px] text-blue-700">
                Pay
              </div>
              <div className="rounded px-1.5 py-0.5 text-[8px] text-gray-400">Skip</div>
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
    { name: "Netflix", vendor: "Netflix", category: { name: "Entertainment", color: "#ef4444" }, amount: "$17", interval: "Monthly" },
    { name: "Groceries", vendor: "Whole Foods", category: { name: "Food", color: "#10b981" }, amount: "$300", interval: "Biweekly" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 text-[10px]">
      <table className="w-full">
        <thead className="border-b bg-gray-50">
          <tr>
            {["Name", "Vendor", "Category", "Amount", "Interval", "Status"].map((h) => (
              <th
                key={h}
                className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {bills.map((b) => (
            <tr key={b.name}>
              <td className="px-2 py-1.5 font-medium text-gray-800">{b.name}</td>
              <td className="px-2 py-1.5 text-gray-500">{b.vendor}</td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: b.category.color }}
                  />
                  <span className="text-gray-700">{b.category.name}</span>
                </div>
              </td>
              <td className="px-2 py-1.5 font-medium tabular-nums text-gray-800">{b.amount}</td>
              <td className="px-2 py-1.5 text-gray-500">{b.interval}</td>
              <td className="px-2 py-1.5">
                <span className="rounded border border-green-200 bg-green-100 px-1.5 py-0.5 text-[8px] font-medium text-green-800">
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
    { name: "Main Job", type: "Paycheck", amount: "$2,400", interval: "Biweekly", color: "bg-green-100 text-green-700" },
    { name: "SSDI", type: "Disability", amount: "$950", interval: "Monthly", color: "bg-purple-100 text-purple-700" },
    { name: "Side Work", type: "Freelance", amount: "$500", interval: "Monthly", color: "bg-blue-100 text-blue-700" },
  ];

  const total = 2400 + 950 + 500;

  return (
    <div className="space-y-2 text-[10px]">
      {/* Total banner */}
      <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span className="font-semibold text-green-800">Total Monthly Income</span>
        </div>
        <span className="font-bold text-green-700 text-sm">${total.toLocaleString()}</span>
      </div>

      {/* Source rows */}
      {sources.map((s) => (
        <div
          key={s.name}
          className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-2.5 py-2"
        >
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${s.color}`}>
              {s.type}
            </span>
            <div>
              <div className="font-semibold text-gray-800">{s.name}</div>
              <div className="text-gray-400">{s.interval}</div>
            </div>
          </div>
          <div className="font-bold text-gray-800 tabular-nums">{s.amount}</div>
        </div>
      ))}
    </div>
  );
}
