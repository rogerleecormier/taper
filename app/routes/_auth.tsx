import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Zero Dollar Budget</h1>
        <p className="mt-1 text-sm text-gray-500">
          Take control of every dollar
        </p>
      </div>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <Outlet />
      </div>
    </div>
  );
}
