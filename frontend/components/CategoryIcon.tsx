"use client";

import { CategoryIconGlyph } from "@/components/CategoryIconGlyphs";
import { getCategoryMeta } from "@/lib/category-icons";

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
