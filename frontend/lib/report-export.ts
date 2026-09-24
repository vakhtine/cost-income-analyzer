export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reportPreparedLine(
  generatedAt: string,
  periodLabel: string,
  displayCurrency: string
) {
  return `<p class="report-prepared">Report prepared on ${escapeHtml(generatedAt)} for period ${escapeHtml(periodLabel)}. All amounts in ${escapeHtml(displayCurrency)}.</p>`;
}

export const REPORT_BRAND_FOOTER_PATH = "/brand-pdf-footer.png";

export function reportAssetUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export const REPORT_PAGE_WIDTH_PX = 794;
export const REPORT_PAGE_HEIGHT_PX = 1123;

export const BASE_REPORT_STYLES = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  :root {
    --ink: #152838;
    --muted: #67707a;
    --line: #dccfaf;
    --paper: #f2ebda;
    --paper-raised: #fbf6ea;
    --primary-light: #efeada;
    --report-border: #213c4e;
    --primary: #2c6e8e;
    --primary-dark: #152838;
    --secondary: #5a9bb5;
    --danger: #b5573a;
    --good: #6e8f5c;
    --gold: #c89b3c;
    --rust: #b5573a;
    --adriatic: #2c6e8e;
    --sage: #6e8f5c;
    --home: #152838;
    --destination: #2c6e8e;
    --stripe: #fbf6ea;
    --font-display: "Fraunces", Georgia, "Times New Roman", serif;
    --font-mono: "IBM Plex Mono", Consolas, monospace;
    --font-sans: "Inter", "Segoe UI", Arial, sans-serif;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: ${REPORT_PAGE_WIDTH_PX}px;
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 12px;
    line-height: 1.4;
    background: var(--paper);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    position: relative;
    display: flex;
    flex-direction: column;
    width: ${REPORT_PAGE_WIDTH_PX}px;
    min-height: ${REPORT_PAGE_HEIGHT_PX}px;
    height: ${REPORT_PAGE_HEIGHT_PX}px;
    overflow: hidden;
    padding: 0 4px;
    page-break-after: always;
    break-after: page;
    background: var(--paper);
  }
  .page.page-auto-fit {
    overflow: visible;
    height: auto;
  }
  .page:last-child { page-break-after: auto; }
  .page-header {
    flex: 0 0 auto;
    border-bottom: 2px solid var(--adriatic);
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .page-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: visible;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
  .page-content-report-full {
    gap: 10px;
  }
  .page-content-report-full > * {
    width: 100%;
    max-width: 100%;
  }
  .page-content-spread {
    justify-content: space-between;
  }
  .page-content-spread > * {
    flex: 0 0 auto;
  }
  .page-content-spread > .expenses-category-page,
  .page-content-spread > .health-report-page,
  .page-content-spread > .relocation-overview-shell,
  .page-content-spread > .relocation-overview-page,
  .page-content-spread > .relocation-fit-composite-page,
  .page-content-spread > .relocation-story-box-large {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .report-brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--ink);
    font-weight: 700;
  }
  .report-brand-mark {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
  }
  .page-title,
  .main-title,
  .section-title,
  .report-kicker,
  h1, h2, h3 {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--primary-dark);
  }
  .page-title {
    margin: 0;
    font-size: 22px;
  }
  .page-subtitle {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--muted);
  }
  .main-title {
    margin: 0 0 8px;
    font-size: 18px;
  }
  .intro {
    margin: 0 0 12px;
    color: var(--muted);
    font-size: 11px;
    max-width: 100%;
  }
  .report-prepared {
    margin: 0 0 12px;
    color: var(--ink);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.45;
    max-width: 100%;
  }
  .section-explanation {
    margin: 0 0 12px;
    font-size: 11px;
    color: var(--ink);
    line-height: 1.45;
  }
  .section-explanation strong {
    color: var(--ink);
  }
  .score-ring-caption {
    margin: 8px 0 12px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
  }
  .city-context-grid {
    margin-bottom: 12px;
  }
  .currency-note {
    margin: 0 0 12px;
    color: var(--primary-dark);
    font-size: 11px;
    font-weight: 700;
  }
  .intro-emphasis {
    margin: 0 0 12px;
    color: var(--ink);
    font-size: 11px;
    line-height: 1.5;
    font-weight: 700;
    max-width: 100%;
  }
  .privacy-banner {
    margin: 0 0 14px;
    padding: 10px 12px 10px 28px;
    border: none;
    border-radius: 8px;
    background: var(--primary-light);
    color: var(--ink);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.45;
    position: relative;
  }
  .privacy-banner::before {
    content: "◆";
    position: absolute;
    left: 10px;
    top: 11px;
    color: var(--rust);
    font-size: 10px;
  }
  .divider {
    border: none;
    border-top: 2px solid var(--primary-light);
    margin: 0 0 14px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    margin-bottom: 16px;
    font-size: 11px;
  }
  .meta-grid span {
    display: block;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .page-header-compact {
    margin-bottom: 8px;
    padding-bottom: 6px;
  }
  .page-header-compact .page-title {
    font-size: 22px;
  }
  .report-intro-block {
    margin-bottom: 14px;
  }
  .report-meta-line {
    margin: 12px 0 0;
    font-size: 10px;
    color: var(--muted);
  }
  .report-intro-note {
    margin: 8px 0 0;
    font-size: 10px;
    color: var(--ink);
  }
  .report-intro-note-compact {
    margin: 4px 0 0;
  }
  .relocation-overview-shell {
    display: flex;
    flex-direction: column;
    gap: 0;
    flex: 1 1 auto;
    width: 100%;
  }
  .page:has(.page-content-relocation-overview),
  .page:has(.page-content-relocation),
  .page:has(.page-content-relocation-fit-composite) {
    padding: 0;
  }
  .page-content-relocation {
    gap: 10px;
    padding: 0;
  }
  .page-content-relocation > * {
    width: 100%;
    max-width: 100%;
  }
  .page-content-relocation-overview {
    padding: 0;
    gap: 10px;
    justify-content: stretch;
  }
  .relocation-overview-shell .relocation-overview-page {
    flex: 1 1 auto;
    min-height: 0;
  }
  .page-content-relocation-overview .relocation-page-header,
  .page-content-relocation-overview .relocation-scores-comparison-note {
    width: 100%;
  }
  .relocation-overview-page {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .relocation-page-header {
    margin-bottom: 0;
  }
  .relocation-page-header-overview {
    margin-bottom: 0;
  }
  .relocation-page-header-overview .health-report-period-meta {
    margin-bottom: 0;
  }
  .relocation-overview-page .relocation-overview-hero {
    min-height: auto;
    justify-content: flex-start;
    gap: 12px;
    margin-top: 0;
    width: 100%;
  }
  .relocation-overview-page .score-hero {
    width: 100%;
    padding: 14px 12px;
    grid-template-columns: minmax(168px, 200px) minmax(0, 1fr);
    gap: 14px;
  }
  .relocation-overview-page .score-hero-main {
    align-items: center;
    text-align: center;
    min-width: 0;
  }
  .relocation-overview-page .score-hero-summary {
    max-width: none;
  }
  .relocation-budget-margin-hero {
    margin-top: 0;
    grid-template-columns: minmax(168px, 200px) minmax(0, 1fr);
    gap: 14px;
    padding: 14px 12px;
    overflow: visible;
    flex: 0 0 auto;
    width: 100%;
  }
  .relocation-budget-margin-hero .score-hero-main {
    overflow: visible;
    min-width: 0;
  }
  .relocation-budget-margin-hero .score-stamp {
    width: 104px;
    height: 104px;
    flex-shrink: 0;
  }
  .relocation-budget-margin-hero .score-stamp-value {
    font-size: 34px;
  }
  .relocation-overview-page .score-hero-factors {
    gap: 12px;
  }
  .relocation-overview-page .score-hero .factor-scorecard {
    padding: 12px 14px;
  }
  .relocation-overview-page .score-hero .factor-bar-track {
    height: 16px;
  }
  .relocation-overview-page .score-hero .factor-scorecard-head strong {
    font-size: 11px;
  }
  .relocation-overview-page .score-hero .factor-scorecard-note {
    font-size: 8px;
    line-height: 1.35;
  }
  .relocation-fit-context-line {
    margin-top: 6px;
    font-size: 11px;
    color: var(--muted);
  }
  .relocation-scores-comparison-note {
    margin-bottom: 10px;
    font-size: 10px;
    line-height: 1.45;
  }
  .relocation-score-note {
    font-size: 10px;
    color: var(--muted);
  }
  .privacy-banner-once {
    margin-bottom: 18px;
    font-size: 10px;
    padding: 12px 14px;
  }
  .privacy-banner-prominent {
    margin-bottom: 20px;
    padding: 14px 16px 14px 32px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.5;
    border: 2px solid #d1d5db;
    background: #f3f4f6;
    color: var(--ink);
  }
  .privacy-banner-prominent::before {
    font-size: 12px;
    top: 14px;
    color: #6b7280;
  }
  .report-meta-highlight {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 8px;
  }
  .report-meta-chip {
    display: inline-block;
    padding: 8px 14px;
    border: 2px solid var(--primary-light);
    border-radius: 8px;
    background: var(--paper);
    font-size: 11px;
    color: var(--ink);
    font-weight: 600;
  }
  .report-meta-chip strong {
    display: inline;
    margin-right: 6px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .city-profile-compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .city-profile-card {
    position: relative;
  }
  .city-profile-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .city-profile-header .section-title {
    margin: 0;
    flex: 1;
  }
  .city-profile-flag {
    width: 40px;
    height: auto;
    border-radius: 4px;
    border: 1px solid var(--primary-light);
    flex-shrink: 0;
  }
  .relocation-story-group {
    margin: 0 0 14px;
  }
  .relocation-story-group-title {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #1a4d66;
    background: linear-gradient(90deg, rgba(44, 110, 142, 0.22) 0%, rgba(44, 110, 142, 0.05) 100%);
    border-left: 4px solid var(--adriatic);
    padding: 8px 12px;
    border-radius: 0 8px 8px 0;
  }
  .relocation-story-list {
    margin: 0;
    padding-left: 18px;
    font-size: 11px;
    line-height: 1.55;
  }
  .relocation-story-list li {
    margin-bottom: 6px;
  }
  .hero-zone {
    min-height: 320px;
    margin-bottom: 0;
    padding-bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    justify-content: space-around;
  }
  .hero-zone-compact {
    min-height: 300px;
    margin-bottom: 0;
    padding-bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    justify-content: space-around;
  }
  .details-section-flush {
    margin-bottom: 0;
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }
  .details-section-spread,
  .hero-zone-spread {
    flex: 1 1 auto;
    min-height: 0;
  }
  .hero-zone-spread {
    min-height: 340px;
  }
  .details-section-spread .report-table-card {
    margin-bottom: 0;
    overflow: visible;
  }
  .expenses-category-page {
    flex: 0 0 auto;
  }
  .expenses-category-page .report-table-card {
    flex: 0 0 auto;
    display: block;
    overflow: visible;
  }
  .expenses-summary-visuals {
    padding: 14px 16px 10px;
    border-top: 2px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 0 0 auto;
  }
  .expenses-summary-visuals .subsection-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .expenses-charts-duo {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
    min-width: 0;
  }
  .expenses-chart-panel {
    min-width: 0;
    overflow: hidden;
    padding: 12px 14px;
    border: 2px solid var(--report-border);
    border-radius: 12px;
    background: var(--paper-raised);
  }
  .expenses-chart-panel .subsection-title {
    margin-bottom: 8px;
  }
  .expenses-chart-panel .donut-chart-wrap-embedded,
  .expenses-chart-panel .donut-chart-wrap-stacked {
    margin: 0;
    width: 100%;
    max-width: 100%;
  }
  .page:has(.multi-period-report-page) {
    padding: 0;
  }
  .page-content-multi-period {
    gap: 6px;
    padding: 0;
  }
  .multi-period-report-page {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  .multi-period-report-page .kpi-strip-multi-period {
    margin-top: 0;
    margin-bottom: 2px;
  }
  .multi-period-report-page .report-table-card {
    width: 100%;
  }
  .multi-period-report-page .report-table-card .section-title {
    padding: 14px 12px 0;
    margin: 0 0 8px;
  }
  .multi-period-report-page .report-table-card .muted-note {
    padding: 0 12px 8px;
  }
  .multi-period-report-page .report-table-card-compact .section-title {
    padding: 12px 12px 0;
  }
  .multi-period-report-page .report-table-card-compact .muted-note {
    padding: 0 12px 8px;
  }
  .multi-period-report-page > .muted-note {
    padding: 0 2px;
    margin: 0;
  }
  .expenses-top5-table tbody tr td {
    padding: 10px 12px;
  }
  .category-label-with-symbol {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .category-pdf-symbol,
  .donut-symbol-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border-radius: 5px;
    border: 1.5px solid var(--adriatic);
    background: var(--primary-light);
    color: var(--ink);
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    font-size: 12px;
    font-weight: 400;
    line-height: 1;
    flex-shrink: 0;
  }
  .kpi-strip-expenses {
    gap: 10px;
    margin: 0;
  }
  .kpi-strip-expenses .kpi-box {
    padding: 10px 8px;
    border-radius: 10px;
  }
  .kpi-strip-expenses .kpi-box span {
    font-size: 8px;
    margin-bottom: 4px;
  }
  .kpi-strip-expenses .kpi-box strong {
    font-size: 16px;
  }
  .score-hero {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 28px;
    align-items: start;
    padding: 24px 26px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: var(--paper-raised);
    box-shadow: 0 8px 24px rgba(21, 40, 56, 0.08);
    margin-bottom: 0;
    flex: 1 1 auto;
  }
  .score-hero-excellent,
  .score-hero-good,
  .score-hero-reasonable,
  .score-hero-poor {
    background: var(--paper-raised);
    border-color: var(--line);
  }
  .score-hero-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .score-stamp {
    width: 118px;
    height: 118px;
    border-radius: 50%;
    border: 3px solid var(--rust);
    background: var(--paper-raised);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--rust);
    position: relative;
    transform: rotate(-4deg);
    margin: 0 auto 8px;
  }
  .score-stamp::before {
    content: "";
    position: absolute;
    inset: 6px;
    border: 1px dashed var(--rust);
    border-radius: 50%;
    opacity: 0.5;
  }
  .score-stamp-value {
    font-family: var(--font-display);
    font-size: 38px;
    font-weight: 700;
    line-height: 1;
    color: var(--rust);
  }
  .score-stamp-band {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    margin-top: 2px;
    color: var(--rust);
    text-transform: uppercase;
  }
  .score-hero-name {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }
  .score-hero-summary {
    margin: 10px 0 0;
    font-size: 10px;
    color: var(--ink);
    line-height: 1.45;
  }
  .score-hero-factors {
    display: grid;
    gap: 16px;
  }
  .score-hero-compact {
    grid-template-columns: 132px 1fr;
    gap: 12px;
    padding: 12px 14px;
    margin-bottom: 12px;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(21, 40, 56, 0.06);
  }
  .score-hero-compact .score-stamp {
    width: 92px;
    height: 92px;
  }
  .score-hero-compact .score-stamp-value {
    font-size: 30px;
  }
  .score-hero-compact .score-stamp-band {
    font-size: 8px;
  }
  .score-hero-compact .score-hero-name {
    margin-top: 4px;
    font-size: 9px;
  }
  .score-hero-compact .score-hero-summary {
    margin-top: 6px;
    font-size: 8px;
    line-height: 1.35;
  }
  .score-hero-compact .score-hero-factors {
    gap: 8px;
  }
  .score-hero-compact .factor-scorecard {
    padding: 8px 10px;
    border-radius: 10px;
  }
  .score-hero-compact .factor-scorecard-head {
    margin-bottom: 6px;
    font-size: 9px;
  }
  .score-hero-compact .factor-scorecard-head strong {
    font-size: 10px;
  }
  .score-hero-compact .factor-scorecard-note {
    font-size: 7px;
    line-height: 1.3;
  }
  .score-hero-compact .factor-scorecard-head > span {
    font-size: 8px;
  }
  .score-hero-compact .factor-bar-track {
    height: 12px;
  }
  .score-hero-compact .factor-bar-label {
    font-size: 8px;
  }
  .health-report-page {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    gap: 14px;
    justify-content: flex-start;
  }
  .health-metrics-for-you-compact .section-title {
    font-size: 14px;
    margin-bottom: 8px;
  }
  .health-report-score-block {
    flex: 0 0 auto;
  }
  .health-report-metrics-block {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .health-report-page-fit .health-report-metrics-block {
    flex: 1 1 auto;
  }
  .health-report-page-fit .health-report-metrics-block > .health-metrics-for-you {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .health-report-page-fit .health-metrics-for-you-spread .supporting-metrics-table-card {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .health-report-page-fit .supporting-metrics-table-card .index-table.report-table-styled {
    flex: 1 1 auto;
  }
  .health-report-page-fit .supporting-metrics-table tbody tr {
    height: 1%;
  }
  .health-report-page-fit .supporting-metrics-table th,
  .health-report-page-fit .supporting-metrics-table td {
    padding: 10px 14px;
    font-size: 11px;
    line-height: 1.5;
    vertical-align: top;
  }
  .health-report-page-fit .supporting-metrics-table td.supporting-metric-value {
    font-size: 11px;
  }
  .health-report-page-fit .supporting-metrics-table td.supporting-metric-definition {
    font-size: 10.5px;
  }
  .health-report-page-fit .supporting-metrics-table td strong {
    font-size: 11px;
  }
  .health-metrics-for-you-spread {
    flex: 0 0 auto;
    display: block;
    padding: 14px 16px 12px;
    margin-bottom: 0;
  }
  .health-metrics-for-you-spread .section-title {
    font-size: 15px;
    margin-bottom: 10px;
  }
  .health-metrics-for-you-spread .report-tip-list {
    font-size: 11px;
    line-height: 1.5;
    padding: 0 0 10px 20px;
    margin: 0;
  }
  .health-metrics-for-you-spread .report-tip-list li + li {
    margin-top: 6px;
  }
  .health-metrics-for-you-spread .supporting-metrics-table-card {
    margin-top: 8px;
    border-top: 2px solid var(--line);
    border-radius: 10px;
    overflow: visible;
  }
  .health-metrics-for-you-spread .supporting-metrics-table th,
  .health-metrics-for-you-spread .supporting-metrics-table td {
    padding: 8px 12px;
    font-size: 11px;
    line-height: 1.45;
  }
  .health-metrics-for-you-spread .subsection-title {
    font-size: 14px;
    margin-bottom: 8px;
  }
  .health-report-page .health-report-hero {
    margin-bottom: 8px;
  }
  .health-report-page .score-hero-compact {
    padding: 12px 14px;
    gap: 12px;
    grid-template-columns: 148px 1fr;
    margin-bottom: 0;
  }
  .health-report-page .score-hero-compact .score-stamp {
    width: 118px;
    height: 118px;
  }
  .health-report-page .score-hero-compact .score-stamp-value {
    font-size: 36px;
  }
  .health-report-page .score-hero-compact .score-stamp-band {
    font-size: 9px;
  }
  .health-report-page .health-metrics-for-you.health-metrics-for-you-spread {
    padding: 20px 22px;
    margin-bottom: 0;
  }
  .health-report-page .health-metrics-for-you.health-metrics-for-you-spread .supporting-metrics-table-card {
    margin: 16px 0 0;
    border-top: 2px solid var(--line);
    border-radius: 12px;
    overflow: visible;
  }
  .health-report-page .supporting-metrics-table-compact th,
  .health-report-page .supporting-metrics-table-compact td {
    padding: 6px 8px;
    font-size: 10px;
    line-height: 1.4;
  }
  .health-report-page .supporting-metrics-table-card .subsection-title {
    font-size: 14px;
    padding: 14px 16px 10px;
  }
  .health-report-page-fit {
    gap: 14px;
    flex: 1 1 auto;
    min-height: 0;
  }
  .health-report-page-fit .health-report-hero {
    margin-bottom: 0;
  }
  .health-report-page-fit .score-hero-compact {
    padding: 8px 10px;
    gap: 8px;
    grid-template-columns: 108px 1fr;
  }
  .health-report-page-fit .score-hero-compact .score-stamp {
    width: 92px;
    height: 92px;
  }
  .health-report-page-fit .score-hero-compact .score-stamp-value {
    font-size: 28px;
  }
  .health-report-page-fit .score-hero-compact .score-stamp-band {
    font-size: 8px;
  }
  .health-report-page-fit .score-hero-compact .score-hero-name {
    font-size: 11px;
    margin-bottom: 2px;
  }
  .health-report-page-fit .health-report-score-summary {
    display: none;
  }
  .health-report-page-fit .score-hero-factors-compact .factor-scorecard {
    padding: 7px 9px;
  }
  .health-report-page-fit .score-hero-factors-compact .factor-scorecard-head {
    margin-bottom: 5px;
  }
  .health-report-page-fit .score-hero-factors-compact .factor-scorecard-head strong {
    font-size: 10px;
  }
  .health-report-page-fit .score-hero-factors-compact .factor-scorecard-head > span {
    font-size: 8px;
  }
  .health-report-page-fit .score-hero-factors-compact .factor-bar-track {
    height: 14px;
  }
  .health-report-page-fit .score-hero-factors-compact .factor-bar-label {
    font-size: 9px;
  }
  .health-report-page-fit .health-metrics-for-you.health-metrics-for-you-spread {
    padding: 18px 20px 16px;
    flex: 1 1 auto;
  }
  .health-report-page-fit .health-metrics-for-you-spread .section-title {
    font-size: 16px;
    margin-bottom: 12px;
  }
  .health-report-page-fit .health-metrics-for-you-spread .report-tip-list {
    font-size: 11.5px;
    line-height: 1.55;
    padding: 0 0 16px 22px;
    margin: 0;
  }
  .health-report-page-fit .health-metrics-for-you-spread .report-tip-list li + li {
    margin-top: 8px;
  }
  .health-report-page-fit .health-metrics-for-you-spread .supporting-metrics-table-card,
  .health-report-page-fit .health-metrics-detail-page .supporting-metrics-table-card {
    margin-top: 12px;
    flex: 1 1 auto;
  }
  .health-report-page-fit .health-metrics-detail-page {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 12px 14px 10px;
    margin: 0;
  }
  .health-report-page-fit .health-metrics-detail-page .section-title {
    font-size: 13px;
    margin: 0 0 8px;
  }
  .health-report-page-fit .health-metrics-detail-page .report-tip-list {
    font-size: 9.5px;
    line-height: 1.4;
    padding: 0 0 8px 18px;
    margin: 0;
  }
  .health-report-page-fit .supporting-metrics-table-card .subsection-title {
    font-size: 15px;
    padding: 14px 16px 12px;
  }
  .health-report-page-hero {
    flex: 1 1 auto;
    justify-content: center;
  }
  .health-report-metrics-page {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .health-metrics-detail-page {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 16px 18px 14px;
    margin: 0;
  }
  .health-metrics-detail-page .section-title {
    font-size: 15px;
    margin: 0 0 10px;
  }
  .health-metrics-detail-page .report-tip-list {
    font-size: 10.5px;
    line-height: 1.45;
    padding: 0 0 12px 20px;
    margin: 0;
  }
  .health-metrics-detail-page .report-tip-list li + li {
    margin-top: 6px;
  }
  .health-metrics-detail-page .supporting-metrics-table-card {
    flex: 1 1 auto;
    margin: 0;
    display: flex;
    flex-direction: column;
  }
  .health-metrics-detail-page .subsection-title {
    font-size: 13px;
    padding: 10px 14px 8px;
    margin: 0;
  }
  .supporting-metrics-table-pdf th,
  .supporting-metrics-table-pdf td {
    padding: 5px 8px;
    font-size: 9px;
    line-height: 1.35;
    vertical-align: top;
  }
  .supporting-metrics-table-pdf td.supporting-metric-value {
    font-size: 9px;
    white-space: normal;
  }
  .supporting-metrics-table-pdf td.supporting-metric-definition {
    font-size: 8.5px;
    line-height: 1.35;
  }
  .supporting-metrics-table-pdf td strong {
    font-size: 9px;
  }
  .supporting-metrics-table-pdf th:nth-child(1) { width: 22%; }
  .supporting-metrics-table-pdf th:nth-child(2) { width: 28%; }
  .supporting-metrics-table-pdf th:nth-child(3) { width: 50%; }
  .relocation-budget-margin-hero .score-hero-main .score-hero-name {
    font-size: 11px;
    line-height: 1.35;
    max-width: none;
  }
  .relocation-budget-margin-hero .score-hero-main .score-hero-summary {
    font-size: 10px;
    line-height: 1.4;
    max-width: none;
  }
  .relocation-budget-margin-hero .relocation-score-note {
    font-size: 9px;
    line-height: 1.4;
    margin-top: 6px;
    max-width: none;
  }
  .kpi-strip-relocation-overview {
    gap: 10px;
    margin: 4px 0 0;
  }
  .kpi-strip-relocation-overview .kpi-box {
    padding: 10px 8px 12px;
    border-radius: 10px;
  }
  .kpi-strip-relocation-overview .kpi-box > span.kpi-box-label {
    font-size: 9px;
    padding: 4px 8px;
    margin-bottom: 6px;
    letter-spacing: 0.06em;
  }
  .kpi-strip-relocation-overview .kpi-box strong {
    font-size: 17px;
    line-height: 1.2;
  }
  .kpi-strip.kpi-strip-relocation-spending {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    flex: 0 0 auto;
  }
  .kpi-strip-relocation-spending .kpi-box {
    padding: 12px 6px 14px;
    border-radius: 10px;
    min-width: 0;
  }
  .kpi-strip-relocation-spending .kpi-box-index {
    top: 6px;
    right: 6px;
    font-size: 8px;
  }
  .kpi-strip-relocation-spending .kpi-box > span.kpi-box-label {
    display: block;
    width: fit-content;
    max-width: calc(100% - 14px);
    margin: 0 auto 6px;
    padding: 4px 6px;
    border-radius: 5px;
    border: 1px solid rgba(44, 110, 142, 0.32);
    background: linear-gradient(180deg, rgba(44, 110, 142, 0.18) 0%, rgba(44, 110, 142, 0.08) 100%);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1a4d66;
    line-height: 1.25;
    box-sizing: border-box;
  }
  .kpi-strip-relocation-spending .kpi-box strong {
    font-size: 14px;
    line-height: 1.15;
    word-break: break-word;
  }
  .kpi-strip-relocation-spending .kpi-box-formula {
    font-size: 7px;
    margin-top: 4px;
    line-height: 1.2;
  }
  .page-content-spending-vs-city {
    gap: 12px;
    padding: 0;
    flex: 1 1 auto;
    min-height: 0;
  }
  .page-content-spending-vs-city .relocation-story-box-large {
    padding: 18px 18px 16px;
    margin-bottom: 0;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .page-content-spending-vs-city .relocation-story-box-large .section-title {
    font-size: 16px;
    margin-bottom: 12px;
  }
  .page-content-spending-vs-city .relocation-story-group {
    margin: 0 0 12px;
    flex: 1 1 auto;
  }
  .page-content-spending-vs-city .relocation-story-group:last-child {
    margin-bottom: 0;
  }
  .page-content-spending-vs-city .relocation-story-group-title {
    font-size: 11px;
    padding: 7px 10px;
    margin-bottom: 6px;
  }
  .page-content-spending-vs-city .relocation-story-list {
    font-size: 11px;
    line-height: 1.5;
    padding-left: 16px;
  }
  .page-content-spending-vs-city .relocation-story-list li {
    margin-bottom: 5px;
  }
  .page-content-spending-vs-city .relocation-story-list li:last-child {
    margin-bottom: 0;
  }
  .relocation-overview-adj-section {
    margin-top: 0;
    width: 100%;
    flex: 1 1 0;
    min-height: 0;
    display: flex;
  }
  .relocation-overview-adj-section .relocation-adj-panel {
    margin-bottom: 0;
    padding: 18px 16px 16px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .page-content-relocation-adjustment {
    justify-content: stretch;
    min-height: 0;
    gap: 12px;
  }
  .page-content-relocation-adjustment .relocation-overview-page,
  .page-content-relocation-adjustment .relocation-adjustment-page {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    gap: 12px;
    min-height: 0;
  }
  .page-content-relocation-adjustment .relocation-adj-panel .section-title {
    font-size: 16px;
    margin-bottom: 4px;
  }
  .page-content-relocation-adjustment .relocation-adj-kicker {
    font-size: 10px;
    margin-bottom: 12px;
    letter-spacing: 0.05em;
  }
  .page-content-relocation-adjustment .relocation-adj-chart {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    margin-bottom: 8px;
    min-height: 0;
  }
  .page-content-relocation-adjustment .adj-row {
    grid-template-columns: 170px 1fr 88px;
    margin-bottom: 0;
    gap: 10px;
  }
  .page-content-relocation-adjustment .adj-label {
    font-size: 11px;
    line-height: 1.35;
  }
  .page-content-relocation-adjustment .adj-bar-wrap {
    height: 28px;
  }
  .page-content-relocation-adjustment .adj-value {
    font-size: 12px;
  }
  .page-content-relocation-adjustment .legend {
    margin: 8px 0 0;
    font-size: 11px;
  }
  .relocation-budget-margin-hero .score-hero-factors {
    gap: 10px;
  }
  .relocation-budget-margin-hero .factor-scorecard {
    padding: 10px 12px;
  }
  .relocation-budget-margin-hero .factor-bar-track {
    height: 15px;
  }
  .relocation-budget-margin-hero .relocation-fit-context-line {
    font-size: 11px;
  }
  .category-changes-table-large th,
  .category-changes-table-large td {
    padding: 10px 12px;
    font-size: 11px;
    line-height: 1.5;
  }
  .relocation-story-box-large {
    padding: 24px 26px;
    margin-bottom: 0;
    flex: 1 1 auto;
  }
  .relocation-story-box-large .section-title {
    font-size: 16px;
    margin-bottom: 14px;
  }
  .relocation-story-box-large .relocation-story-paragraph {
    font-size: 12.5px;
    line-height: 1.6;
    margin-bottom: 12px;
  }
  .page.report-page-break-before {
    page-break-before: always;
    break-before: page;
  }
  .report-section-compact {
    margin-bottom: 0;
    padding: 18px 20px;
    flex: 1 1 auto;
  }
  .health-metrics-for-you .report-tip-list {
    padding: 0 0 10px 22px;
    margin-bottom: 0;
  }
  .health-metrics-for-you .report-tip-list li + li {
    margin-top: 6px;
  }
  .report-tip-list-compact {
    padding: 0 0 8px 20px;
    font-size: 10px;
    line-height: 1.45;
  }
  .report-tip-list-compact li + li {
    margin-top: 4px;
  }
  .health-metrics-for-you.report-section-compact {
    padding: 10px 12px 0;
    margin-bottom: 0;
  }
  .supporting-metrics-table-compact th,
  .supporting-metrics-table-compact td {
    padding: 6px 8px;
    font-size: 10px;
    line-height: 1.4;
  }
  .supporting-metrics-table-compact td.supporting-metric-value {
    font-size: 10px;
    white-space: normal;
    line-height: 1.35;
  }
  .supporting-metrics-table-compact th:nth-child(3),
  .supporting-metrics-table-compact td.supporting-metric-definition {
    text-align: left;
    padding-left: 14px;
  }
  .supporting-metrics-table-compact td strong {
    font-size: 10px;
  }
  .vertical-rank-chart .vbar-amount {
    font-size: 10px;
    font-weight: 800;
    color: var(--primary);
    font-family: var(--font-mono);
  }
  .report-callout-compact {
    font-size: 10px;
    line-height: 1.45;
    margin: 8px 0;
  }
  .pp-index-chart-compact .pp-index-row {
    margin-bottom: 10px;
  }
  .pp-index-section .section-title {
    font-size: 15px;
  }
  .pp-index-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .page-content-relocation-fit-composite,
  .page-content:has(.relocation-fit-composite-page) {
    justify-content: stretch;
    gap: 8px;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  .relocation-fit-composite-page {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    gap: 8px;
    width: 100%;
    min-height: 0;
    overflow: hidden;
  }
  .relocation-fit-composite-page .composite-scores-report {
    flex: 0 1 auto;
    margin-bottom: 0;
    min-height: 0;
  }
  .relocation-fit-composite-page .pp-index-section-embedded {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin-top: 0;
    overflow: hidden;
  }
  .pp-index-section-embedded {
    margin-top: 0;
    padding: 6px 10px 5px;
    border-top: 1px solid var(--line);
    flex: 0 0 auto;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pp-index-section-embedded.report-section-compact {
    flex: 0 0 auto;
    padding: 6px 10px 5px;
  }
  .pp-index-section-embedded .report-kicker {
    font-size: 8px;
    margin-bottom: 1px;
    letter-spacing: 0.06em;
  }
  .pp-index-section-embedded .pp-index-section-title {
    font-size: 10px;
    margin-bottom: 3px;
    line-height: 1.25;
  }
  .pp-index-section-embedded .pp-index-chart-embedded {
    margin: 2px 0 1px;
  }
  .pp-index-section-embedded .pp-index-row {
    margin-bottom: 2px;
    gap: 5px;
    grid-template-columns: 68px 1fr 32px;
  }
  .pp-index-section-embedded .pp-index-label {
    font-size: 8px;
  }
  .pp-index-section-embedded .pp-index-bar-track {
    height: 7px;
  }
  .pp-index-section-embedded .pp-index-baseline {
    font-size: 6px;
    right: 4px;
  }
  .pp-index-section-embedded .pp-index-value {
    font-size: 8px;
  }
  .pp-index-section-embedded .pp-index-example-embedded {
    font-size: 7px;
    line-height: 1.28;
    margin: 2px 0 0;
    padding: 3px 5px;
  }
  .relocation-fit-composite-page .composite-scores-report.report-section-compact {
    padding-bottom: 8px;
  }
  .relocation-fit-composite-page .composite-weights-panel-report {
    margin-bottom: 6px;
  }
  .relocation-fit-composite-page .composite-gauge-grid-compact {
    gap: 10px;
    margin: 8px 0 10px;
  }
  .relocation-fit-composite-page .composite-card-grid-compact {
    gap: 10px;
    margin-bottom: 8px;
  }
  .relocation-fit-composite-page .pp-index-section-embedded.report-section-compact {
    flex: 1 1 auto;
    padding: 10px 12px 10px;
    min-height: 0;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .report-kicker {
    font-size: 9px;
    margin-bottom: 3px;
    letter-spacing: 0.07em;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-section-title {
    font-size: 13px;
    margin-bottom: 6px;
    line-height: 1.3;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-chart-embedded {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    margin: 4px 0 6px;
    min-height: 0;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-row {
    margin-bottom: 0;
    gap: 10px;
    grid-template-columns: 84px 1fr 44px;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-label {
    font-size: 11px;
    line-height: 1.25;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-bar-track {
    height: 20px;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-baseline {
    font-size: 8px;
    right: 8px;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-value {
    font-size: 12px;
  }
  .relocation-fit-composite-page .pp-index-section-embedded .pp-index-example-embedded {
    flex: 0 0 auto;
    font-size: 9px;
    line-height: 1.4;
    margin: 0;
    padding: 7px 9px;
  }
  .composite-scores-report {
    page-break-inside: avoid;
  }
  .composite-scores-report + .pp-index-section-embedded {
    border-top: none;
    margin-top: 0;
    padding-top: 4px;
  }
  .composite-gauge-grid-compact {
    gap: 14px;
    margin: 12px 0 14px;
  }
  .composite-gauge-report-compact {
    font-size: 9px;
  }
  .composite-card-grid-compact {
    gap: 14px;
    margin-bottom: 12px;
  }
  .composite-card-grid-compact .composite-city-card-report {
    padding: 14px 16px;
  }
  .composite-card-grid-compact .composite-city-score {
    font-size: 20px;
    margin: 4px 0;
  }
  .composite-card-grid-compact p {
    font-size: 8px;
    line-height: 1.35;
    margin: 0;
  }
  .subsection-title {
    margin: 0;
    padding: 12px 14px 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--primary-dark);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .supporting-metrics-table-card {
    margin: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid var(--report-border);
  }
  .supporting-metrics-table {
    border: 1px solid var(--report-border);
    border-radius: 0 0 12px 12px;
  }
  .supporting-metrics-table td.supporting-metric-value {
    white-space: nowrap;
    font-weight: 700;
    color: var(--primary-dark);
    font-family: var(--font-mono);
  }
  .supporting-metrics-table th:nth-child(3),
  .supporting-metrics-table td.supporting-metric-definition,
  .metric-definitions-table th:nth-child(3),
  .metric-definitions-table td.supporting-metric-definition {
    text-align: left;
    padding-left: 18px;
  }
  .vertical-bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 6px;
    min-height: 170px;
    padding: 12px 14px 10px;
    border-top: 1px solid var(--report-border);
  }
  .vbar-item {
    flex: 1;
    min-width: 0;
    max-width: 68px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .vbar-amount {
    font-size: 8px;
    font-weight: 700;
    color: var(--primary-dark);
    margin-bottom: 4px;
    line-height: 1.2;
    font-family: var(--font-mono);
  }
  .vbar-track {
    width: 100%;
    height: 110px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .vbar-fill {
    width: 72%;
    min-height: 6px;
    background: linear-gradient(180deg, var(--adriatic), var(--secondary));
    border-radius: 6px 6px 2px 2px;
  }
  .vbar-label {
    margin-top: 6px;
    font-size: 8px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.2;
    word-break: break-word;
  }
  .vbar-sublabel {
    margin-top: 2px;
    font-size: 7px;
    color: var(--muted);
    line-height: 1.2;
  }
  .report-table-card.report-section-spaced {
    margin-top: 0;
    margin-bottom: 14px;
  }
  .kpi-strip.kpi-strip-compact {
    margin-bottom: 0;
  }
  .factor-scorecard {
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--paper-raised);
    border: 1px solid var(--line);
    box-shadow: 0 4px 14px rgba(21, 40, 56, 0.06);
  }
  .factor-scorecard-good { border-color: rgba(110, 143, 92, 0.45); }
  .factor-scorecard-mid { border-color: rgba(200, 155, 60, 0.45); }
  .factor-scorecard-low { border-color: rgba(181, 87, 58, 0.45); }
  .factor-scorecard-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 11px;
  }
  .factor-scorecard-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .factor-scorecard-note {
    display: block;
    font-size: 8px;
    line-height: 1.35;
    font-weight: 400;
    color: var(--muted);
  }
  .factor-scorecard-head strong { color: var(--primary-dark); font-size: 12px; }
  .factor-scorecard-head > span { color: var(--muted); font-size: 10px; white-space: nowrap; flex-shrink: 0; }
  .factor-bar-track {
    height: 18px;
    background: #f1f5f7;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(28, 43, 51, 0.06);
  }
  .factor-bar-fill {
    height: 100%;
    border-radius: 999px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    min-width: 18px;
  }
  .factor-bar-fill-good { background: linear-gradient(90deg, #5a7a4a, var(--sage)); }
  .factor-bar-fill-mid { background: linear-gradient(90deg, #a67c2e, var(--gold)); }
  .factor-bar-fill-low { background: linear-gradient(90deg, #9a4630, var(--rust)); }
  .factor-bar-label {
    font-size: 10px;
    font-weight: 800;
    color: #fff;
  }
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    margin: 0;
  }
  .kpi-strip.kpi-strip-multi-period {
    margin-top: 2px;
    gap: 8px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .kpi-strip.kpi-strip-multi-period .kpi-box {
    padding: 10px 6px;
    min-width: 0;
  }
  .kpi-strip.kpi-strip-multi-period .kpi-box > span.kpi-box-label {
    font-size: 8px;
    letter-spacing: 0.03em;
    margin-bottom: 6px;
    line-height: 1.25;
  }
  .kpi-strip.kpi-strip-multi-period .kpi-box strong {
    font-size: 14px;
    line-height: 1.2;
    word-break: break-word;
  }
  .kpi-box {
    position: relative;
    padding: 22px 18px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: var(--paper-raised);
    box-shadow: 0 4px 14px rgba(21, 40, 56, 0.05);
    text-align: center;
  }
  .kpi-box-index {
    position: absolute;
    top: 10px;
    right: 12px;
    z-index: 2;
    font-size: 9px;
    font-weight: 800;
    line-height: 1;
    color: var(--muted);
    font-family: var(--font-mono);
    pointer-events: none;
  }
  .kpi-box-formula {
    display: block;
    margin-top: 8px;
    font-size: 9px;
    font-style: normal;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--muted);
    font-family: var(--font-mono);
  }
  .kpi-box span {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .kpi-box strong {
    font-size: 24px;
    color: var(--primary-dark);
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .kpi-box-neutral { background: var(--paper-raised); }
  .kpi-box-good { background: #eef6ea; border-color: rgba(110, 143, 92, 0.45); }
  .kpi-box-mid { background: #faf3e3; border-color: rgba(200, 155, 60, 0.45); }
  .kpi-strip-relocation .kpi-box {
    padding-top: 26px;
  }
  .kpi-strip-relocation .kpi-box > span.kpi-box-label {
    display: block;
    width: fit-content;
    max-width: calc(100% - 28px);
    margin: 0 auto 12px;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid rgba(44, 110, 142, 0.32);
    background: linear-gradient(180deg, rgba(44, 110, 142, 0.18) 0%, rgba(44, 110, 142, 0.08) 100%);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1a4d66;
    line-height: 1.35;
    box-sizing: border-box;
  }
  .relocation-adj-chart .adj-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #1a4d66;
    line-height: 1.35;
  }
  .section-block {
    margin-bottom: 28px;
  }
  .section-block-loose {
    margin-bottom: 36px;
  }
  .report-keep-together {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .report-page-break-before {
    page-break-before: always;
    break-before: page;
  }
  .report-explanatory-callout {
    margin: 12px 0;
    padding: 10px 12px 10px 28px;
    border: none;
    background: var(--primary-light);
    border-radius: 8px;
    color: var(--ink);
    font-size: 0.92rem;
    line-height: 1.5;
    position: relative;
  }
  .report-explanatory-callout::before {
    content: "◆";
    position: absolute;
    left: 10px;
    top: 11px;
    color: var(--rust);
    font-size: 10px;
    line-height: 1;
  }
  .metric-card-impact {
    margin: 8px 0 0;
    color: #475569;
    font-size: 0.82rem;
    line-height: 1.45;
    font-weight: 400;
  }
  .merchant-category-group {
    padding: 12px 16px;
    border-bottom: 1px solid #eef4f6;
  }
  .merchant-category-group:last-child {
    border-bottom: 0;
  }
  .merchant-category-group h3 {
    margin: 0 0 6px;
    font-size: 0.95rem;
  }
  .merchant-category-inline {
    margin: 0;
    padding: 0 0 0 0.15rem;
    color: #334155;
    font-size: 0.82rem;
    line-height: 1.45;
    white-space: normal;
  }
  .merchant-category-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .merchant-category-list li {
    padding: 4px 0 4px 1.25rem;
    color: #334155;
    font-size: 0.88rem;
  }
  .pct-cell-center {
    text-align: center;
  }
  .composite-gauge-type,
  .composite-score-type,
  .composite-score-type-inline,
  .city-compare-health-score {
    display: block;
    font-size: 9px;
    font-weight: 700;
    color: var(--primary-dark);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 4px;
    line-height: 1.35;
    padding: 5px 8px;
    background: var(--primary-light);
    border-radius: 8px;
    border-left: 3px solid var(--adriatic);
  }
  .city-compare-health-score {
    text-transform: none;
    font-size: 10px;
    font-weight: 600;
  }
  .city-compare-health-score strong {
    font-size: 11px;
    color: var(--ink);
  }
  .report-table-card {
    border: 2px solid var(--report-border);
    border-radius: 14px;
    overflow: visible;
    margin-bottom: 0;
    background: var(--paper-raised);
    box-shadow: 0 6px 18px rgba(21, 40, 56, 0.06);
    flex: 1 1 auto;
  }
  .report-table-card-compact {
    margin-bottom: 0;
  }
  .report-table-card-compact .section-title {
    padding: 16px 18px 0;
    margin: 0 0 8px;
    font-size: 16px;
  }
  .report-table-card-compact .muted-note {
    padding: 0 18px 10px;
    font-size: 11px;
  }
  .report-table-card .index-table tbody tr:last-child td {
    border-bottom: 1px solid var(--report-border);
  }
  .report-page-bottom-section {
    margin-top: auto;
  }
  .report-tip-list {
    margin: 0;
    padding: 0 16px 16px 32px;
    font-size: 11px;
    line-height: 1.55;
    color: var(--ink);
  }
  .report-tip-list li + li {
    margin-top: 8px;
  }
  .report-table-card .section-title {
    padding: 18px 18px 0;
    font-size: 16px;
    margin: 0 0 8px;
  }
  .report-table-card .muted-note {
    padding: 0 16px 10px;
    margin: 0;
  }
  .report-table-card .index-table {
    margin: 0;
    border-top: 1px solid var(--report-border);
  }
  .report-table-card .index-table.report-table-styled {
    border: 1px solid var(--report-border);
    border-top: 1px solid var(--report-border);
  }
  .report-table-card-compact .index-table.report-table-styled {
    border-left: none;
    border-right: none;
    border-bottom: none;
    border-radius: 0;
  }
  .report-section-bordered .supporting-metrics-table-card .index-table.report-table-styled {
    border: 1px solid var(--report-border);
    border-radius: 0 0 12px 12px;
  }
  .health-report-page .supporting-metrics-table-card .index-table.report-table-styled {
    border: none;
    border-top: 1px solid var(--report-border);
    border-radius: 0;
  }
  .health-report-page .supporting-metrics-table-card .index-table.report-table-styled tbody tr:last-child td {
    border-bottom: 1px solid var(--report-border);
  }
  .health-report-page.report-section-bordered,
  .health-metrics-for-you.report-section-bordered {
    border-bottom: 2px solid var(--report-border);
  }
  .merchant-by-category {
    border-top: 1px solid var(--report-border);
  }
  .report-table-styled th {
    background: var(--primary-light);
    border-color: var(--report-border);
  }
  .report-table-styled td,
  .report-table-styled th {
    border-color: var(--report-border);
  }
  .index-table {
    border: 1px solid var(--report-border);
  }
  .report-section-bordered {
    border: 2px solid var(--report-border);
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 24px;
    background: var(--paper-raised);
    box-shadow: 0 6px 18px rgba(21, 40, 56, 0.06);
  }
  .report-section-bordered .section-title {
    margin-top: 0;
  }
  .report-sources-box {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #eef4f6;
  }
  .report-sources-title {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .report-sources-list {
    margin: 0;
    padding-left: 18px;
    font-size: 10px;
    color: var(--muted);
  }
  .report-sources-list li + li {
    margin-top: 6px;
  }
  .report-kicker {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 6px;
    font-weight: 700;
  }
  .pp-index-chart { margin: 12px 0; }
  .pp-index-row {
    display: grid;
    grid-template-columns: 88px 1fr 44px;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
  }
  .pp-index-label { font-size: 10px; font-weight: 700; }
  .pp-index-bar-track {
    position: relative;
    height: 18px;
    background: #f1f5f7;
    border-radius: 999px;
    overflow: hidden;
  }
  .pp-index-bar { height: 100%; border-radius: 999px; }
  .pp-index-baseline {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 8px;
    color: var(--muted);
  }
  .pp-index-value { font-size: 11px; font-weight: 700; text-align: right; font-family: var(--font-mono); }
  .composite-gauge-grid-report {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 12px 0 16px;
  }
  .composite-gauge-report { text-align: center; font-size: 9px; color: var(--muted); }
  .composite-gauge-value { font-size: 16px; font-weight: 700; fill: var(--primary-dark); }
  .composite-gauge-band {
    display: block;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--rust);
    margin: 2px 0 4px;
  }
  .composite-gauge-note {
    display: block;
    max-width: 88px;
    margin: 4px auto 0;
    font-size: 7px;
    line-height: 1.35;
    color: var(--muted);
    text-align: center;
  }
  .composite-gauge-note-title {
    display: block;
    max-width: 88px;
    margin: 4px auto 0;
    font-size: 7px;
    font-weight: 700;
    line-height: 1.35;
    color: var(--ink);
    text-align: center;
  }
  .composite-gauge-report-home {
    grid-column: span 1;
  }
  .vbar-rank {
    font-size: 8px;
    font-weight: 700;
    color: var(--muted);
    margin-bottom: 2px;
  }
  .composite-card-grid-report {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }
  .composite-city-card-report {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px;
    background: #fafbfc;
  }
  .composite-city-card-report.best-fit {
    border-color: #a7f3d0;
    background: #ecfdf5;
  }
  .composite-city-score {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary-dark);
    margin: 8px 0 2px;
    font-family: var(--font-mono);
  }
  .composite-city-card-report .composite-gauge-band {
    display: block;
    margin-bottom: 4px;
  }
  .composite-weights-panel-report {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 10px;
  }
  .composite-weights-note-report {
    margin: 0 0 6px;
    font-size: 8px;
    line-height: 1.35;
    color: var(--muted);
  }
  .composite-weights-block-report {
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fafbfc;
  }
  .composite-weights-title-report {
    margin: 0 0 6px;
    font-size: 9px;
    font-weight: 700;
    color: var(--ink);
  }
  .composite-weights-list-report {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .composite-weights-list-report li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 8px;
    color: var(--muted);
    padding: 2px 0;
  }
  .composite-weights-list-report li strong {
    font-size: 8px;
    color: var(--ink);
    font-weight: 700;
  }
  .composite-context-list-report li {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .composite-context-label-report {
    font-weight: 600;
    color: var(--ink);
  }
  .composite-context-desc-report {
    font-size: 7px;
    line-height: 1.35;
    color: var(--muted);
  }
  .composite-city-component-scores-report {
    margin: 0 0 4px;
    font-size: 7px;
    line-height: 1.35;
    color: var(--muted);
  }
  .composite-best-fit {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #047857;
    font-weight: 700;
  }
  .composite-footnote { font-size: 9px; color: var(--muted); font-style: italic; margin-top: 8px; }
  .section-title {
    margin: 0 0 14px;
    font-size: 16px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .chart-panel {
    padding: 22px 20px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: var(--paper-raised);
    box-shadow: 0 6px 18px rgba(21, 40, 56, 0.06);
    margin-bottom: 0;
    flex: 1 1 auto;
  }
  .chart-panel-compact {
    padding: 20px 18px;
    margin-bottom: 0;
    flex: 1 1 auto;
  }
  .chart-panel-compact .section-title {
    margin-bottom: 16px;
    font-size: 16px;
  }
  .page-content-stack {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: 100%;
  }
  .chart-panel-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  .donut-chart-wrap {
    display: grid;
    grid-template-columns: 200px max-content;
    gap: 14px;
    align-items: center;
    justify-content: start;
  }
  .donut-ring {
    position: relative;
    width: 200px;
    height: 200px;
    flex: 0 0 auto;
  }
  .donut-ring .donut-chart {
    display: block;
    width: 100%;
    height: 100%;
  }
  .donut-center-copy {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    text-align: center;
    line-height: 1.2;
    padding: 18px;
  }
  .donut-chart-wrap-embedded {
    grid-template-columns: 248px max-content;
    gap: 10px;
    margin: 2px 0 0;
    align-items: center;
  }
  .donut-chart-wrap-embedded .donut-ring {
    width: 248px;
    height: 248px;
  }
  .donut-chart-wrap-embedded .donut-center-copy .donut-center-value {
    font-size: 12px;
  }
  .donut-chart-wrap-stacked {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    max-width: 100%;
    gap: 10px;
    margin: 2px 0 0;
    overflow: hidden;
  }
  .donut-chart-wrap-stacked .donut-ring {
    width: 176px;
    height: 176px;
  }
  .donut-chart-wrap-stacked .donut-legend-panel {
    width: 100%;
    gap: 8px;
  }
  .donut-chart-wrap-stacked .donut-legend-row {
    grid-template-columns: 10px minmax(0, 1fr) auto;
    gap: 8px;
  }
  .donut-chart-wrap-stacked .donut-legend-stat {
    min-width: 0;
    justify-content: flex-end;
    white-space: nowrap;
  }
  .donut-chart-wrap-stacked .donut-center-copy .donut-center-value {
    font-size: 11px;
  }
  .donut-center-label {
    font-size: 11px;
    color: var(--muted);
    fill: var(--muted);
  }
  .donut-center-value {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary-dark);
    fill: var(--primary-dark);
  }
  .donut-legend-panel {
    display: grid;
    gap: 14px;
    min-width: 0;
  }
  .donut-legend-row {
    display: grid;
    grid-template-columns: 10px minmax(100px, 180px) auto;
    gap: 10px;
    align-items: center;
    font-size: 11px;
  }
  .donut-legend-stat {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: var(--primary-dark);
    white-space: nowrap;
    text-align: center;
    min-width: 130px;
  }
  .donut-legend-label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .donut-legend-name {
    line-height: 1.35;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .donut-swatch {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .donut-stat-amount,
  .donut-stat-pct {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .donut-stat-sep {
    color: var(--muted);
    font-weight: 600;
  }
  .radar-wrap {
    display: flex;
    justify-content: center;
    padding: 8px;
  }
  .radar-label {
    font-size: 9px;
    fill: var(--muted);
  }
  .rounded-bar-row {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) auto 72px;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
  }
  .rounded-bar-label {
    font-size: 10px;
    color: var(--ink);
  }
  .rounded-bar-track {
    height: 22px;
    background: #f1f5f7;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(28, 43, 51, 0.05);
    flex-shrink: 0;
  }
  .rounded-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    border-radius: 999px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    min-width: 2px;
    max-width: 100%;
    box-sizing: border-box;
  }
  .rounded-bar-fill span {
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }
  .rounded-bar-value {
    font-size: 10px;
    text-align: right;
    color: var(--primary-dark);
  }
  .summary-table-compact {
    font-size: 10px;
    margin-top: 12px;
  }
  .summary-table-compact td {
    padding: 8px 10px;
  }
  .footer-meta {
    display: block;
    margin-bottom: 2px;
    font-size: 8px;
    font-weight: 500;
    color: var(--muted);
    text-transform: none;
    letter-spacing: 0;
  }
  .details-section {
    margin-top: 28px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }
  .details-section .section-title {
    font-size: 13px;
    margin-bottom: 12px;
  }
  .muted-note {
    margin: 0 0 16px;
    font-size: 10px;
    color: var(--muted);
  }
  .section-note { margin: 0 0 12px; font-size: 11px; color: var(--muted); }
  .index-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 0;
  }
  .index-table th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    border-bottom: 1px solid #e8eef0;
    padding: 14px 12px;
  }
  .index-table td { padding: 14px 12px; border-bottom: 1px solid #eef4f6; }
  .index-table th:not(:first-child),
  .index-table td:not(:first-child) { text-align: right; }
  .index-table.category-changes-table-large th,
  .index-table.category-changes-table-large td {
    text-align: left;
    vertical-align: top;
  }
  .index-table.category-changes-table-large th:last-child,
  .index-table.category-changes-table-large td:last-child {
    padding-left: 18px;
  }
  .index-table.category-changes-table-large td:first-child {
    width: 32%;
    white-space: nowrap;
  }
  .index-table tr.stripe { background: var(--stripe); }
  .index-table tr.total-row { background: var(--primary); color: #fff; }
  .index-table tr.total-row td { border: none; font-weight: 700; }
  .index-table.compact td { padding: 12px 12px; }
  .index-table.compact th { padding: 12px 12px; }
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 24px;
  }
  .metric-grid.supporting-metrics-row {
    grid-template-columns: repeat(4, 1fr);
  }
  .gap-chart-compact .rounded-bar-track {
    height: 18px;
  }
  .gap-chart-compact .rounded-bar-row {
    margin-bottom: 12px;
  }
  .gap-bar-chart {
    display: block;
    width: 100%;
    max-width: 100%;
    margin-top: 8px;
  }
  .gap-bar-label {
    font-size: 10px;
    fill: var(--ink);
  }
  .gap-bar-value {
    font-size: 10px;
    font-weight: 700;
    fill: var(--primary-dark);
  }
  .report-section-spaced {
    margin-top: 16px;
  }

  .category-merchants-note {
    font-size: 9px;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.3;
  }

  .metric-definitions-table td {
    vertical-align: top;
    font-size: 10px;
  }
  .metric-definitions-table td.supporting-metric-definition {
    text-align: left;
    padding-left: 18px;
  }

  .metric-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--paper-raised);
    padding: 14px 12px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(28, 43, 51, 0.05);
  }
  .metric-card span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .metric-card strong { font-size: 18px; color: var(--primary-dark); }
  .score-ring {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    font-size: 24px;
    font-weight: 700;
    color: var(--primary-dark);
    border: 4px solid var(--primary);
  }
  .score-ring-good {
    color: #047857;
    border-color: #059669;
    background: rgba(209, 250, 229, 0.65);
  }
  .score-ring-mid {
    color: #b45309;
    border-color: #f59e0b;
    background: rgba(254, 243, 199, 0.75);
  }
  .score-ring-low {
    color: #b91c1c;
    border-color: #ef4444;
    background: rgba(254, 226, 226, 0.75);
  }
  .score-summary-good strong { color: #047857; }
  .score-summary-mid strong { color: #b45309; }
  .score-summary-low strong { color: #b91c1c; }
  .bar-chart-row {
    display: grid;
    grid-template-columns: 120px 1fr 80px;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }
  .bar-chart-section {
    margin-top: 4px;
    padding-bottom: 8px;
  }
  .bar-chart-section-compact {
    margin-top: 2px;
    padding-bottom: 0;
  }
  .section-title-compact {
    margin-top: 6px;
    margin-bottom: 4px;
  }
  .bar-chart-row-compact {
    margin-bottom: 4px;
    grid-template-columns: 110px 1fr 72px;
    font-size: 10px;
  }
  .bar-track-compact {
    height: 14px;
  }
  .bar-track {
    height: 20px;
    background: #eef4f6;
    border-radius: 2px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: var(--adriatic);
    border-radius: 2px;
  }
  .factor-row {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 8px;
    background: var(--paper-raised);
  }
  .factor-row strong { color: var(--primary-dark); }
  .factor-detail {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--ink);
    font-weight: 700;
    line-height: 1.45;
  }
  .factor-track {
    height: 10px;
    background: #eef4f6;
    border-radius: 999px;
    overflow: hidden;
    margin: 6px 0;
  }
  .factor-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 999px;
  }
  .factor-fill-good { background: var(--good); }
  .factor-fill-mid { background: var(--gold); }
  .factor-fill-low { background: var(--rust); }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11px;
  }
  .summary-table td {
    border-bottom: 1px solid var(--line);
    padding: 10px 8px;
    vertical-align: middle;
  }
  .summary-table td:last-child { text-align: right; }
  .summary-table .highlight-row { background: var(--stripe); }
  .pct-pill {
    display: inline-block;
    background: var(--primary);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    margin-right: 6px;
  }
  .sub-val { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .chart-title { margin: 12px 0 8px; font-size: 14px; font-weight: 700; color: var(--primary-dark); }
  .adjustment-chart { margin-bottom: 10px; }
  .adj-row {
    display: grid;
    grid-template-columns: 160px 1fr 80px;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .adj-label { font-size: 10px; }
  .adj-bar-wrap {
    height: 22px;
    background: #f1f5f7;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(28, 43, 51, 0.05);
  }
  .adj-bar { height: 100%; border-radius: 999px; }
  .adj-bar.primary { background: var(--home); }
  .adj-bar.secondary { background: var(--destination); }
  .adj-bar.income { background: var(--home); }
  .adj-bar.cost { background: var(--destination); }
  .adj-bar.balance-pos { background: var(--sage); }
  .adj-bar.balance-neg { background: var(--rust); }
  .adj-bar.danger { background: var(--rust); }
  .adj-value { font-size: 11px; font-weight: 700; text-align: right; font-family: var(--font-mono); }
  .legend {
    display: flex;
    gap: 16px;
    font-size: 10px;
    color: var(--muted);
    margin: 8px 0 12px;
  }
  .legend.centered { justify-content: center; }
  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 1px;
    margin-right: 4px;
    vertical-align: middle;
  }
  .swatch.primary { background: var(--home); }
  .swatch.secondary { background: var(--destination); }
  .swatch.danger { background: var(--rust); }
  .swatch.income { background: var(--home); }
  .swatch.cost { background: var(--destination); }
  .swatch.balance-pos { background: var(--sage); }
  .swatch.balance-neg { background: var(--rust); }
  .verdict-box {
    border: 1px solid var(--line);
    background: var(--stripe);
    padding: 10px 12px;
    font-size: 11px;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  .verdict-box p { margin: 6px 0 0; color: var(--muted); }
  .verdict-report-section {
    margin-top: 16px;
  }
  .verdict-report-comfortable { border-color: rgba(110, 143, 92, 0.45); background: #eef6ea; }
  .verdict-report-likely { border-color: rgba(44, 110, 142, 0.35); background: var(--paper-raised); }
  .verdict-report-tight { border-color: rgba(200, 155, 60, 0.45); background: #faf3e3; }
  .verdict-report-unlikely { border-color: rgba(181, 87, 58, 0.45); background: #faf0eb; }
  .verdict-report-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 12px;
  }
  .verdict-score-note {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ink);
  }
  .verdict-score-badge {
    text-align: center;
    min-width: 88px;
    padding: 0;
    border-radius: 0;
    background: transparent;
    border: none;
  }
  .verdict-score-badge strong {
    display: block;
    font-size: 28px;
    line-height: 1;
    color: var(--rust);
    font-family: var(--font-display);
    font-weight: 700;
  }
  .verdict-score-badge span {
    font-size: 12px;
    color: var(--muted);
  }
  .verdict-score-badge em {
    display: block;
    margin-top: 6px;
    font-size: 8px;
    font-style: normal;
    text-transform: uppercase;
    color: var(--muted);
  }
  .verdict-tips-report {
    margin-bottom: 12px;
  }
  .verdict-tips-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .verdict-tips-report p {
    margin: 0 0 8px;
    font-size: 11px;
    line-height: 1.5;
  }
  .verdict-tip-report {
    padding: 8px 10px;
    margin-top: 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--line);
    font-size: 10px;
    line-height: 1.45;
  }
  .verdict-metrics-report {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .verdict-metric-report {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--line);
  }
  .verdict-metric-report span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: var(--muted);
    line-height: 1.35;
  }
  .verdict-metric-report span em {
    display: block;
    font-style: normal;
    font-size: 7px;
    margin-top: 2px;
  }
  .verdict-metric-report strong {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    color: var(--primary-dark);
    font-family: var(--font-mono);
  }
  .verdict-metric-highlight {
    grid-column: span 2;
    background: #fff;
  }
  .verdict-formula-note {
    margin: 0;
    font-size: 9px;
    line-height: 1.45;
    color: var(--muted);
  }
  .location-meta-report {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .location-meta-report div {
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--stripe);
    border: 1px solid var(--line);
  }
  .location-meta-report span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .location-meta-report strong {
    font-size: 11px;
    color: var(--primary-dark);
  }
  .methodology-note {
    margin-bottom: 12px;
  }
  .status-pill {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 600;
    white-space: nowrap;
  }
  .status-pill.status-high { background: #fee2e2; color: #991b1b; }
  .status-pill.status-low { background: #dcfce7; color: #166534; }
  .status-pill.status-mid { background: #fef3c7; color: #92400e; }
  .readiness-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 12px 0;
  }
  .readiness-strip div {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 8px;
    background: var(--stripe);
    text-align: center;
  }
  .readiness-strip span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .readiness-strip strong { font-size: 14px; color: var(--primary-dark); }
  .tip-box {
    border-left: 3px solid var(--gold);
    background: #faf6f0;
    padding: 8px 10px;
    font-size: 10px;
    margin-bottom: 10px;
  }
  .column-chart {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 8px;
    height: 120px;
    margin-bottom: 10px;
    align-items: stretch;
  }
  .y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    text-align: right;
  }
  .columns {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 8px;
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 0 8px;
  }
  .col-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
    font-size: 8px;
    color: var(--muted);
    text-align: center;
  }
  .col-bar {
    width: 70%;
    min-height: 4px;
    border-radius: 2px 2px 0 0;
    margin-bottom: 4px;
  }
  .col-bar.up { background: var(--primary); }
  .col-bar.down { background: var(--danger); }
  .pos { color: var(--good); font-weight: 700; }
  .neg { color: var(--danger); font-weight: 700; }
  .relocation-story-box {
    padding: 18px 20px;
    border-radius: 14px;
    border: 1px solid #fde68a;
    background: linear-gradient(135deg, #fefce8, #ffffff);
    box-shadow: 0 6px 18px rgba(28, 43, 51, 0.06);
    margin-bottom: 20px;
  }
  .relocation-story-paragraph {
    margin: 0 0 10px;
    font-size: 11px;
    line-height: 1.55;
    color: var(--ink);
  }
  .relocation-story-paragraph:last-child { margin-bottom: 0; }
  .section-heading-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .period-chip {
    font-size: 9px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--stripe);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .benchmark-matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-top: 12px;
  }
  .benchmark-matrix-table th {
    text-align: left;
    padding: 10px 12px;
    background: var(--stripe);
    border-radius: 8px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .benchmark-matrix-table td {
    padding: 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
  }
  .benchmark-category-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .spending-pill {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 8px;
    background: #eef4f6;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .spending-pill-total {
    background: #dbeafe;
  }
  .benchmark-city-cell {
    display: grid;
    gap: 4px;
  }
  .benchmark-value-box {
    display: inline-block;
    min-width: 52px;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    font-weight: 700;
    color: var(--primary-dark);
    text-align: center;
    box-shadow: 0 1px 3px rgba(28, 43, 51, 0.06);
  }
  .benchmark-mo {
    font-size: 9px;
    color: var(--muted);
  }
  .benchmark-total-row td {
    background: #edf4f6;
    border-bottom: none;
  }
  .benchmark-total-row strong {
    color: var(--primary-dark);
  }
  .report-tip-list {
    margin: 0;
    padding-left: 18px;
    font-size: 10px;
    line-height: 1.55;
    color: var(--ink);
  }
  .report-tip-list li { margin-bottom: 6px; }
  .city-profile-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-top: 8px;
  }
  .city-profile-table th {
    width: 34%;
    text-align: left;
    padding: 10px 12px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    font-weight: 700;
    vertical-align: top;
    border-bottom: 1px solid var(--line);
  }
  .city-profile-table td {
    padding: 10px 12px;
    color: var(--ink);
    line-height: 1.45;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  .city-profile-table tr:last-child th,
  .city-profile-table tr:last-child td {
    border-bottom: none;
  }
  .fine-print { margin: 0; font-size: 9px; color: var(--muted); }
  .muted { color: var(--muted); font-size: 10px; }
  .ftr {
    display: none;
  }
  .pdf-page-footer {
    flex: 0 0 auto;
    margin-top: auto;
    padding-top: 4px;
    padding-bottom: 0;
    text-align: right;
    font-size: 9px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.04em;
  }
  .ftr-page {
    position: static;
    color: var(--muted);
    text-shadow: none;
  }
  .type-pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .type-pill-recurring { background: #dbeafe; color: #1e40af; }
  .type-pill-variable { background: #fef3c7; color: #92400e; }
  .type-pill-new { background: #dbeafe; color: #1e40af; }
  .category-change-new {
    color: #1e40af;
    font-weight: 600;
  }
  .index-table.category-changes-table-large td:first-child .type-pill-new {
    margin-left: 8px;
    vertical-align: middle;
  }
  .sparkline-wrap {
    margin: 10px 0 14px;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--stripe);
  }
  .sparkline-label {
    display: block;
    font-size: 9px;
    color: var(--muted);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

export function buildReportDocument(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700&family=IBM+Plex+Mono:wght@500;600;700&family=Inter:wght@400;600;700&display=swap" />
  <style>${BASE_REPORT_STYLES}</style>
</head>
<body>
  ${body}
</body>
</html>`;
}

export function buildReportPageShell(options: {
  pageNumber: number;
  totalPages: number;
  reportLabel: string;
  pageTitle: string;
  pageSubtitle?: string;
  body: string;
  privacyNotice?: string;
  showPrivacy?: boolean;
  pageBreakBefore?: boolean;
  pageContentClass?: string;
  pageAutoFit?: boolean;
  meta?: {
    generatedAt?: string;
    periodLabel?: string;
    displayCurrency?: string;
  };
}) {
  const {
    pageNumber,
    totalPages,
    reportLabel,
    pageTitle,
    pageSubtitle,
    body,
    privacyNotice,
    showPrivacy = false,
    pageBreakBefore = false,
    pageContentClass = "",
    pageAutoFit = false,
  } = options;
  const privacyBlock =
    showPrivacy && privacyNotice
      ? `<div class="privacy-banner privacy-banner-once">${escapeHtml(privacyNotice)}</div>`
      : "";
  const footerMeta = "";
  return `
  <section class="page${pageBreakBefore ? " report-page-break-before" : ""}${pageAutoFit ? " page-auto-fit" : ""}">
    <header class="page-header page-header-compact">
      <div class="top-bar">
        <div class="report-brand">
          <span class="report-brand-mark" aria-hidden="true">B</span>
          <span>${escapeHtml(reportLabel)}</span>
        </div>
        <span>Page ${pageNumber} of ${totalPages}</span>
      </div>
      <h1 class="page-title">${escapeHtml(pageTitle)}</h1>
      ${pageSubtitle ? `<p class="page-subtitle">${escapeHtml(pageSubtitle)}</p>` : ""}
    </header>
    ${privacyBlock}
    <div class="page-content page-content-spread page-content-report-full${pageContentClass ? ` ${pageContentClass}` : ""}">
      ${body}
    </div>
  </section>`;
}

function mountReportDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    [
      "position:fixed",
      "left:0",
      "top:0",
      `width:${REPORT_PAGE_WIDTH_PX}px`,
      `height:${REPORT_PAGE_HEIGHT_PX + 40}px`,
      "border:0",
      "opacity:0.01",
      "pointer-events:none",
      "z-index:2147483647",
    ].join(";")
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error("Could not prepare PDF document.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  return { iframe, doc };
}

async function waitForReportLayout(doc: Document) {
  await new Promise<void>((resolve) => {
    if (doc.readyState === "complete") {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      return;
    }
    doc.addEventListener(
      "readystatechange",
      () => {
        if (doc.readyState === "complete") {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }
      },
      { once: true }
    );
    window.setTimeout(resolve, 400);
  });
}

async function waitForReportImages(doc: Document) {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

type PdfDocument = {
  addPage(): void;
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
};

function appendCanvasPagesToPdf(
  pdf: PdfDocument,
  canvas: HTMLCanvasElement,
  options: {
    margin: number;
    printableWidth: number;
    printableHeight: number;
    isFirstPdfPage: boolean;
  }
): boolean {
  const { margin, printableWidth, printableHeight } = options;
  let isFirstPdfPage = options.isFirstPdfPage;
  const fullRenderWidth = printableWidth;
  const fullRenderHeight = (canvas.height * fullRenderWidth) / canvas.width;
  const minSlicePx = Math.max(24, Math.floor(canvas.height * 0.04));

  if (fullRenderHeight <= printableHeight * 1.01) {
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (!isFirstPdfPage) pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, margin, fullRenderWidth, fullRenderHeight);
    return false;
  }

  const pxPerMm = canvas.width / printableWidth;
  const sliceHeightPx = Math.max(1, Math.floor(printableHeight * pxPerMm));
  let sourceY = 0;

  while (sourceY < canvas.height) {
    const remainingPx = canvas.height - sourceY;
    if (remainingPx <= minSlicePx && sourceY > 0) {
      break;
    }

    const currentSlicePx = Math.min(sliceHeightPx, remainingPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSlicePx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("PDF render could not create canvas context.");
    }
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      currentSlicePx,
      0,
      0,
      canvas.width,
      currentSlicePx
    );

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const sliceRenderHeight = (currentSlicePx * fullRenderWidth) / canvas.width;
    if (!isFirstPdfPage) pdf.addPage();
    pdf.addImage(sliceData, "JPEG", margin, margin, fullRenderWidth, sliceRenderHeight);

    sourceY += currentSlicePx;
    isFirstPdfPage = false;
  }

  return false;
}

export async function downloadReportPdf(html: string, pdfFilename: string) {
  const filename = pdfFilename.endsWith(".pdf") ? pdfFilename : `${pdfFilename}.pdf`;
  const { iframe, doc } = mountReportDocument(html);

  try {
    await waitForReportLayout(doc);
    await waitForReportImages(doc);

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const pageElements = Array.from(doc.body.querySelectorAll(".page")) as HTMLElement[];
    const targets = pageElements.length ? pageElements : [doc.body];

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 1.5;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    let isFirstPdfPage = true;

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const isAutoFitPage = target.classList.contains("page-auto-fit");
      const captureHeight = isAutoFitPage
        ? Math.max(REPORT_PAGE_HEIGHT_PX, target.scrollHeight)
        : REPORT_PAGE_HEIGHT_PX;
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: REPORT_PAGE_WIDTH_PX,
        height: captureHeight,
        windowWidth: REPORT_PAGE_WIDTH_PX,
        windowHeight: captureHeight,
        backgroundColor: "#f2ebda",
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("PDF render produced empty content.");
      }

      isFirstPdfPage = appendCanvasPagesToPdf(pdf, canvas, {
        margin,
        printableWidth,
        printableHeight,
        isFirstPdfPage,
      });
    }

    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}

export async function exportReportPdf(html: string, pdfFilename: string) {
  await downloadReportPdf(html, pdfFilename);
}
