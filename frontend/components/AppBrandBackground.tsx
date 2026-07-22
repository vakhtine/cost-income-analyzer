import { BalkansFlagsRow } from "@/components/brand/BalkansFlags";
import { AppBrandTaglines } from "@/components/brand/AppBrandTaglines";

export function AppBrandBackground() {
  return (
    <div className="app-brand-bg" aria-hidden="true">
      <div className="app-brand-bg-left">
        <AppBrandTaglines />
      </div>
      <BalkansFlagsRow className="app-brand-bg-flags" />
    </div>
  );
}
