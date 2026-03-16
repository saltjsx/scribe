"use client";

import { useMemo } from "react";
import type { Entry } from "@/lib/entries";

const GAP = 2;
const WEEKS = 52;
const DAYS = 7;

function getColor(count: number): string {
  if (count === 0) return "var(--contribution-0)";
  if (count === 1) return "var(--contribution-1)";
  if (count === 2) return "var(--contribution-2)";
  return "var(--contribution-3)";
}

export default function ContributionGraph({ entries }: { entries: Entry[] }) {
  const data = useMemo(() => {
    // Build a map of date string → entry count
    const countByDate = new Map<string, number>();
    for (const entry of entries) {
      // entry.id is like "2026-03-16" or "2026-03-16-timestamp"
      const dateKey = entry.id.slice(0, 10);
      countByDate.set(dateKey, (countByDate.get(dateKey) || 0) + 1);
    }

    // Build the grid: 52 weeks × 7 days, ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = WEEKS * 7;
    const grid: number[][] = [];

    for (let week = 0; week < WEEKS; week++) {
      const col: number[] = [];
      for (let day = 0; day < DAYS; day++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (totalDays - 1 - (week * 7 + day)));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        col.push(countByDate.get(key) || 0);
      }
      grid.push(col);
    }

    return grid;
  }, [entries]);

  const cellSize = 10;
  const graphWidth = WEEKS * (cellSize + GAP) - GAP;
  const graphHeight = DAYS * (cellSize + GAP) - GAP;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        className="block w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((week, wi) =>
          week.map((count, di) => (
            <rect
              key={`${wi}-${di}`}
              x={wi * (cellSize + GAP)}
              y={di * (cellSize + GAP)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(count)}
            />
          ))
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[10px] text-[var(--muted)] mr-0.5">Less</span>
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            className="rounded-[2px]"
            style={{
              width: 10,
              height: 10,
              backgroundColor: getColor(level),
            }}
          />
        ))}
        <span className="text-[10px] text-[var(--muted)] ml-0.5">More</span>
      </div>
    </div>
  );
}
