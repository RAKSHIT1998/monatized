"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export type BarChartDatum = { label: string; value: number };

function roundedTopRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height);
  if (height <= 0) return "";
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}

function niceMax(value: number) {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Reads the shared chart ramp from globals.css rather than a hardcoded hue,
// so the charts belong to the same palette as the rest of the product. The
// token is already tuned per theme (deeper on paper, brighter on ink).
const BAR_FILL = "fill-[var(--chart-1)]";

export function BarChart({
  data,
  currency,
  height = 180,
  showValueLabels = false,
}: {
  data: BarChartDatum[];
  currency: string;
  height?: number;
  showValueLabels?: boolean;
}) {
  const formatValue = (value: number) => formatMoney(value, currency);
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const width = 600;
  const paddingLeft = 44;
  const paddingBottom = 24;
  const paddingTop = showValueLabels ? 20 : 8;
  const plotWidth = width - paddingLeft - 8;
  const plotHeight = height - paddingTop - paddingBottom;

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  const barGap = 4;
  const barWidth = Math.min(24, plotWidth / data.length - barGap);
  const step = plotWidth / data.length;

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {!showTable ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ height }}
            role="img"
            aria-label="Bar chart"
          >
            <title id={gradientId}>Bar chart</title>
            {ticks.map((tick) => {
              const y = paddingTop + plotHeight - (tick / max) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={paddingLeft}
                    x2={width}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-current text-[10px] text-muted-foreground"
                  >
                    {formatValue(tick)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const barHeight = max === 0 ? 0 : (d.value / max) * plotHeight;
              const x = paddingLeft + i * step + (step - barWidth) / 2;
              const y = paddingTop + plotHeight - barHeight;
              return (
                <g
                  key={d.label + i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-default"
                >
                  <rect
                    x={x}
                    y={paddingTop}
                    width={barWidth}
                    height={plotHeight}
                    fill="transparent"
                  />
                  <path d={roundedTopRectPath(x, y, barWidth, barHeight, 4)} className={BAR_FILL} />
                  {showValueLabels && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      className="fill-current text-[10px] font-medium text-foreground"
                    >
                      {formatValue(d.value)}
                    </text>
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={height - 8}
                    textAnchor="middle"
                    className={cn(
                      "fill-current text-[10px]",
                      hoveredIndex === i ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredIndex !== null && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
              style={{
                left: `${((paddingLeft + hoveredIndex * step + step / 2) / width) * 100}%`,
              }}
            >
              <span className="font-medium">{data[hoveredIndex].label}</span>
              {": "}
              {formatValue(data[hoveredIndex].value)}
            </div>
          )}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 font-normal">Label</th>
              <th className="py-1 font-normal">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b last:border-0">
                <td className="py-1">{d.label}</td>
                <td className="py-1 tabular-nums">{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {showTable ? "View as chart" : "View as table"}
      </button>
    </div>
  );
}
