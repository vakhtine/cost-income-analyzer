import { CategoryIconId } from "@/lib/category-icons";

type Props = {
  iconId: CategoryIconId;
  className?: string;
};

export function CategoryIconGlyph({ iconId, className = "" }: Props) {
  switch (iconId) {
    case "grocery":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="13" rx="7" ry="8" fill="#6bbf59" />
          <ellipse cx="12" cy="13" rx="5" ry="6" fill="#8fd67a" />
          <circle cx="12" cy="13" r="3.2" fill="#6b4a2b" />
        </svg>
      );
    case "gas-fuel":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="4" width="10" height="15" rx="1.5" fill="#ef4444" />
          <rect x="7" y="7" width="6" height="4" rx="0.8" fill="#fff" />
          <path d="M15 8h2.5l2 3v8h-4.5V8z" fill="#dc2626" />
          <rect x="16.8" y="11" width="1.8" height="5" rx="0.4" fill="#facc15" />
        </svg>
      );
    case "telecom":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="4" width="12" height="16" rx="1.5" fill="#c4a574" />
          <rect x="8" y="7" width="8" height="10" rx="0.8" fill="#fff" />
          <rect x="9" y="9" width="6" height="1.2" rx="0.4" fill="#60a5fa" />
          <rect x="9" y="11.5" width="6" height="1.2" rx="0.4" fill="#60a5fa" />
          <rect x="9" y="14" width="4.5" height="1.2" rx="0.4" fill="#60a5fa" />
          <rect x="10" y="3" width="4" height="2.5" rx="0.6" fill="#94a3b8" />
        </svg>
      );
    case "insurance":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3 5 6.5V12c0 4.2 3 7.9 7 8.8 4-.9 7-4.6 7-8.8V6.5L12 3z"
            fill="#3b82f6"
          />
        </svg>
      );
    case "shopping":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="9" width="7" height="8" rx="1" fill="#38bdf8" />
          <rect x="13" y="9" width="7" height="8" rx="1" fill="#f472b6" />
          <path d="M5 9 6.5 6h4L12 9M13 9l1.5-3h4L20 9" stroke="#fff" strokeWidth="1.2" fill="none" />
          <rect x="15" y="12" width="4" height="4" rx="0.6" fill="#fb923c" />
          <path d="M16 12v4M18 12v4M15 14h4" stroke="#facc15" strokeWidth="0.8" />
        </svg>
      );
    case "discount-retail":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h8l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" fill="#ef4444" />
          <circle cx="9" cy="9" r="1.1" fill="#fff" />
          <text x="11.5" y="14.5" fill="#fff" fontSize="7" fontWeight="700">
            %
          </text>
        </svg>
      );
    case "wire-transfer":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="5" width="14" height="9" rx="1" fill="#f8fafc" />
          <rect x="7" y="7" width="3" height="5" fill="#cbd5e1" />
          <rect x="11" y="8" width="6" height="1.2" rx="0.4" fill="#94a3b8" />
          <rect x="11" y="10.5" width="5" height="1.2" rx="0.4" fill="#94a3b8" />
          <path d="M6 17h5l-1.5-1.5L6 17z" fill="#22c55e" />
          <path d="M18 17h-5l1.5-1.5L18 17z" fill="#14b8a6" />
        </svg>
      );
    case "uncategorized":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <text x="12" y="17" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
            ?
          </text>
        </svg>
      );
    case "dining":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4v8a2 2 0 0 0 4 0V4M10 4v16" stroke="#fcd34d" strokeWidth="1.6" fill="none" />
          <path d="M15 4v16M15 8c2 0 3-1.5 3-4s-1-4-3-4" stroke="#fcd34d" strokeWidth="1.6" fill="none" />
        </svg>
      );
    case "transport":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="8" width="16" height="8" rx="2" fill="#fde047" />
          <rect x="6" y="10" width="5" height="4" rx="0.8" fill="#87ceeb" />
          <circle cx="8" cy="18" r="1.8" fill="#334155" />
          <circle cx="16" cy="18" r="1.8" fill="#334155" />
        </svg>
      );
    case "rent":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 4 10v9h16v-9L12 4z" fill="#93c5fd" />
          <rect x="10" y="13" width="4" height="6" fill="#1e3a8a" />
        </svg>
      );
    case "utilities":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" fill="#fcd34d" />
        </svg>
      );
    case "health":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="8" width="12" height="10" rx="2" fill="#fda4af" />
          <rect x="10" y="5" width="4" height="4" rx="1" fill="#fb7185" />
        </svg>
      );
    case "entertainment":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="7" width="16" height="11" rx="1.5" fill="#fca5a5" />
          <path d="M4 11h16" stroke="#fff" strokeWidth="1.2" />
        </svg>
      );
    case "travel":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h18l-3-3v-2l-5 2-2-5H9l2 5-5 2v2l-3 3z" fill="#7dd3fc" />
        </svg>
      );
    case "education":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 2 9l10 5 10-5-10-5zm0 7.2L4.8 8.4V14c0 2.2 3.2 4 7.2 4s7.2-1.8 7.2-4V8.4L12 11.2z" fill="#a5b4fc" />
        </svg>
      );
    case "income":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" fill="#6ee7b7" />
          <text x="12" y="15.5" textAnchor="middle" fill="#064e3b" fontSize="10" fontWeight="700">
            $
          </text>
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="5" width="12" height="14" rx="1.5" fill="#e2e8f0" />
          <rect x="8" y="8" width="8" height="1.4" rx="0.4" fill="#94a3b8" />
          <rect x="8" y="11" width="8" height="1.4" rx="0.4" fill="#94a3b8" />
          <rect x="8" y="14" width="5" height="1.4" rx="0.4" fill="#94a3b8" />
        </svg>
      );
  }
}
