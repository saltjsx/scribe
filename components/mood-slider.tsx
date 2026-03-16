"use client";

import { useRef, useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

function sliderColor(value: number): string {
  // Red (1) → Orange (3) → Yellow (5) → Light green (7) → Green (10)
  if (value <= 2) return "#ff3b30";
  if (value <= 4) return "#ff9500";
  if (value <= 5) return "#ffcc00";
  if (value <= 7) return "#34c759";
  return "#00c853";
}

function moodEmoji(value: number): string {
  if (value <= 2) return "😞";
  if (value <= 4) return "😕";
  if (value <= 5) return "😐";
  if (value <= 7) return "🙂";
  if (value <= 9) return "😊";
  return "🤩";
}

export default function MoodSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastScoreRef = useRef(value);
  const haptic = useWebHaptics();

  const handleInteraction = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const score = Math.round(pct * 9 + 1); // 1–10
      if (score !== lastScoreRef.current) {
        haptic.trigger("selection");
        lastScoreRef.current = score;
      }
      onChange(score);
    },
    [onChange, haptic]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleInteraction(e.clientX);
    },
    [handleInteraction]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 0) return;
      handleInteraction(e.clientX);
    },
    [handleInteraction]
  );

  const pct = ((value - 1) / 9) * 100;
  const color = sliderColor(value);

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Emoji */}
      <span className="text-[28px] leading-none shrink-0 w-[36px] text-center">
        {moodEmoji(value)}
      </span>

      {/* Track */}
      <div className="flex-1 flex flex-col gap-2">
        <div
          ref={trackRef}
          className="relative h-[8px] rounded-full cursor-pointer"
          style={{
            background: "linear-gradient(to right, #ff3b30, #ff9500, #ffcc00, #34c759, #00c853)",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-[22px] w-[22px] rounded-full border-[3px] border-white shadow-md transition-left duration-75"
            style={{
              left: `${pct}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* Score */}
      <div
        className="shrink-0 text-[24px] font-bold tabular-nums w-[48px] text-center leading-none"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
