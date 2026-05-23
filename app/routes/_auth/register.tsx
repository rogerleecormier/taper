import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold font-heading text-foreground mb-6">
        Signups are disabled
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        New account registration is not available. Please sign in with an
        existing account, or use the demo account to explore the app.
      </p>
      <Link
        to="/login"
        className="block w-full text-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-xs hover:bg-primary/95 transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  );
}
