import { escapeHtml } from "@/lib/report-export";
import { formatHealthScore } from "@/lib/health-score";
import { REPORT_CHART_COLORS, REPORT_THEME } from "@/lib/report-theme";

export type ScoreKind = "health" | "relocation";

const DONUT_COLORS = [...REPORT_CHART_COLORS, "#8b5cf6"];

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

export function buildScoreStampHtml(score: number, kind: ScoreKind = "health") {
  const band = scoreBandLabel(score, kind);
  const tone = scoreBandTone(score);
  const displayScore = kind === "health" ? formatHealthScore(score) : Math.round(score);
  return `
    <div class="score-stamp score-stamp-${tone}">
      <div class="score-stamp-value">${displayScore}</div>
      <div class="score-stamp-band">${escapeHtml(band)}</div>
    </div>`;
}

export function buildScoreHeroHtml(
  score: number,
  scoreName: string,
  kind: ScoreKind = "health",
  summary?: string
) {
  const tone = scoreBandTone(score);
  return `
    <div class="score-hero score-hero-${tone}">
      <div class="score-hero-main">
        ${buildScoreStampHtml(score, kind)}
        <div class="score-hero-name">${escapeHtml(scoreName)}</div>
        ${summary ? `<p class="score-hero-summary">${escapeHtml(summary)}</p>` : ""}
      </div>
    </div>`;
}

