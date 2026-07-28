"use client";

type Axis = { label: string; value: number };

export function RadarChart({
  axes,
  maxValue = 100,
}: {
  axes: Axis[];
  maxValue?: number;
}) {
  if (axes.length < 3) return null;

  const size = 220;
  const center = size / 2;
  const radius = 78;
  const levels = 4;
  const angleStep = (Math.PI * 2) / axes.length;

  const gridPolygons = Array.from({ length: levels }, (_, level) => {
    const r = (radius * (level + 1)) / levels;
    const points = axes
      .map((_, index) => {
        const angle = index * angleStep - Math.PI / 2;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(" ");
    return (
      <polygon
        key={`grid-${level}`}
        points={points}
        fill="none"
        stroke="#e8eef0"
        strokeWidth={1}
      />
    );
  });

  const spokes = axes.map((_, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return (
      <line
        key={`spoke-${index}`}
        x1={center}
        y1={center}
        x2={x}
        y2={y}
        stroke="#e8eef0"
        strokeWidth={1}
      />
    );
  });

  const dataPoints = axes
    .map((axis, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const r = (Math.min(maxValue, Math.max(0, axis.value)) / maxValue) * radius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(" ");

  const labels = axes.map((axis, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + (radius + 18) * Math.cos(angle);
    const y = center + (radius + 18) * Math.sin(angle);
    return (
      <text
        key={axis.label}
        x={x}
        y={y}
        textAnchor="middle"
        className="radar-ui-label"
      >
        {axis.label}
      </text>
    );
  });

  return (
    <div className="radar-chart-ui">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {gridPolygons}
        {spokes}
        <polygon
          points={dataPoints}
          fill="rgba(26,107,124,0.16)"
          stroke="#1a6b7c"
          strokeWidth={2}
        />
        {labels}
      </svg>
    </div>
  );
}
