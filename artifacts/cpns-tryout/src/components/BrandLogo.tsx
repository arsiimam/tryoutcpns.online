/**
 * BrandLogo – pure CSS text logo
 *
 * Matches the style of the original image:
 *   TRYOUT  [CPNS    ]
 *           [.online ]
 *
 * "TRYOUT" in heavy navy/white, "CPNS" + ".online" inside a
 * rounded-right capsule border in cyan.
 *
 * variant: "light" → navy + cyan (landing page, light bg)
 *          "dark"  → white + cyan (sidebar, dark bg)
 * size:    "md" (default) | "sm" (footer / compact)
 */

interface BrandLogoProps {
  variant?: "light" | "dark";
  size?: "md" | "sm";
}

export function BrandLogo({ variant = "light", size = "md" }: BrandLogoProps) {
  const isLight = variant === "light";
  const isSm = size === "sm";

  const CYAN = "#00c8e8";
  const NAVY = isLight ? "#0d1f6e" : "#ffffff";

  const tryoutFontSize = isSm ? 13 : 17;
  const cpnsFontSize   = isSm ? 17 : 22;
  const dotFontSize    = isSm ? 9  : 11;
  const gap            = isSm ? 4  : 6;
  const borderPx       = isSm ? 1.5 : 2;
  const padX           = isSm ? [5, 9]  : [7, 13];
  const padY           = isSm ? [2, 2]  : [3, 3];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {/* TRYOUT */}
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: tryoutFontSize,
          color: NAVY,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        TRYOUT
      </span>

      {/* Capsule: CPNS + .online */}
      <div
        style={{
          border: `${borderPx}px solid ${CYAN}`,
          borderRadius: "4px 999px 999px 4px",
          paddingLeft:  padX[0],
          paddingRight: padX[1],
          paddingTop:   padY[0],
          paddingBottom: padY[1],
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: cpnsFontSize,
            color: CYAN,
            letterSpacing: "0.04em",
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          CPNS
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: dotFontSize,
            color: CYAN,
            letterSpacing: "0.06em",
            lineHeight: 1.2,
            opacity: 0.9,
          }}
        >
          .online
        </span>
      </div>
    </div>
  );
}
