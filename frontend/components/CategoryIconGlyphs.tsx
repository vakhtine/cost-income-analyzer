import { CategoryIconId } from "@/lib/category-icons";
import type { ReactNode } from "react";

type Props = {
  iconId: CategoryIconId;
  className?: string;
};

function LucideGlyph({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CategoryIconGlyph({ iconId, className = "" }: Props) {
  switch (iconId) {
    case "grocery":
      return (
        <LucideGlyph className={className}>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </LucideGlyph>
      );
    case "gas-fuel":
      return (
        <LucideGlyph className={className}>
          <line x1="3" x2="15" y1="22" y2="22" />
          <line x1="4" x2="14" y1="9" y2="9" />
          <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
        </LucideGlyph>
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
        <LucideGlyph className={className}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </LucideGlyph>
      );
    case "discount-retail":
      return (
        <LucideGlyph className={className}>
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
        </LucideGlyph>
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
        <LucideGlyph className={className}>
          <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
          <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
          <path d="m2.1 21.8 6.4-6.3" />
          <path d="m19 5-7 7" />
        </LucideGlyph>
      );
    case "alcohol":
      return (
        <LucideGlyph className={className}>
          <path d="M8 22h8" />
          <path d="M12 11v11" />
          <path d="m19 3-7 8-7-8Z" />
        </LucideGlyph>
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
        <LucideGlyph className={className}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </LucideGlyph>
      );
    case "utilities":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" fill="#fcd34d" />
        </svg>
      );
    case "health":
      return (
        <LucideGlyph className={className}>
          <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2z" />
        </LucideGlyph>
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