export function buildFactorScorecardHtml(
  label: string,
  score: number,
  weight?: number,
  note?: string
) {
  const tone = factorBarTone(score);
  const labelInside = score >= 25 ? `${score}` : "";
  return `
    <article class="factor-scorecard factor-scorecard-${tone}">
      <div class="factor-scorecard-head">
        <div class="factor-scorecard-title">
          <strong>${escapeHtml(label)}</strong>
          ${note ? `<span class="factor-scorecard-note">${escapeHtml(note)}</span>` : ""}
        </div>
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
  items: { label: string; value: number; symbol?: string; sharePct?: number }[],
  formatValue: (value: number) => string,
  options?: {
    tight?: boolean;
    embedded?: boolean;
    stacked?: boolean;
    shareDenominator?: number;
    centerTitle?: string;
    shareLabel?: string;
  }
) {
  if (!items.length) return "";

  const embedded = options?.embedded ?? false;
  const tight = options?.tight ?? false;
  const stacked = options?.stacked ?? false;
  const sliceTotal = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const shareDenominator = options?.shareDenominator ?? sliceTotal;
  const centerTitle = options?.centerTitle ?? `Top ${items.length}`;
  const shareLabel = options?.shareLabel ?? "of expenses";
  const size = stacked ? 176 : embedded ? 248 : tight ? 200 : 210;
  const radius = stacked ? 62 : embedded ? 88 : tight ? 72 : 76;
  const stroke = stacked ? 24 : embedded ? 30 : tight ? 26 : 28;
  const center = size / 2;
  let offset = 0;

  const segments = items.map((item, index) => {
    const pct = item.value / sliceTotal;
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

  const legendRows = items
    .map(
      (item, index) => {
        const sharePct =
          item.sharePct ?? (shareDenominator ? (item.value / shareDenominator) * 100 : 0);
        return `
      <div class="donut-legend-row">
        <span class="donut-swatch" style="background:${DONUT_COLORS[index % DONUT_COLORS.length]}"></span>
        <span class="donut-legend-name">${item.symbol ? `<span class="donut-symbol-badge">${item.symbol}</span>` : ""}${escapeHtml(item.label)}</span>
        <div class="donut-legend-stat">
          <span class="donut-stat-amount">${formatValue(item.value)}</span>
          <span class="donut-stat-sep">·</span>
          <span class="donut-stat-pct">${sharePct.toFixed(1)}%${shareLabel ? ` ${escapeHtml(shareLabel)}` : ""}</span>
        </div>
      </div>`;
      }
    )
    .join("");

  return `
    <div class="donut-chart-wrap${stacked ? " donut-chart-wrap-stacked" : embedded ? " donut-chart-wrap-embedded" : tight ? " donut-chart-wrap-tight" : ""}">
      <div class="donut-ring">
        <svg class="donut-chart" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#eef4f6" stroke-width="${stroke}" />
          ${segments.join("")}
        </svg>
        <div class="donut-center-copy">
          <span class="donut-center-label">${escapeHtml(centerTitle)}</span>
          <strong class="donut-center-value">${escapeHtml(formatValue(shareDenominator))}</strong>
        </div>
      </div>
      <div class="donut-legend-panel">${legendRows}</div>
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
      <polygon points="${dataPoints}" fill="rgba(44,110,142,0.18)" stroke="${REPORT_THEME.adriatic}" stroke-width="2" />
      ${labels}
    </svg>`;
}

export function buildHorizontalGapBarChartSvg(
  items: { label: string; value: number }[],
  formatValue: (value: number) => string,
  options?: { trackWidth?: number; barHeight?: number; labelWidth?: number }
) {
  if (!items.length) return "";

  const trackWidth = options?.trackWidth ?? 280;
  const barHeight = options?.barHeight ?? 18;
  const labelWidth = options?.labelWidth ?? 148;
  const valueWidth = 72;
  const rowGap = 10;
  const rowHeight = barHeight + rowGap + 10;
  const chartWidth = labelWidth + trackWidth + valueWidth + 16;
  const height = items.length * rowHeight + 8;
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  const primary = REPORT_THEME.adriatic;
  const secondary = REPORT_THEME.adriaticLight;

  const rows = items
    .map((item, index) => {
      const y = index * rowHeight + 6;
      const fillWidth = Math.max(2, Math.round((Math.abs(item.value) / max) * trackWidth));
      const textY = y + barHeight / 2 + 4;
      return `
      <text x="0" y="${textY}" class="gap-bar-label">${escapeHtml(item.label)}</text>
      <rect x="${labelWidth}" y="${y}" width="${trackWidth}" height="${barHeight}" rx="${barHeight / 2}" fill="#f1f5f7" />
      <rect x="${labelWidth}" y="${y}" width="${fillWidth}" height="${barHeight}" rx="${barHeight / 2}" fill="url(#gapBarGradient)" />
      <text x="${labelWidth + trackWidth + 8}" y="${textY}" class="gap-bar-value">${escapeHtml(formatValue(item.value))}</text>`;
    })
    .join("");

  return `
    <svg class="gap-bar-chart" width="${chartWidth}" height="${height}" viewBox="0 0 ${chartWidth} ${height}" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="gapBarGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      ${rows}
    </svg>`;
}

export function buildRoundedBarChartHtml(
  items: { label: string; value: number; symbol?: string }[],
  formatValue: (value: number) => string,
  options?: { trackWidthPx?: number }
) {
  if (!items.length) return "";

  const trackWidthPx = options?.trackWidthPx ?? 260;
  const max = Math.max(...items.map((item) => item.value), 1);
  return items
    .map((item) => {
      const fillPx = Math.max(2, Math.round((item.value / max) * trackWidthPx));
      const inside = fillPx >= trackWidthPx * 0.28 ? formatValue(item.value) : "";
      return `
      <div class="rounded-bar-row">
        <span class="rounded-bar-label">${item.symbol ?? ""} ${escapeHtml(item.label)}</span>
        <div class="rounded-bar-track" style="width:${trackWidthPx}px">
          <div class="rounded-bar-fill" style="width:${fillPx}px">${inside ? `<span>${inside}</span>` : ""}</div>
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
  items: { label: string; value: number; sublabel?: string }[],
  options?: { rankStart?: number; formatValue?: (value: number) => string }
) {
  if (!items.length) {
    return `<p class="muted-note">No expense merchants recorded for this period.</p>`;
  }

  const rankStart = options?.rankStart ?? 1;
  const formatValue = options?.formatValue;
  const max = Math.max(...items.map((item) => item.value), 1);
  const bars = items
    .map((item, index) => {
      const heightPct = Math.max(10, Math.round((item.value / max) * 100));
      const shortLabel =
        item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label;
      const rank = rankStart + index;
      const amountLine = formatValue
        ? `<div class="vbar-amount">${escapeHtml(formatValue(item.value))}</div><div class="vbar-rank">#${rank}</div>`
        : `<div class="vbar-amount">#${rank}</div>`;
      return `
      <div class="vbar-item">
        ${amountLine}
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
  items: {
    label: string;
    value: string;
    tone?: string;
    index?: number;
    formula?: string;
  }[],
  options?: { compact?: boolean; className?: string }
) {
  const extraClass = options?.className ?? "";
  return `
    <div class="kpi-strip${options?.compact ? " kpi-strip-compact" : ""}${extraClass ? ` ${extraClass}` : ""}">
      ${items
        .map(
          (item) => `
        <div class="kpi-box kpi-box-${item.tone ?? "neutral"}">
          ${item.index !== undefined ? `<span class="kpi-box-index">${item.index}</span>` : ""}
          <span class="kpi-box-label">${escapeHtml(item.label)}</span>
          <strong>${item.value}</strong>
          ${item.formula ? `<em class="kpi-box-formula">${escapeHtml(item.formula)}</em>` : ""}
        </div>`
        )
        .join("")}
    </div>`;
}

export function buildHealthReportPeriodMetaHtml(
  periodLabel: string,
  displayCurrency: string,
  extraMeta?: { label: string; value: string }[]
) {
  const extraChips = (extraMeta ?? [])
    .map(
      (item) =>
        `<span class="report-meta-chip"><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.value)}</span>`
    )
    .join("");
  return `
    <div class="report-meta-highlight health-report-period-meta">
      <span class="report-meta-chip"><strong>Period</strong> ${escapeHtml(periodLabel)}</span>
      <span class="report-meta-chip"><strong>Currency</strong> ${escapeHtml(displayCurrency)}</span>
      ${extraChips}
    </div>`;
}

export function buildRelocationReportMetaChips(payload: {
  householdSize: number;
  lifestyleLabel?: string;
  incomeChangePct: number;
}) {
  const lifestyleLabel = payload.lifestyleLabel?.trim() || "Average";
  const householdSize = payload.householdSize > 0 ? payload.householdSize : 1;
  const chips: { label: string; value: string }[] = [
    {
      label: "Lifestyle",
      value: `${householdSize}-person ${lifestyleLabel.toLowerCase()}`,
    },
  ];
  if (payload.incomeChangePct !== 0) {
    chips.push({
      label: "Income scenario",
      value: `${payload.incomeChangePct >= 0 ? "+" : ""}${payload.incomeChangePct}%`,
    });
  }
  return chips;
}

export function buildRelocationPageHeaderHtml(
  periodLabel: string,
  displayCurrency: string,
  payload: {
    householdSize: number;
    lifestyleLabel?: string;
    incomeChangePct: number;
  },
  options?: {
    privacyNotice?: string;
    showPrivacyBanner?: boolean;
    overviewSubtitle?: string;
  }
) {
  const metaChips = buildRelocationReportMetaChips(payload);
  if (options?.showPrivacyBanner && options.privacyNotice) {
    return buildReportIntroBlock(
      periodLabel,
      displayCurrency,
      options.privacyNotice,
      options.overviewSubtitle,
      metaChips
    );
  }

  const overviewClass = options?.overviewSubtitle ? " relocation-page-header-overview" : "";
  const headerMeta = buildHealthReportPeriodMetaHtml(periodLabel, displayCurrency, metaChips);
  const subtitle = options?.overviewSubtitle
    ? `<p class="report-intro-note report-intro-note-compact">${escapeHtml(options.overviewSubtitle)}</p>`
    : "";

  return `<div class="relocation-page-header${overviewClass}">${headerMeta}${subtitle}</div>`;
}

export function buildReportIntroBlock(
  periodLabel: string,
  displayCurrency: string,
  privacyNotice: string,
  shortNote?: string,
  extraMeta?: { label: string; value: string }[]
) {
  const extraChips = (extraMeta ?? [])
    .map(
      (item) =>
        `<span class="report-meta-chip"><strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.value)}</span>`
    )
    .join("");
  return `
    <div class="report-intro-block">
      <div class="privacy-banner privacy-banner-once privacy-banner-prominent">${escapeHtml(privacyNotice)}</div>
      <div class="report-meta-highlight">
        <span class="report-meta-chip"><strong>Period</strong> ${escapeHtml(periodLabel)}</span>
        <span class="report-meta-chip"><strong>Currency</strong> ${escapeHtml(displayCurrency)}</span>
        ${extraChips}
      </div>
      ${shortNote ? `<p class="report-intro-note">${escapeHtml(shortNote)}</p>` : ""}
    </div>`;
}

export function computeRelocationOverviewScores(aff: {
  score: number;
  savingsRateScore: number;
  incomeStabilityScore: number;
  nonEssentialScore: number;
}) {
  return {
    heroScore: aff.score,
    savingsRateScore: aff.savingsRateScore,
    incomeStabilityScore: aff.incomeStabilityScore,
    nonEssentialScore: aff.nonEssentialScore,
  };
}
