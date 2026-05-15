"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useStore } from "@tanstack/react-store";
import {
  trackerStore,
  setTrackerInterval,
  setTrackerPeriodStart,
  setTrackerRowOrder,
} from "~/store/tracker-store";
import { useTrackerData } from "~/hooks/use-tracker";
import { getTrackerColumns } from "~/lib/dates";
import { useReorderBills } from "~/hooks/use-bills";
import { useReorderIncomeSources } from "~/hooks/use-income";
import type { TrackerInterval } from "~/lib/dates";
import { TrackerToolbar } from "./tracker-toolbar";
import { TrackerHeaderRow } from "./tracker-header-row";
import { TrackerVirtualList } from "./tracker-virtual-list";
import { TrackerRow } from "./tracker-row";

interface TrackerContainerProps {
  interval: TrackerInterval;
  periodStart: Date;
}

export function TrackerContainer({ interval, periodStart }: TrackerContainerProps) {
  const { rows, billOccurrenceMap, incomeOccurrenceMap, isLoading } =
    useTrackerData(interval, periodStart);

  const columns = getTrackerColumns(interval, periodStart);

  const reorderBills = useReorderBills();
  const reorderIncomeSources = useReorderIncomeSources();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rows, oldIndex, newIndex);
    const newOrder = reordered.map((r) => r.id);
    setTrackerRowOrder(newOrder);

    // Separate bill and income IDs in order
    const billIds = reordered
      .filter((r) => r.type === "bill")
      .map((r) => r.id.split(":")[1]);
    const incomeIds = reordered
      .filter((r) => r.type === "income")
      .map((r) => r.id.split(":")[1]);

    if (billIds.length > 0) {
      reorderBills.mutate(billIds);
    }
    if (incomeIds.length > 0) {
      reorderIncomeSources.mutate(incomeIds);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading tracker...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TrackerToolbar
        interval={interval}
        periodStart={periodStart}
        onIntervalChange={setTrackerInterval}
        onPeriodChange={setTrackerPeriodStart}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky header */}
        <TrackerHeaderRow columns={columns} />

        {/* Sortable virtual list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                No bills or income sources. Add some to get started.
              </div>
            ) : (
              <TrackerVirtualList
                rows={rows}
                renderRow={(row) => (
                  <TrackerRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    billOccurrenceMap={billOccurrenceMap}
                    incomeOccurrenceMap={incomeOccurrenceMap}
                  />
                )}
              />
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
