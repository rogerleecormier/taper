import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TrackerContainer } from "~/components/tracker/tracker-container";

const trackerSearchSchema = z.object({
  interval: z
    .enum(["daily", "weekly", "biweekly", "monthly"])
    .default("monthly"),
  periodStart: z.string().optional(),
});

export const Route = createFileRoute("/_app/tracker")({
  validateSearch: trackerSearchSchema,
  component: TrackerPage,
});

function TrackerPage() {
  const { interval, periodStart } = Route.useSearch();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kanban Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track bill payments across your budget period
        </p>
      </div>

      <TrackerContainer interval={interval} periodStart={periodStart} />
    </div>
  );
}
