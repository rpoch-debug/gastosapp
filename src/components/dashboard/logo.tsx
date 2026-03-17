export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="#3b82f6" />
      {/* Chart bars */}
      <rect x="8" y="22" width="5" height="11" rx="1.5" fill="white" fillOpacity="0.4" />
      <rect x="15.5" y="16" width="5" height="17" rx="1.5" fill="white" fillOpacity="0.65" />
      <rect x="23" y="10" width="5" height="23" rx="1.5" fill="white" />
      {/* Trend line */}
      <path
        d="M9 21 L17 15 L24.5 9"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot at top */}
      <circle cx="24.5" cy="9" r="2" fill="#34d399" />
    </svg>
  );
}
