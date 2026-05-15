interface TrackerHeaderRowProps {
  columns: Array<{ label: string; dateStr: string }>;
}

export function TrackerHeaderRow({ columns }: TrackerHeaderRowProps) {
  return (
    <div className="sticky top-0 z-10 flex border-b bg-background shadow-sm">
      {/* Row label column */}
      <div className="flex w-64 flex-shrink-0 items-center border-r bg-background px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bill / Income
        </span>
      </div>

      {/* Date columns */}
      <div className="flex flex-1 overflow-x-auto">
        {columns.map((col) => (
          <div
            key={col.dateStr}
            className="flex min-w-24 flex-shrink-0 items-center justify-center border-r px-2 py-2 last:border-r-0"
          >
            <span className="text-center text-xs font-medium text-muted-foreground">
              {col.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
