import { escapeHtml } from "@/lib/report-export";

export type ScoreKind = "health" | "relocation";

const DONUT_COLORS = ["#1a6b7c", "#2d9cdb", "#7eb8c9", "#c9a227", "#2d6a4f", "#8b5cf6"];

export function scoreBandLabel(score: number, kind: ScoreKind = "health") {
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Reasonable";
  return kind === "relocation" ? "Unaffordable" : "Unhealthy";
}

export function scoreBandTone(score: number) {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 50) return "reasonable";
  return "poor";
}

export function factorBarTone(score: number) {
  if (score >= 80) return "good";
  if (score >= 50) return "mid";
  return "low";
}

export function buildScoreHeroHtml(
  score: number,
  scoreName: string,
  kind: ScoreKind = "health",
  summary?: string
) {
  const band = scoreBandLabel(score, kind);
  const tone = scoreBandTone(score);
  return `
    <div class="score-hero score-hero-${tone}">
      <div class="score-hero-main">
        <div class="score-hero-value">${score}</div>
        <div class="score-hero-band">${escapeHtml(band)}</div>
        <div class="score-hero-name">${escapeHtml(scoreName)}</div>
        ${summary ? `<p class="score-hero-summary">${escapeHtml(summary)}</p>` : ""}
      </div>
    </div>`;
}

export function buildFactorScorecardHtml(
  label: string,
  score: number,
  weight?: number
) {
  const tone = factorBarTone(score);
  const labelInside = score >= 25 ? `${score}` : "";
  return `
    <article class="factor-scorecard factor-scorecard-${tone}">
      <div class="factor-scorecard-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${score}/100${weight ? ` · ${weight}% weight` : ""}</span>
      </div>
      <div class="factor-bar-track">
        <div class="factor-bar-fill factor-bar-fill-${tone}" style="width:${Math.max(4, score)}%">
          ${labelInside ? `<span class="factor-bar-label">${labelInside}</span>` : ""}
        </div>
      </div>
    </article>`;
}

