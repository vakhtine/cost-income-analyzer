"use client";

import { CategoryIconGlyph } from "@/components/CategoryIconGlyphs";
import { formatCategoryDisplayName, getCategoryMeta } from "@/lib/category-icons";
import { formatMerchantList } from "@/lib/merchant-format";

type Props = {
  category: string;
  size?: number;
  className?: string;
  showLabel?: boolean;
};

export function CategoryIcon({
  category,
  size = 48,
  className = "",
  showLabel = false,
}: Props) {
  const { iconId, tone } = getCategoryMeta(category);
  const dimension = `${size}px`;

  return (
    <span
      className={`category-icon-badge ${tone} ${className}`.trim()}
      style={{ width: dimension, height: dimension, minWidth: dimension }}
      aria-hidden={showLabel ? undefined : true}
      title={category}
    >
      <CategoryIconGlyph iconId={iconId} className="category-icon-glyph" />
      {showLabel && <span className="category-icon-label">{category}</span>}
    </span>
  );
}

export function CategoryLabel({
  category,
  iconSize = 42,
  className = "",
  topMerchants,
}: {
  category: string;
  iconSize?: number;
  className?: string;
  topMerchants?: string[];
}) {
  return (
    <span className={`category-label-with-icon ${className}`.trim()}>
      <CategoryIcon category={category} size={iconSize} />
      <span className="category-label-text-block">
        <span>{formatCategoryDisplayName(category)}</span>
        {topMerchants && topMerchants.length > 0 ? (
          <span className="category-top-merchants">{formatMerchantList(topMerchants)}</span>
        ) : null}
      </span>
    </span>
  );
}
