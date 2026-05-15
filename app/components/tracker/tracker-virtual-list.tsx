import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TrackerRow } from "~/hooks/use-tracker";

interface TrackerVirtualListProps {
  rows: TrackerRow[];
  renderRow: (row: TrackerRow, index: number) => React.ReactNode;
}

const ROW_HEIGHT = 56;
const OVERSCAN = 5;

export function TrackerVirtualList({ rows, renderRow }: TrackerVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{ contain: "strict" }}
    >
      <div style={{ height: totalSize, position: "relative", width: "100%" }}>
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(row, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
