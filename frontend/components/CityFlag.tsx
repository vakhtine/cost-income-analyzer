import { getCityFlagCode } from "@/lib/city-flags";

type Props = {
  city: string;
  size?: number;
  className?: string;
};

export function CityFlag({ city, size = 22, className = "" }: Props) {
  const code = getCityFlagCode(city);
  if (!code) return null;

  return (
    <img
      className={`city-flag-icon ${className}`.trim()}
      src={`https://flagcdn.com/w80/${code}.png`}
      alt=""
      width={size * 1.5}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size * 1.5, height: size }}
    />
  );
}
