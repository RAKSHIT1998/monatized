"use client";

import { useId, useState } from "react";
import { formatMoney } from "@/lib/money";

export type SparklinePoint = { label: string; value: number };
// A discriminated, serializable format spec — NOT a function. This is a
// Client Component; a Server Component caller can't pass it a closure
// (functions aren't serializable across the RSC boundary except Server
// Actions) — this crashed at runtime the first time around.
export type SparklineFormat = { type: "money"; currency: string } | { type: "count" };

// Sequential blue (dataviz skill palette) — same accent as BarChart. The line
// itself stays in the de-emphasis (muted) hue; only the current period's
// segment and end-dot carry the accent, per the skill's stat-tile contract.
const ACCENT_STROKE = "stroke-[#2a78d6] dark:stroke-[#3987e5]";
const ACCENT_FILL = "fill-[#2a78d6] dark:fill-[#3987e5]";

export function Sparkline({
  data,
  format,
  width = 96,
  height = 28,
}: {
  data: SparklinePoint[];
  format: SparklineFormat;
  width?: number;
  height?: number;
}) {
  const clipId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const formatValue = (value: number) =>
    format.type === "money" ? formatMoney(value, format.currency) : String(value);

  if (data.length < 2 || data.every((d) => d.value === 0)) {
    return null;
  }

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const padding = 3;
  const plotHeight = height - padding * 2;
  const step = width / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * step,
    y: padding + plotHeight - ((d.value - min) / range) * plotHeight,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const lastSegment = `M${points[points.length - 2].x},${points[points.length - 2].y} L${points[points.length - 1].x},${points[points.length - 1].y}`;
  const last = points[points.length - 1];

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Trend over the last ${data.length} days, ending at ${formatValue(data[data.length - 1].value)}`}
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relativeX = ((e.clientX - rect.left) / rect.width) * width;
          const index = Math.round(relativeX / step);
          setHoverIndex(Math.min(Math.max(index, 0), data.length - 1));
        }}
      >
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <path
            d={linePath}
            fill="none"
            className="stroke-muted-foreground/40"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={lastSegment}
            fill="none"
            className={ACCENT_STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* End-dot for the current period, with a surface-color ring so it stays legible over the line. */}
          <circle cx={last.x} cy={last.y} r={4} className="fill-background" />
          <circle cx={last.x} cy={last.y} r={2.5} className={ACCENT_FILL} />
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={0}
              y2={height}
              className="stroke-border"
              strokeWidth={1}
            />
          )}
        </g>
      </svg>

      {hovered && hoveredPoint && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded-md border bg-popover px-1.5 py-0.5 text-[10px] whitespace-nowrap text-popover-foreground shadow-md"
          style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
        >
          <span className="font-medium">{formatValue(hovered.value)}</span>{" "}
          <span className="text-muted-foreground">{hovered.label}</span>
        </div>
      )}
    </div>
  );
}
