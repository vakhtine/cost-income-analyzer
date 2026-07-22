export function BalkansLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 72" aria-hidden="true" role="img">
      <path
        d="M28 2C15.85 2 6 14.15 6 28c0 11.2 8.4 24.15 22 42 13.6-17.85 22-30.8 22-42C50 14.15 40.15 2 28 2z"
        fill="#0f2d44"
      />
      <path d="M28 16 19 38h18L28 16z" fill="#ffffff" />
      <path
        d="M12 46h32"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 48c5.5-2.5 10.5-3.5 16-3.5s10.5 1 16 3.5"
        stroke="#7eb8c9"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BalkansLogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`balkans-logo-wordmark ${className}`.trim()}>
      <BalkansLogo className="balkans-logo-mark" />
      <div className="balkans-logo-text">
        <strong>BALKANS</strong>
        <span>RELOCATION APP</span>
      </div>
    </div>
  );
}
