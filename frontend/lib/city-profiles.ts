export type CityProfile = {
  population: string;
  expatCommunity: string;
  localEconomy: string;
  nationalEconomy: string;
  crimeSafety: string;
  primaryLanguage: string;
  healthcare: string;
  climate: string;
  notes?: string;
};

export const CITY_PROFILES: Record<string, CityProfile> = {
  "Belgrade, Serbia": {
    population: "~1.7M metro",
    expatCommunity: "Growing — remote workers & Balkan hub",
    localEconomy: "Services, IT outsourcing, logistics",
    nationalEconomy: "Serbia — ~2.5% GDP growth, rising FDI",
    crimeSafety: "Moderate — typical urban precautions",
    primaryLanguage: "Serbian (English common in central districts)",
    healthcare: "Public + affordable private clinics",
    climate: "Continental — hot summers, cold winters",
  },
  "Podgorica, Montenegro": {
    population: "~230K city",
    expatCommunity: "Small but increasing",
    localEconomy: "Public sector, tourism spillover, trade",
    nationalEconomy: "Montenegro — euroized, tourism-driven",
    crimeSafety: "Low–moderate",
    primaryLanguage: "Montenegrin (English limited outside center)",
    healthcare: "Basic public system; private for faster access",
    climate: "Mediterranean-inland mix",
  },
  "Sofia, Bulgaria": {
    population: "~1.3M metro",
    expatCommunity: "Established — EU nomads & tech workers",
    localEconomy: "IT, BPO, manufacturing, shared services",
    nationalEconomy: "Bulgaria — EU member, steady growth",
    crimeSafety: "Low–moderate in central areas",
    primaryLanguage: "Bulgarian (English widely used in tech)",
    healthcare: "Low-cost private care; EU-standard options",
    climate: "Continental — four distinct seasons",
  },
  "Tirana, Albania": {
    population: "~520K city / ~950K metro",
    expatCommunity: "Fast-growing — nomads & retirees",
    localEconomy: "Construction, services, tourism, retail",
    nationalEconomy: "Albania — ~3% growth, rising remittances",
    crimeSafety: "Moderate — petty theft in tourist zones",
    primaryLanguage: "Albanian (Italian & English in cafés)",
    healthcare: "Improving private clinics; public varies",
    climate: "Mediterranean — mild wet winters",
  },
  "Tbilisi, Georgia": {
    population: "~1.1M metro",
    expatCommunity: "Large — digital nomad hotspot",
    localEconomy: "Hospitality, IT, trade, remittances",
    nationalEconomy: "Georgia — business-friendly reforms",
    crimeSafety: "Low–moderate",
    primaryLanguage: "Georgian (English common with youth)",
    healthcare: "Affordable private care",
    climate: "Humid subtropical valleys",
  },
  "Lisbon, Portugal": {
    population: "~2.9M metro",
    expatCommunity: "Very large — EU & US expats",
    localEconomy: "Tourism, tech, finance, creative industries",
    nationalEconomy: "Portugal — EU, services-led recovery",
    crimeSafety: "Low — pickpocketing in tourist areas",
    primaryLanguage: "Portuguese (English widely spoken)",
    healthcare: "Strong public SNS + private options",
    climate: "Mild Atlantic — warm dry summers",
  },
  "Barcelona, Spain": {
    population: "~5.7M metro",
    expatCommunity: "Very large — international hub",
    localEconomy: "Tourism, tech, design, logistics",
    nationalEconomy: "Spain — EU, services & tourism",
    crimeSafety: "Low–moderate — tourist-area petty crime",
    primaryLanguage: "Catalan & Spanish (English in business)",
    healthcare: "High-quality public system",
    climate: "Mediterranean — mild winters",
  },
  "Berlin, Germany": {
    population: "~3.7M city",
    expatCommunity: "Very large — global talent pool",
    localEconomy: "Tech, creative, government, startups",
    nationalEconomy: "Germany — EU largest economy",
    crimeSafety: "Low overall; higher in select districts",
    primaryLanguage: "German (English in tech/startups)",
    healthcare: "Excellent statutory insurance system",
    climate: "Continental — cool winters",
  },
  "London, UK": {
    population: "~9.6M metro",
    expatCommunity: "Massive — global expat center",
    localEconomy: "Finance, tech, media, professional services",
    nationalEconomy: "UK — services-led, post-Brexit adjustment",
    crimeSafety: "Moderate — varies sharply by borough",
    primaryLanguage: "English",
    healthcare: "NHS + private alternatives",
    climate: "Temperate oceanic — mild, rainy",
  },
  "Abbotsford, Canada": {
    population: "~160K city",
    expatCommunity: "Moderate — suburban Fraser Valley",
    localEconomy: "Agriculture, logistics, retail, manufacturing",
    nationalEconomy: "Canada — stable, resource & services mix",
    crimeSafety: "Low–moderate",
    primaryLanguage: "English",
    healthcare: "Public provincial system (MSP)",
    climate: "Oceanic — wet winters, warm summers",
  },
  "Chicago, USA": {
    population: "~2.7M city / ~9.5M metro",
    expatCommunity: "Large — diverse immigrant communities",
    localEconomy: "Finance, logistics, healthcare, tech",
    nationalEconomy: "USA — diversified national economy",
    crimeSafety: "Moderate — varies significantly by neighborhood",
    primaryLanguage: "English (Spanish widely spoken)",
    healthcare: "Employer/private insurance typical",
    climate: "Continental — cold winters, hot summers",
  },
  "Toronto, Canada": {
    population: "~6.7M metro",
    expatCommunity: "Very large — half foreign-born metro",
    localEconomy: "Finance, tech, media, healthcare",
    nationalEconomy: "Canada — stable services economy",
    crimeSafety: "Low–moderate",
    primaryLanguage: "English (French federal; highly multilingual)",
    healthcare: "Public OHIP system",
    climate: "Humid continental — cold winters",
  },
  "Montreal, Canada": {
    population: "~4.3M metro",
    expatCommunity: "Large — francophone & international",
    localEconomy: "Aerospace, AI, gaming, tourism",
    nationalEconomy: "Canada — Quebec services & culture hub",
    crimeSafety: "Low–moderate",
    primaryLanguage: "French (English common in business)",
    healthcare: "Public RAMQ system",
    climate: "Cold snowy winters, warm summers",
  },
};

