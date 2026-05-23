import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Logo } from "~/components/layout/logo";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <Logo size="lg" className="justify-center" />
        <p className="mt-2 text-sm text-muted-foreground">
          Funnel your income with absolute precision.
        </p>
      </div>
      <div className="w-full max-w-md bg-card rounded-2xl shadow-md border border-border p-8 glass-card">
        <Outlet />
      </div>
    </div>
  );
}
