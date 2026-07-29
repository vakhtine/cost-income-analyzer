"use client";

import { formatCategoryDisplayName } from "@/lib/category-icons";

const COLORS = ["#1a6b7c", "#2d9cdb", "#7eb8c9", "#c9a227", "#2d6a4f", "#8b5cf6"];

type Item = { name: string; value: number; merchants?: string[] };

export function DonutChart({
  data,
  formatValue,
  layout = "stacked",
  compact = false,
}: {
  data: Item[];
  formatValue: (value: number) => string;
  layout?: "stacked" | "side";
  compact?: boolean;
}) {
  if (!data.length) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const size = compact ? 200 : layout === "stacked" ? 280 : 180;
  const radius = compact ? 88 : layout === "stacked" ? 108 : 64;
  const stroke = compact ? 34 : layout === "stacked" ? 38 : 24;
  const center = size / 2;
  let offset = 0;

  return (
    <div className={`donut-chart-ui ${layout === "stacked" ? "donut-chart-ui-stacked" : ""}${compact ? " donut-chart-ui-compact" : ""}`}>
      <div className="donut-chart-ui-ring">
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#eef4f6"
            strokeWidth={stroke}
          />
          {data.map((item, index) => {
            const pct = item.value / total;
            const dash = pct * 2 * Math.PI * radius;
            const gap = 2 * Math.PI * radius;
            const segment = (
              <circle
                key={item.name}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${center} ${center})`}
              />
            );
            offset += dash;
            return segment;
          })}
          <text x={center} y={center - 4} textAnchor="middle" className="donut-ui-label">
            Top {data.length}
          </text>
          <text x={center} y={center + 20} textAnchor="middle" className="donut-ui-value">
            {formatValue(total)}
          </text>
        </svg>
      </div>
      <div className="donut-chart-ui-legend">
        {data.map((item, index) => (
          <div key={item.name} className="donut-chart-ui-legend-row">
            <span
              className="donut-chart-ui-swatch"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="donut-chart-ui-legend-label">
              <span>{formatCategoryDisplayName(item.name)}</span>
              {item.merchants && item.merchants.length > 0 ? (
                <span className="category-top-merchants">{item.merchants.join(" · ")}</span>
              ) : null}
            </span>
            <strong>
              {formatValue(item.value)} · {((item.value / total) * 100).toFixed(1)}%
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
