import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "~/auth/client";
import { getSession } from "~/server/middleware";
import { seedDemoData, regenerateUserOccurrences } from "~/server/fn/admin";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

type UserWithRole = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: Date;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  user: "User",
  demo: "Demo",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  user: "bg-secondary text-foreground/80",
  demo: "bg-accent/10 text-accent",
};

function AdminPage() {
  const queryClient = useQueryClient();

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => authClient.admin.listUsers({ query: { limit: 100 } }),
  });

  const users: UserWithRole[] = (usersData?.data?.users ?? []) as UserWithRole[];
  const demoUser = users.find((u) => u.role === "demo");

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">
          Admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users and application settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Users list */}
        <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold font-heading text-foreground">Users</h2>
          </div>
          <div className="divide-y divide-border">
            {usersLoading && (
              <div className="px-5 py-6 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Loading users…</span>
              </div>
            )}
            {usersError && (
              <div className="px-5 py-4 text-sm text-destructive">
                Failed to load users.
              </div>
            )}
            {!usersLoading &&
              users.map((user) => (
                <div key={user.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RegenerateOccurrencesButton userId={user.id} />
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        ROLE_COLORS[user.role ?? "user"] ?? ROLE_COLORS.user,
                      ].join(" ")}
                    >
                      {ROLE_LABELS[user.role ?? "user"] ?? user.role}
                    </span>
                    {user.role === "demo" && (
                      <SeedDemoButton
                        userId={user.id}
                        onSuccess={() =>
                          queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
            {!usersLoading && users.length === 0 && (
              <div className="px-5 py-4 text-sm text-muted-foreground">No users found.</div>
            )}
          </div>
        </section>

        {/* Create user form */}
        <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold font-heading text-foreground">Create User</h2>
          </div>
          <div className="px-5 py-4">
            <CreateUserForm
              onSuccess={() =>
                queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
              }
            />
          </div>
        </section>
      </div>

      {/* Demo account info */}
      <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-bold font-heading text-foreground">Demo Account</h2>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-muted-foreground">
          {demoUser ? (
            <p>
              Demo account is active:{" "}
              <span className="font-medium text-foreground">{demoUser.email}</span>.
              Visitors can sign in with{" "}
              <span className="font-mono text-foreground">demo@demo.com</span> /{" "}
              <span className="font-mono text-foreground">demo</span>.
            </p>
          ) : (
            <p>
              No demo account found. Create a user with the{" "}
              <span className="font-semibold text-foreground">Demo</span> role and email{" "}
              <span className="font-mono">demo@demo.com</span>, password{" "}
              <span className="font-mono">demo</span>, then click{" "}
              <span className="font-semibold text-foreground">Seed Data</span> on that user.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SeedDemoButton({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSeed() {
    setStatus("loading");
    try {
      await seedDemoData({ data: { userId } });
      setStatus("success");
      onSuccess();
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (status === "success") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Seeded
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }

  return (
    <button
      onClick={handleSeed}
      disabled={status === "loading"}
      className="text-xs rounded-md border border-border px-2 py-1 text-foreground/70 hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
    >
      {status === "loading" ? (
        <span className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Seeding…
        </span>
      ) : (
        "Seed Data"
      )}
    </button>
  );
}

function RegenerateOccurrencesButton({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegenerate() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const result = await regenerateUserOccurrences({ data: { userId } });
      if (!result?.success) {
        throw new Error("Regeneration did not complete successfully.");
      }
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to regenerate occurrences.";
      setErrorMessage(message);
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 6000);
    }
  }

  if (status === "success") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Regenerated
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive" title={errorMessage ?? undefined}>
        <AlertCircle className="h-3 w-3" /> Failed{errorMessage ? `: ${errorMessage}` : ""}
      </span>
    );
  }

  return (
    <button
      onClick={handleRegenerate}
      disabled={status === "loading"}
      className="text-xs rounded-md border border-border px-2 py-1 text-foreground/70 hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
    >
      {status === "loading" ? (
        <span className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Regenerating…
        </span>
      ) : (
        "Regen Occurrences"
      )}
    </button>
  );
}

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "demo" | "admin">("user");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      const result = await authClient.admin.createUser({
        name,
        email,
        password,
        // Better Auth accepts any string role; TS types only know "user"|"admin" by default
        role: role as "user" | "admin",
      });

      if (result.error) {
        setFeedback({ type: "error", message: result.error.message ?? "Failed to create user." });
      } else {
        setFeedback({ type: "success", message: `User "${name}" created successfully.` });
        setName("");
        setEmail("");
        setPassword("");
        setRole("user");
        onSuccess();
      }
    } catch {
      setFeedback({ type: "error", message: "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {feedback && (
        <div
          className={[
            "rounded-md px-3 py-2 text-sm flex items-center gap-2",
            feedback.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-700"
              : "bg-destructive/10 border border-destructive/20 text-destructive",
          ].join(" ")}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-foreground/90 mb-1">Full name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground/90 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          placeholder="jane@example.com"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground/90 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground/90 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "demo" | "admin")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
        >
          <option value="user">User</option>
          <option value="demo">Demo</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-xs hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </span>
        ) : (
          "Create user"
        )}
      </button>
    </form>
  );
}
