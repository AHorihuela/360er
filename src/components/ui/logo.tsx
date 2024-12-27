interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-10 h-10 ${className}`}
      aria-label="Squad360 Logo"
    >
      {/* Main circle */}
      <circle
        className="logo-circle"
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Dynamic lines */}
      <g className="logo-lines" stroke="currentColor" strokeWidth="2">
        <line x1="50" y1="10" x2="50" y2="25" />
        <line x1="90" y1="50" x2="75" y2="50" />
        <line x1="50" y1="90" x2="50" y2="75" />
        <line x1="10" y1="50" x2="25" y2="50" />
        <line x1="75" y1="25" x2="65" y2="35" />
        <line x1="75" y1="75" x2="65" y2="65" />
        <line x1="25" y1="75" x2="35" y2="65" />
        <line x1="25" y1="25" x2="35" y2="35" />
      </g>

      {/* 360 text */}
      <text
        className="logo-number"
        x="50"
        y="55"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="currentColor"
      >
        360
      </text>
    </svg>
  );
} 