export function buildDonutChartHtml(
  items: { label: string; value: number; symbol?: string }[],
  formatValue: (value: number) => string
) {
  if (!items.length) return "";

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const size = 160;
  const radius = 58;
  const stroke = 22;
  const center = size / 2;
  let offset = 0;

  const segments = items.map((item, index) => {
    const pct = item.value / total;
    const dash = pct * 2 * Math.PI * radius;
    const gap = 2 * Math.PI * radius;
    const color = DONUT_COLORS[index % DONUT_COLORS.length];
    const segment = `
      <circle
        cx="${center}" cy="${center}" r="${radius}"
        fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 ${center} ${center})"
      />`;
    offset += dash;
    return segment;
  });

  const legend = items
    .map(
      (item, index) => `
      <div class="donut-legend-item">
        <span class="donut-swatch" style="background:${DONUT_COLORS[index % DONUT_COLORS.length]}"></span>
        <span>${item.symbol ?? ""} ${escapeHtml(item.label)}</span>
        <strong>${formatValue(item.value)} · ${((item.value / total) * 100).toFixed(1)}%</strong>
      </div>`
    )
    .join("");

  return `
    <div class="donut-chart-wrap">
      <svg class="donut-chart" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#eef4f6" stroke-width="${stroke}" />
        ${segments.join("")}
        <text x="${center}" y="${center - 4}" text-anchor="middle" class="donut-center-label">Top ${items.length}</text>
        <text x="${center}" y="${center + 14}" text-anchor="middle" class="donut-center-value">${formatValue(total)}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

export function buildRadarChartSvg(
  axes: { label: string; value: number }[],
  maxValue = 100
) {
  if (axes.length < 3) return "";

  const size = 200;
  const center = size / 2;
  const radius = 72;
  const levels = 4;
  const angleStep = (Math.PI * 2) / axes.length;

  const gridLines = Array.from({ length: levels }, (_, level) => {
    const r = (radius * (level + 1)) / levels;
    const points = axes
      .map((_, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return `<polygon points="${points}" fill="none" stroke="#e8eef0" stroke-width="1" />`;
  }).join("");

  const spokes = axes
    .map((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return `<line x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e8eef0" stroke-width="1" />`;
    })
    .join("");

  const dataPoints = axes
    .map((axis, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const r = (Math.min(maxValue, Math.max(0, axis.value)) / maxValue) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const labels = axes
    .map((axis, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = center + (radius + 16) * Math.cos(angle);
      const y = center + (radius + 16) * Math.sin(angle);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="radar-label">${escapeHtml(axis.label)}</text>`;
    })
    .join("");

  return `
    <svg class="radar-chart" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      ${gridLines}
      ${spokes}
      <polygon points="${dataPoints}" fill="rgba(26,107,124,0.18)" stroke="#1a6b7c" stroke-width="2" />
      ${labels}
    </svg>`;
}

export function buildRoundedBarChartHtml(
  items: { label: string; value: number; symbol?: string }[],
  formatValue: (value: number) => string
) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return items
    .map((item) => {
      const width = Math.round((item.value / max) * 100);
      const inside = width >= 28 ? formatValue(item.value) : "";
      return `
      <div class="rounded-bar-row">
        <span class="rounded-bar-label">${item.symbol ?? ""} ${escapeHtml(item.label)}</span>
        <div class="rounded-bar-track">
          <div class="rounded-bar-fill" style="width:${width}%">${inside ? `<span>${inside}</span>` : ""}</div>
        </div>
        <strong class="rounded-bar-value">${formatValue(item.value)}</strong>
      </div>`;
    })
    .join("");
}

export function buildVerticalBarChartHtml(
  items: { label: string; value: number; sublabel?: string }[],
  formatValue: (value: number) => string
) {
  if (!items.length) {
    return `<p class="muted-note">No expense merchants recorded for this period.</p>`;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  const bars = items
    .map((item) => {
      const heightPct = Math.max(10, Math.round((item.value / max) * 100));
      const shortLabel =
        item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label;
      return `
      <div class="vbar-item">
        <div class="vbar-amount">${formatValue(item.value)}</div>
        <div class="vbar-track">
          <div class="vbar-fill" style="height:${heightPct}%"></div>
        </div>
        <div class="vbar-label" title="${escapeHtml(item.label)}">${escapeHtml(shortLabel)}</div>
        ${item.sublabel ? `<div class="vbar-sublabel">${escapeHtml(item.sublabel)}</div>` : ""}
      </div>`;
    })
    .join("");

  return `<div class="vertical-bar-chart">${bars}</div>`;
}

export function buildVerticalRankChartHtml(
  items: { label: string; value: number; sublabel?: string }[]
) {
  if (!items.length) {
    return `<p class="muted-note">No expense merchants recorded for this period.</p>`;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  const bars = items
    .map((item, index) => {
      const heightPct = Math.max(10, Math.round((item.value / max) * 100));
      const shortLabel =
        item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label;
      return `
      <div class="vbar-item">
        <div class="vbar-amount">#${index + 1}</div>
        <div class="vbar-track">
          <div class="vbar-fill" style="height:${heightPct}%"></div>
        </div>
        <div class="vbar-label" title="${escapeHtml(item.label)}">${escapeHtml(shortLabel)}</div>
        ${item.sublabel ? `<div class="vbar-sublabel">${escapeHtml(item.sublabel)}</div>` : ""}
      </div>`;
    })
    .join("");

  return `<div class="vertical-bar-chart vertical-rank-chart">${bars}</div>`;
}

export function buildKpiStripHtml(
  items: { label: string; value: string; tone?: string }[],
  compact = false
) {
  return `
    <div class="kpi-strip${compact ? " kpi-strip-compact" : ""}">
      ${items
        .map(
          (item) => `
        <div class="kpi-box kpi-box-${item.tone ?? "neutral"}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${item.value}</strong>
        </div>`
        )
        .join("")}
    </div>`;
}

export function buildReportIntroBlock(
  periodLabel: string,
  displayCurrency: string,
  privacyNotice: string,
  shortNote?: string
) {
  return `
    <div class="report-intro-block">
      <div class="privacy-banner privacy-banner-once">${escapeHtml(privacyNotice)}</div>
      <p class="report-meta-line"><strong>Period:</strong> ${escapeHtml(periodLabel)} · <strong>Currency:</strong> ${escapeHtml(displayCurrency)}</p>
      ${shortNote ? `<p class="report-intro-note">${escapeHtml(shortNote)}</p>` : ""}
    </div>`;
}

export function computeRelocationOverviewScores(aff: {
  scenarioIncomeDisplay: number;
  displayReferenceCost: number;
  projectedBalance: number;
}) {
  const incomeVsCost = Math.round(
    Math.min(
      100,
      Math.max(0, (aff.scenarioIncomeDisplay / Math.max(aff.displayReferenceCost, 1)) * 100)
    )
  );
  const balanceOutlook =
    aff.projectedBalance >= 0
      ? Math.min(
          100,
          85 +
            Math.round((aff.projectedBalance / Math.max(aff.displayReferenceCost, 1)) * 15)
        )
      : Math.round(
          Math.max(
            0,
            50 + (aff.projectedBalance / Math.max(aff.scenarioIncomeDisplay, 1)) * 100
          )
        );
  const savingsRateFit = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        (aff.projectedBalance / Math.max(aff.scenarioIncomeDisplay, 1)) * 100 + 50
      )
    )
  );
  const heroScore = Math.round((incomeVsCost + balanceOutlook + savingsRateFit) / 3);

  return { incomeVsCost, balanceOutlook, savingsRateFit, heroScore };
}
