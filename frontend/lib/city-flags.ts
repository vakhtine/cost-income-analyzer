const COUNTRY_FLAG_CODES: Record<string, string> = {
  albania: "al",
  georgia: "ge",
  bulgaria: "bg",
  serbia: "rs",
  montenegro: "me",
  "north macedonia": "mk",
  croatia: "hr",
  bosnia: "ba",
  "bosnia and herzegovina": "ba",
  greece: "gr",
  turkey: "tr",
  romania: "ro",
  hungary: "hu",
  italy: "it",
  spain: "es",
  portugal: "pt",
  france: "fr",
  germany: "de",
  "united kingdom": "gb",
  uk: "gb",
  switzerland: "ch",
  austria: "at",
  netherlands: "nl",
  belgium: "be",
  poland: "pl",
  "czech republic": "cz",
  czechia: "cz",
  slovakia: "sk",
  slovenia: "si",
  canada: "ca",
  "united states": "us",
  usa: "us",
  australia: "au",
};

export function getCityFlagCode(cityLabel: string): string | null {
  const parts = cityLabel.split(",");
  if (parts.length < 2) return null;
  const country = parts[parts.length - 1].trim().toLowerCase();
  return COUNTRY_FLAG_CODES[country] ?? null;
}
