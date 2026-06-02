import { cn } from "@/lib/utils"

/**
 * ClearLedger wordmark. The blue gradient is the fixed brand accent; the
 * outline, data lines and lettering use `currentColor` so the logo stays
 * legible on both the dark (default) and light themes — it inherits whatever
 * text color is in scope (foreground, sidebar-foreground, card-foreground…).
 */
export function ClearLedgerLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 120"
      role="img"
      aria-label="ClearLedger"
      className={cn("h-auto w-full max-w-[250px]", className)}
    >
      <defs>
        <linearGradient id="clearLedgerBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Minimalist icon */}
      <g transform="translate(20, 25)">
        {/* "Clear" layer (solid, brand blue) */}
        <rect
          x="0"
          y="0"
          width="45"
          height="45"
          rx="10"
          fill="url(#clearLedgerBlue)"
          opacity="0.9"
        />
        {/* "Ledger" layer (structure outline) */}
        <rect
          x="18"
          y="18"
          width="45"
          height="45"
          rx="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />

        {/* Data lines */}
        <line
          x1="28"
          y1="32"
          x2="52"
          y2="32"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="28"
          y1="46"
          x2="42"
          y2="46"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* Wordmark */}
      <text
        x="105"
        y="72"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
        fontSize="48"
        fill="currentColor"
      >
        <tspan fontWeight="800" letterSpacing="-1">
          Clear
        </tspan>
        <tspan fontWeight="300" fill="currentColor" opacity="0.55" letterSpacing="-1">
          Ledger
        </tspan>
      </text>

      {/* Tagline */}
      <text
        x="110"
        y="98"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="12"
        letterSpacing="2.5"
        fill="currentColor"
        opacity="0.45"
        fontWeight="600"
      >
        FINANCIAL CLARITY ENGINE
      </text>
    </svg>
  )
}
