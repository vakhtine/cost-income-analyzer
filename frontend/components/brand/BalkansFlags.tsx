type FlagProps = {
  className?: string;
  label: string;
};

function FlagImage({
  className = "",
  label,
  code,
}: FlagProps & { code: string }) {
  return (
    <div className={`balkans-flag ${className}`.trim()} title={label} aria-label={label}>
      <img
        src={`https://flagcdn.com/w160/${code}.png`}
        alt=""
        width={160}
        height={106}
        loading="lazy"
        decoding="async"
      />
      <span>{label}</span>
    </div>
  );
}

function FlagBulgariaSvg({ className = "", label }: FlagProps) {
  return (
    <div className={`balkans-flag ${className}`.trim()} title={label} aria-label={label}>
      <svg viewBox="0 0 90 60" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect width="90" height="20" fill="#ffffff" />
        <rect y="20" width="90" height="20" fill="#00966e" />
        <rect y="40" width="90" height="20" fill="#d62612" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function FlagAlbania(props: FlagProps) {
  return <FlagImage {...props} code="al" />;
}

export function FlagMontenegro(props: FlagProps) {
  return <FlagImage {...props} code="me" />;
}

export function FlagSerbia(props: FlagProps) {
  return <FlagImage {...props} code="rs" />;
}

export function FlagBulgaria(props: FlagProps) {
  return <FlagBulgariaSvg {...props} />;
}

export function FlagGeorgia(props: FlagProps) {
  return <FlagImage {...props} code="ge" />;
}

export function BalkansFlagsRow({ className = "" }: { className?: string }) {
  return (
    <div className={`balkans-flags-row ${className}`.trim()}>
      <FlagAlbania label="Albania" />
      <FlagMontenegro label="Montenegro" />
      <FlagSerbia label="Serbia" />
      <FlagBulgaria label="Bulgaria" />
      <FlagGeorgia label="Georgia" />
    </div>
  );
}