const GENERIC_PROFILE: CityProfile = {
  population: "—",
  expatCommunity: "Varies — research local communities",
  localEconomy: "Mixed services economy",
  nationalEconomy: "Verify latest national indicators",
  crimeSafety: "Research neighborhood-level data",
  primaryLanguage: "Local language dominant",
  healthcare: "Check public vs private access",
  climate: "Verify seasonal patterns",
};

export function getCityProfile(city: string): CityProfile {
  if (CITY_PROFILES[city]) return CITY_PROFILES[city];

  const normalized = city.trim();
  const match = Object.keys(CITY_PROFILES).find(
    (key) => key.toLowerCase() === normalized.toLowerCase()
  );
  if (match) return CITY_PROFILES[match];

  return {
    ...GENERIC_PROFILE,
    notes: `No detailed profile on file for ${city}. Compare using live cost data in the app.`,
  };
}

export const CITY_PROFILE_STAT_ROWS: { key: keyof CityProfile; label: string }[] = [
  { key: "population", label: "Population" },
  { key: "expatCommunity", label: "Expat community" },
  { key: "localEconomy", label: "Local economy" },
  { key: "nationalEconomy", label: "National economy" },
  { key: "crimeSafety", label: "Crime & safety" },
  { key: "primaryLanguage", label: "Primary language" },
  { key: "healthcare", label: "Healthcare" },
  { key: "climate", label: "Climate" },
];
