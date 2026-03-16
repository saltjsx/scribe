"use client";

import { useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from "recharts";
import type { Entry } from "@/lib/entries";

function moodColor(score: number): string {
  if (score >= 9) return "#1a5fa6";
  if (score >= 8) return "#2574bc";
  if (score >= 7) return "#3489d2";
  if (score >= 6) return "#4a9ede";
  if (score >= 5) return "#6bb2e6";
  if (score >= 4) return "#8cc5ed";
  if (score >= 3) return "#a8d1f0";
  return "#c8e1f6";
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; mood: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { date, mood } = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface)] backdrop-blur-sm px-2.5 py-1.5 shadow-sm">
      <p className="text-[11px] text-[var(--muted)]">{date}</p>
      <p className="text-[13px] font-medium" style={{ color: moodColor(mood) }}>
        {mood}/10
      </p>
    </div>
  );
}

export default function MoodChart({ entries }: { entries: Entry[] }) {
  // Sort entries by date (oldest first) and build chart data
  const data = useMemo(() => {
    if (entries.length === 0) return [];
    return [...entries]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((e) => ({
        date: e.dateShort,
        mood: e.mood,
      }));
  }, [entries]);

  const renderGradientLine = useCallback(() => {
    if (data.length === 0) return null;
    const stops = data.map((d, i) => ({
      offset: `${(i / Math.max(data.length - 1, 1)) * 100}%`,
      color: moodColor(d.mood),
    }));
    return (
      <defs>
        <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          {stops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
    );
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="w-full h-[140px] flex items-center justify-center text-[13px] text-[var(--muted)]">
        No mood data yet
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          {renderGradientLine()}
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="url(#moodGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "white" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
