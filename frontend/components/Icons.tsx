type IconProps = {
  size?: number;
  className?: string;
};

function Svg({
  children,
  size = 20,
  className,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconShield({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3l7 3v6c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6l7-3z" />
      <path d="M9.5 12l2 2 4-4" />
    </Svg>
  );
}

export function IconLaptop({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="5" width="18" height="11" rx="2" />
      <path d="M2 18h20" />
    </Svg>
  );
}

export function IconGlobe({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 3 4.2 6.2 4.2 9s-1.4 6-4.2 9" />
      <path d="M12 3c-2.8 3-4.2 6.2-4.2 9s1.4 6 4.2 9" />
    </Svg>
  );
}

export function IconTrash({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
    </Svg>
  );
}

export function IconUpload({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 16V6" />
      <path d="M8 10l4-4 4 4" />
      <path d="M4 18h16" />
    </Svg>
  );
}

export function IconFile({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M8 4h6l4 4v12H8z" />
      <path d="M14 4v4h4" />
    </Svg>
  );
}

export function IconBrowser({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
      <circle cx="7" cy="7" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSparkle({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3l1.6 4.8L18 9l-4.4 1.2L12 15l-1.6-4.8L6 9l4.4-1.2L12 3z" />
      <path d="M18 15l.8 2.4L21 18l-2.2.6L18 21l-.8-2.4L15 18l2.2-.6L18 15z" />
    </Svg>
  );
}

export function IconArrowRight({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconExcel({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="2" width="18" height="20" rx="2" fill="#217346" />
      <path d="M7 7h10M7 11h10M7 15h10" stroke="#fff" strokeWidth="1.2" strokeOpacity="0.55" />
      <path
        d="M8.5 16.5 10.5 13l2 3.5 2-3.5 2 3.5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
