import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "~/auth/client";
import { KeyRound, User, CheckCircle2, AlertCircle, Tag, CalendarDays, Wallet } from "lucide-react";
import { useSeedDefaultCategories } from "~/hooks/use-categories";
import { usePreferences, useUpdatePreferences, DEFAULT_PREFS, type UserPreferences } from "~/hooks/use-preferences";
import { toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = authClient.useSession();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column — Account */}
        <div className="space-y-6">
          {/* Profile card */}
          <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold font-heading text-foreground">Profile</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Name</p>
                <p className="text-sm font-semibold text-foreground">
                  {session?.user?.name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-semibold text-foreground">
                  {session?.user?.email ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Change password card */}
          <ChangePasswordCard />
        </div>

        {/* Right column — Preferences */}
        <div className="space-y-6">
          {/* Payday card */}
          <PaydayCard />

          {/* Budget Tracker Defaults card */}
          <TrackerDefaultsCard />

          {/* Default categories card */}
          <DefaultCategoriesCard />
        </div>
      </div>
    </div>
  );
}

function PaydayCard() {
  const { data: prefsData } = usePreferences();
  const prefs: UserPreferences = prefsData ?? DEFAULT_PREFS;
  const update = useUpdatePreferences();
  const [paydayInterval, setPaydayInterval] = useState<"weekly" | "biweekly">(prefs.paydayInterval);
  const [anchorDate, setAnchorDate] = useState<string>(prefs.paydayAnchorDate ?? "");
  const [dashboardPeriodMode, setDashboardPeriodMode] = useState<"month" | "pay_period">(prefs.dashboardPeriodMode);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setPaydayInterval(prefs.paydayInterval);
    setAnchorDate(prefs.paydayAnchorDate ?? "");
    setDashboardPeriodMode(prefs.dashboardPeriodMode);
  }, [prefs.paydayInterval, prefs.paydayAnchorDate, prefs.dashboardPeriodMode]);

  const hasChanges =
    paydayInterval !== prefs.paydayInterval ||
    (anchorDate || null) !== prefs.paydayAnchorDate ||
    dashboardPeriodMode !== prefs.dashboardPeriodMode;

  async function handleSave() {
    setSaveState("idle");
    try {
      await update.mutateAsync({
        paydayInterval,
        paydayAnchorDate: anchorDate || null,
        dashboardPeriodMode,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold font-heading text-foreground">Payday Settings</h2>
      </div>
      <div className="px-5 py-4 space-y-5">
        <p className="text-sm text-muted-foreground">
          Set your pay schedule so the budget tracker can align to your pay periods. Once configured, select "Pay Period" in the tracker interval selector.
        </p>

        <PrefRow label="Pay Frequency">
          {(["weekly", "biweekly"] as const).map((v) => (
            <PrefButton
              key={v}
              active={paydayInterval === v}
              onClick={() => {
                setPaydayInterval(v);
                setSaveState("idle");
              }}
            >
              {v === "weekly" ? "Weekly" : "Biweekly"}
            </PrefButton>
          ))}
        </PrefRow>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <span className="w-36 flex-shrink-0 pt-1 text-sm font-semibold text-foreground/90">Most Recent Payday</span>
          <div className="space-y-1.5 flex-1">
            <input
              type="date"
              value={anchorDate}
              max={toDateStr(new Date())}
              onChange={(e) => {
                setAnchorDate(e.target.value);
                setSaveState("idle");
              }}
              className="rounded-md border border-input bg-card text-foreground px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Pick a date you were actually paid — all pay periods are calculated from this anchor.</p>
          </div>
        </div>

        <PrefRow label="Dashboard Period">
          {(["month", "pay_period"] as const).map((v) => (
            <PrefButton
              key={v}
              active={dashboardPeriodMode === v}
              onClick={() => {
                setDashboardPeriodMode(v);
                setSaveState("idle");
              }}
            >
              {v === "month" ? "Month" : "Pay Period"}
            </PrefButton>
          ))}
        </PrefRow>

        <div className="pt-1">
          {saveState === "saved" && (
            <p className="mb-2 text-sm text-success font-semibold">Payday settings saved.</p>
          )}
          {saveState === "error" && (
            <p className="mb-2 text-sm text-destructive font-semibold">Couldn&apos;t save. Please try again.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={update.isPending || !hasChanges}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {update.isPending ? "Saving…" : "Save payday settings"}
          </button>
        </div>
      </div>
    </section>
  );
}

function TrackerDefaultsCard() {
  const { data: prefsData } = usePreferences();
  const prefs: UserPreferences = prefsData ?? DEFAULT_PREFS;
  const update = useUpdatePreferences();
  const [draft, setDraft] = useState<UserPreferences>(prefs);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setDraft(prefs);
  }, [prefsData]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasChanges =
    draft.trackerDefaultMode !== prefs.trackerDefaultMode ||
    draft.trackerDefaultScope !== prefs.trackerDefaultScope ||
    draft.trackerDefaultMonthInterval !== prefs.trackerDefaultMonthInterval ||
    draft.trackerDefaultYearInterval !== prefs.trackerDefaultYearInterval;

  async function handleSave() {
    setSaveState("idle");
    try {
      await update.mutateAsync(draft);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold font-heading text-foreground">Budget Tracker Defaults</h2>
      </div>
      <div className="px-5 py-4 space-y-5">
        <p className="text-sm text-muted-foreground">
          Choose which view and period the Budget Tracker opens to by default. Changes apply the next time you open the tracker.
        </p>

        <PrefRow label="Default View">
          {(["board", "list"] as const).map((v) => (
            <PrefButton
              key={v}
              active={draft.trackerDefaultMode === v}
              onClick={() => {
                setDraft((prev) => ({ ...prev, trackerDefaultMode: v }));
                setSaveState("idle");
              }}
            >
              {v === "board" ? "Board View" : "List View"}
            </PrefButton>
          ))}
        </PrefRow>

        <PrefRow label="Default Scope">
          {(["month", "year"] as const).map((v) => (
            <PrefButton
              key={v}
              active={draft.trackerDefaultScope === v}
              onClick={() => {
                setDraft((prev) => ({ ...prev, trackerDefaultScope: v }));
                setSaveState("idle");
              }}
            >
              {v === "month" ? "Month" : "Year"}
            </PrefButton>
          ))}
        </PrefRow>

        <PrefRow label="Month Interval">
          {(
            [
              { value: "day", label: "Days" },
              { value: "week", label: "Weeks" },
              { value: "biweek", label: "Biweeks" },
              { value: "month", label: "Month" },
              { value: "pay-period", label: "Pay Period" },
            ] as const
          ).map(({ value, label }) => (
            <PrefButton
              key={value}
              active={draft.trackerDefaultMonthInterval === value}
              onClick={() => {
                setDraft((prev) => ({ ...prev, trackerDefaultMonthInterval: value }));
                setSaveState("idle");
              }}
            >
              {label}
            </PrefButton>
          ))}
        </PrefRow>

        <PrefRow label="Year Interval">
          {(
            [
              { value: "month", label: "Months" },
              { value: "quarter", label: "3 Months" },
              { value: "half", label: "6 Months" },
              { value: "year", label: "Year" },
            ] as const
          ).map(({ value, label }) => (
            <PrefButton
              key={value}
              active={draft.trackerDefaultYearInterval === value}
              onClick={() => {
                setDraft((prev) => ({ ...prev, trackerDefaultYearInterval: value }));
                setSaveState("idle");
              }}
            >
              {label}
            </PrefButton>
          ))}
        </PrefRow>

        <div className="pt-1">
          {saveState === "saved" && (
            <p className="mb-2 text-sm text-success font-semibold">Tracker defaults saved.</p>
          )}
          {saveState === "error" && (
            <p className="mb-2 text-sm text-destructive font-semibold">Couldn&apos;t save tracker defaults. Please try again.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={update.isPending || !hasChanges}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {update.isPending ? "Saving…" : "Save defaults"}
          </button>
        </div>
      </div>
    </section>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <span className="w-36 flex-shrink-0 text-sm font-semibold text-foreground/90">{label}</span>
      <div className="inline-flex flex-wrap rounded-md border border-border bg-muted p-0.5 gap-0.5">
        {children}
      </div>
    </div>
  );
}

function PrefButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
        active
          ? "bg-card text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function DefaultCategoriesCard() {
  const seed = useSeedDefaultCategories();
  const [inserted, setInserted] = useState<number | null>(null);

  async function handleSeed() {
    setInserted(null);
    const result = await seed.mutateAsync();
    setInserted(result.inserted);
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold font-heading text-foreground">Default Categories</h2>
      </div>
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Add the standard set of expense and income categories (Housing, Utilities, Groceries, Auto, Insurance, and more). Any categories you've already created or renamed won't be affected, and no duplicates will be added.
        </p>

        {inserted !== null && inserted > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2.5 text-sm text-success font-semibold">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Added {inserted} default categor{inserted === 1 ? "y" : "ies"}.
          </div>
        )}

        {inserted === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-muted-foreground font-medium">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            All default categories are already present.
          </div>
        )}

        {seed.isError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive font-semibold">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Something went wrong. Please try again.
          </div>
        )}

        <button
          onClick={handleSeed}
          disabled={seed.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {seed.isPending ? "Adding…" : "Add default categories"}
        </button>
      </div>
    </section>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (next !== confirm) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    if (next.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }

    setStatus("loading");
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setErrorMsg(result.error.message ?? "Failed to change password.");
        setStatus("error");
      } else {
        setStatus("success");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold font-heading text-foreground">Change Password</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {status === "success" && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2.5 text-sm text-success font-semibold">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Password changed successfully.
          </div>
        )}

        {(status === "error" || errorMsg) && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive font-semibold">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <Field
          id="current"
          label="Current password"
          type="password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <Field
          id="new"
          label="New password"
          type="password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          hint="Minimum 8 characters"
        />
        <Field
          id="confirm"
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        <div className="pt-1">
          <button
            type="submit"
            disabled={status === "loading" || !current || !next || !confirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {status === "loading" ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground/90 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-xs placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
