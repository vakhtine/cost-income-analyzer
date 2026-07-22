type IconProps = { className?: string };

export function ExpenseWalletIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="14" width="32" height="24" rx="4" fill="none" stroke="#0d4f6e" strokeWidth="2.8" />
      <path d="M8 20h32" stroke="#0d4f6e" strokeWidth="2.8" />
      <circle cx="34" cy="28" r="3.2" fill="#0369a1" />
      <rect x="12" y="10" width="14" height="8" rx="2" fill="#0284c7" opacity="0.35" />
    </svg>
  );
}

export function IncomeWalletIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="12" width="32" height="26" rx="4" fill="none" stroke="#0d4f6e" strokeWidth="2.8" />
      <rect x="14" y="6" width="20" height="10" rx="2" fill="#0891b2" opacity="0.4" />
      <path d="M14 18h12M14 24h18M14 30h10" stroke="#0369a1" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function LifestyleLeafIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="16" fill="none" stroke="#0e7490" strokeWidth="2.8" />
      <path
        d="M24 14c-6 4-8 10-8 14s2 10 8 14c6-4 8-10 8-14s-2-10-8-14z"
        fill="#0891b2"
        opacity="0.95"
      />
      <path d="M24 14v28" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function FinancialHealthIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 38c-8-6-14-12-14-20a14 14 0 0 1 28 0c0 8-6 14-14 20z"
        fill="none"
        stroke="#0d4f6e"
        strokeWidth="2.8"
      />
      <path
        d="M12 24h6l4-8 4 12 4-6h6"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CompareBarsIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="26" width="8" height="14" rx="2" fill="#0284c7" />
      <rect x="20" y="18" width="8" height="22" rx="2" fill="#0d4f6e" />
      <rect x="30" y="10" width="8" height="30" rx="2" fill="#38bdf8" />
    </svg>
  );
}

export function NomadGlobeIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="16" fill="none" stroke="#0d4f6e" strokeWidth="2.8" />
      <ellipse cx="24" cy="24" rx="8" ry="16" fill="none" stroke="#0284c7" strokeWidth="2.2" />
      <path d="M8 24h32M12 16h24M12 32h24" stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Expense Analysis",
    description: "See where your money goes",
    Icon: ExpenseWalletIcon,
    accent: "sky",
  },
  {
    title: "Income Tracking",
    description: "Understand your cash flow clearly",
    Icon: IncomeWalletIcon,
    accent: "aqua",
  },
  {
    title: "Lifestyle Sustainability",
    description: "Live well within your means",
    Icon: LifestyleLeafIcon,
    accent: "mint",
  },
  {
    title: "Financial Health",
    description: "Know your financial well-being",
    Icon: FinancialHealthIcon,
    accent: "ice",
  },
  {
    title: "Compare & Decide",
    description: "Compare cities and countries across the Balkans",
    Icon: CompareBarsIcon,
    accent: "ocean",
  },
  {
    title: "Built for Nomads & Expats",
    description: "Your freedom. Your future. Your way.",
    Icon: NomadGlobeIcon,
    accent: "azure",
  },
] as const;

export function HeroFeatureGrid() {
  return (
    <section className="hero-feature-grid" aria-label="App features">
      {FEATURES.map(({ title, description, Icon, accent }) => (
        <article key={title} className={`hero-feature-card hero-feature-card-${accent}`}>
          <div className={`hero-feature-icon-wrap hero-feature-icon-${accent}`}>
            <Icon className="hero-feature-svg" />
          </div>
          <h2>{title}</h2>
          <p>{description}</p>
        </article>
      ))}
    </section>
  );
}
