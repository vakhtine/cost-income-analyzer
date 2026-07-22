export function AppBrandTaglines({ className = "" }: { className?: string }) {
  return (
    <div className={`app-brand-taglines ${className}`.trim()}>
      <p className="app-brand-tagline app-brand-tagline-navy">Your New Home.</p>
      <p className="app-brand-tagline app-brand-tagline-teal">Smart Decisions.</p>
      <p className="app-brand-tagline app-brand-tagline-green">Stronger Future.</p>
    </div>
  );
}
