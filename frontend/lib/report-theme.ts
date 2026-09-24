/** PDF + chart palette aligned with the Balkans web app theme (globals.css). */
export const REPORT_THEME = {
  ink: "#152838",
  inkSoft: "#213c4e",
  paper: "#f2ebda",
  paperRaised: "#fbf6ea",
  primaryLight: "#efeada",
  rust: "#b5573a",
  adriatic: "#2c6e8e",
  sage: "#6e8f5c",
  amber: "#c89b3c",
  line: "#dccfaf",
  muted: "#67707a",
  adriaticLight: "#5a9bb5",
  stripe: "#fbf6ea",
} as const;

export const REPORT_CHART_COLORS = [
  REPORT_THEME.inkSoft,
  REPORT_THEME.adriatic,
  REPORT_THEME.rust,
  REPORT_THEME.amber,
  REPORT_THEME.sage,
  "#6366f1",
] as const;

export const REPORT_FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700&family=IBM+Plex+Mono:wght@500;600;700&family=Inter:wght@400;600;700&display=swap";
