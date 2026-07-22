"use client";

import { Fragment } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  cityShortName,
  CityCostProfile,
  COST_ITEM_CATEGORIES,
  costDifferencePct,
  EXPATISTAN_ITEM_LABELS,
  formatLocalPrice,
} from "@/lib/city-cost-items";

type Props = {
  baseProfile: CityCostProfile;
  destinationProfile: CityCostProfile;
  formatUsd: (amount: number) => string;
};

function PriceCell({
  priceUsd,
  priceLocal,
  localCurrency,
  formatUsd,
}: {
  priceUsd: number;
  priceLocal: number | null;
  localCurrency: string | null;
  formatUsd: (amount: number) => string;
}) {
  const local = formatLocalPrice(priceLocal, localCurrency);

  return (
    <div className="expatistan-price-cell">
      <strong>{formatUsd(priceUsd)}</strong>
      {local && localCurrency && (
        <span className="expatistan-local-price">
          ({local} {localCurrency})
        </span>
      )}
    </div>
  );
}

export function CityCostComparisonTable({ baseProfile, destinationProfile, formatUsd }: Props) {
  const baseMap = Object.fromEntries(baseProfile.items.map((item) => [item.key, item]));
  const destMap = Object.fromEntries(destinationProfile.items.map((item) => [item.key, item]));

  return (
    <div className="expatistan-cost-table-wrap">
      <table className="expatistan-cost-table">
        <thead>
          <tr>
            <th />
            <th>{cityShortName(baseProfile.city)}</th>
            <th>{cityShortName(destinationProfile.city)}</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {COST_ITEM_CATEGORIES.map((category) => (
            <Fragment key={category.label}>
              <tr className="expatistan-category-row">
                <td colSpan={4}>
                  <span className="expatistan-category-label">
                    <CategoryIcon category={category.label} size={56} className="expatistan-category-icon-badge" />
                    {category.label}
                  </span>
                </td>
              </tr>
              {category.keys.map((key, index) => {
                const baseItem = baseMap[key];
                const destItem = destMap[key];
                if (!baseItem || !destItem) return null;

                const diff = costDifferencePct(baseItem.priceUsd, destItem.priceUsd);
                const cheaper = diff < 0;
                const label = EXPATISTAN_ITEM_LABELS[key] ?? baseItem.label;

                return (
                  <tr key={key} className={index % 2 === 0 ? "expatistan-stripe" : ""}>
                    <td className="expatistan-item-label">{label}</td>
                    <td>
                      <PriceCell
                        priceUsd={baseItem.priceUsd}
                        priceLocal={baseItem.priceLocal}
                        localCurrency={baseProfile.metadata.localCurrency}
                        formatUsd={formatUsd}
                      />
                    </td>
                    <td>
                      <PriceCell
                        priceUsd={destItem.priceUsd}
                        priceLocal={destItem.priceLocal}
                        localCurrency={destinationProfile.metadata.localCurrency}
                        formatUsd={formatUsd}
                      />
                    </td>
                    <td className={`expatistan-diff ${cheaper ? "cheaper" : diff > 0 ? "pricier" : ""}`}>
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      <p className="expatistan-source-note">
        Source: {destinationProfile.metadata.dataSource} · updated{" "}
        {destinationProfile.metadata.updated}
      </p>
    </div>
  );
}
