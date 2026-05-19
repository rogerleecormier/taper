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
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your account preferences</p>

      <div className="space-y-6">
        {/* Profile card */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <User className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
              <p className="text-sm font-semibold text-gray-900">
                {session?.user?.name ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
              <p className="text-sm font-semibold text-gray-900">
                {session?.user?.email ?? "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Payday card */}
        <PaydayCard />

        {/* Budget Tracker Defaults card */}
        <TrackerDefaultsCard />

        {/* Default categories card */}
        <DefaultCategoriesCard />

        {/* Change password card */}
        <ChangePasswordCard />
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
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setPaydayInterval(prefs.paydayInterval);
    setAnchorDate(prefs.paydayAnchorDate ?? "");
  }, [prefs.paydayInterval, prefs.paydayAnchorDate]);

  const hasChanges =
    paydayInterval !== prefs.paydayInterval ||
    (anchorDate || null) !== prefs.paydayAnchorDate;

  async function handleSave() {
    setSaveState("idle");
    try {
      await update.mutateAsync({
        paydayInterval,
        paydayAnchorDate: anchorDate || null,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <Wallet className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Payday Settings</h2>
      </div>
      <div className="px-5 py-4 space-y-5">
        <p className="text-sm text-gray-500">
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
              {v === "weekly" ? "Weekly" : "Biweekly (every 2 weeks)"}
            </PrefButton>
          ))}
        </PrefRow>

        <div className="flex items-start gap-4">
          <span className="w-36 flex-shrink-0 pt-1 text-sm font-medium text-gray-700">Most Recent Payday</span>
          <div className="space-y-1">
            <input
              type="date"
              value={anchorDate}
              max={toDateStr(new Date())}
              onChange={(e) => {
                setAnchorDate(e.target.value);
                setSaveState("idle");
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">Pick a date you were actually paid — all pay periods are calculated from this anchor.</p>
          </div>
        </div>

        <div className="pt-1">
          {saveState === "saved" && (
            <p className="mb-2 text-sm text-green-700">Payday settings saved.</p>
          )}
          {saveState === "error" && (
            <p className="mb-2 text-sm text-red-700">Couldn&apos;t save. Please try again.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={update.isPending || !hasChanges}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <CalendarDays className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Budget Tracker Defaults</h2>
      </div>
      <div className="px-5 py-4 space-y-5">
        <p className="text-sm text-gray-500">
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
            <p className="mb-2 text-sm text-green-700">Tracker defaults saved.</p>
          )}
          {saveState === "error" && (
            <p className="mb-2 text-sm text-red-700">Couldn&apos;t save tracker defaults. Please try again.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={update.isPending || !hasChanges}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <div className="flex items-center gap-4">
      <span className="w-36 flex-shrink-0 text-sm font-medium text-gray-700">{label}</span>
      <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
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
        "rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
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
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <Tag className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Default Categories</h2>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-gray-500">
          Add the standard set of expense and income categories (Housing, Utilities, Groceries, Auto, Insurance, and more). Any categories you've already created or renamed won't be affected, and no duplicates will be added.
        </p>

        {inserted !== null && inserted > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Added {inserted} default categor{inserted === 1 ? "y" : "ies"}.
          </div>
        )}

        {inserted === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            All default categories are already present.
          </div>
        )}

        {seed.isError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Something went wrong. Please try again.
          </div>
        )}

        <button
          onClick={handleSeed}
          disabled={seed.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <KeyRound className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {status === "success" && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Password changed successfully.
          </div>
        )}

        {(status === "error" || errorMsg) && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
