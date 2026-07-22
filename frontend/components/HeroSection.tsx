"use client";

import { HeroFeatureGrid } from "@/components/brand/HeroFeatureGrid";
import { IconBrowser, IconFile, IconSparkle } from "@/components/Icons";

type Props = {
  showFeatures?: boolean;
};

export function HeroSection({ showFeatures = true }: Props) {
  return (
    <>
      <section className="hero-brand-strip" aria-label="Welcome">
        <p className="hero-script">
          <span className="hero-script-place">New Place.</span>{" "}
          <span className="hero-script-chapter">New Chapter.</span>
        </p>
        <h1 className="hero-brand-title">Balkans Relocation App</h1>
        <p className="hero-brand-tagline hero-brand-vivid">
          <span className="hero-vivid-explore">Explore.</span>{" "}
          <span className="hero-vivid-analyze">Analyze.</span>{" "}
          <span className="hero-vivid-decide">Decide.</span>{" "}
          <span className="hero-vivid-thrive">Thrive.</span>
        </p>
        <p className="hero-brand-sub hero-brand-sub-black">
          Compare cities, analyze finances, and find affordable living — all in your browser.
        </p>
      </section>

      {showFeatures && (
        <div className="hero-features-wrap">
          <HeroFeatureGrid />
        </div>
      )}
    </>
  );
}

export function PrivacyFlow() {
  return (
    <div className="privacy-flow">
      <div className="privacy-step">
        <span className="privacy-step-icon-wrap">
          <IconFile size={22} />
        </span>
        <span>Your CSV</span>
      </div>
      <div className="privacy-arrow">→</div>
      <div className="privacy-step highlight">
        <span className="privacy-step-icon-wrap active">
          <IconBrowser size={22} />
        </span>
        <span>Your browser</span>
      </div>
      <div className="privacy-arrow">→</div>
      <div className="privacy-step">
        <span className="privacy-step-icon-wrap">
          <IconSparkle size={22} />
        </span>
        <span>Insights</span>
      </div>
    </div>
  );
}
