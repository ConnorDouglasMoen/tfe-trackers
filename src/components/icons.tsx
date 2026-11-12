type IconProps = { size?: number; className?: string };

export function CloseIcon({
  size = 14,
  strokeWidth = 2,
  color = "currentColor",
  className,
}: IconProps & { strokeWidth?: number; color?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" className={className}>
      <path
        d="M3 3l10 10M13 3L3 13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon({ size = 12, open, className }: IconProps & { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""} ${className ?? ""}`}
    >
      <path
        d="M5 3l6 5-6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const strokeIconProps = {
  viewBox: "0 0 16 16",
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg {...strokeIconProps} width={size} height={size} strokeWidth="2">
      <polyline points="2,8 6,12 14,4" />
    </svg>
  );
}

export function PencilIcon({ size = 14 }: IconProps) {
  return (
    <svg {...strokeIconProps} width={size} height={size} strokeWidth="1.5">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </svg>
  );
}

export function CrosshairIcon({ size = 14 }: IconProps) {
  return (
    <svg {...strokeIconProps} width={size} height={size} strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3" />
    </svg>
  );
}

export function DragHandleIcon({ size = 12 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      {[4, 8, 12].flatMap((cy) => [
        <circle key={`l${cy}`} cx="5" cy={cy} r="1.2" />,
        <circle key={`r${cy}`} cx="11" cy={cy} r="1.2" />,
      ])}
    </svg>
  );
}
