// Logo SVG de VestIA. Lo usamos en el header, en la landing y en pantallas
// de carga. El "tone" controla los colores: 'default' usa la marca violeta,
// 'inverse' usa blanco para superficies oscuras o gradientes.

type Props = {
  size?: number;
  tone?: "default" | "inverse";
  className?: string;
  title?: string;
};

export default function Logo({
  size = 40,
  tone = "default",
  className,
  title = "VestIA",
}: Props) {
  const principal = tone === "inverse" ? "#ffffff" : "var(--color-primary)";
  const secundario =
    tone === "inverse"
      ? "rgba(255,255,255,0.55)"
      : "var(--color-primary-mid)";
  const fondo =
    tone === "inverse" ? "rgba(255,255,255,0.18)" : "var(--color-primary-light)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect width="72" height="72" rx="20" fill={fondo} />
      <path
        d="M20 22 L36 52 L52 22"
        stroke={principal}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="36" cy="52" r="5" fill={principal} />
      <path
        d="M28 22 L36 38 L44 22"
        stroke={secundario}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
