import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground font-heading">Fether</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tether every dollar to your goals
        </p>
      </div>
      <div className="w-full max-w-md bg-card rounded-xl shadow-sm border border-border p-8">
        <Outlet />
      </div>
    </div>
  );
}
