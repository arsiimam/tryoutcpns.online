/**
 * BrandLogo – clean modern wordmark
 *
 * variant: "light" → dark text + indigo accent (for white/light backgrounds)
 *          "dark"  → white text + indigo accent (for dark/colored backgrounds)
 * size:    "md" (default) | "sm"
 */

interface BrandLogoProps {
  variant?: "light" | "dark";
  size?: "md" | "sm";
}

export function BrandLogo({ variant = "light", size = "md" }: BrandLogoProps) {
  const isDark = variant === "dark";
  const isSm = size === "sm";

  const accent      = "#4f46e5";           // indigo-600
  const textPrimary = isDark ? "#fff"      : "#0f172a";
  const textMuted   = isDark ? "rgba(255,255,255,0.55)" : "#64748b";

  const tryoutSize  = isSm ? 9  : 11;
  const cpnsSize    = isSm ? 17 : 22;
  const dotSize     = isSm ? 8  : 9;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSm ? 5 : 7,
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      {/* Accent square mark */}
      <div
        style={{
          width:  isSm ? 22 : 28,
          height: isSm ? 22 : 28,
          borderRadius: isSm ? 5 : 7,
          background: `linear-gradient(135deg, ${accent} 0%, #6366f1 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: isSm ? 10 : 13,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          C
        </span>
      </div>

      {/* Text group */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
            fontWeight: 500,
            fontSize: tryoutSize,
            color: textMuted,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          TRYOUT
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
              fontWeight: 800,
              fontSize: cpnsSize,
              color: textPrimary,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            CPNS
          </span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
              fontWeight: 500,
              fontSize: dotSize,
              color: accent,
              letterSpacing: "0.01em",
              lineHeight: 1,
            }}
          >
            .online
          </span>
        </div>
      </div>
    </div>
  );
}
