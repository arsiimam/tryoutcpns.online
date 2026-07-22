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

  const BLUE   = isLight ? "#4f5eea" : "#7c8ff5";
  const NAVY   = isLight ? "#0f172a" : "#ffffff";

  const tryoutFontSize = isSm ? 11 : 14;
  const cpnsFontSize   = isSm ? 14 : 18;
  const dotFontSize    = isSm ? 8  : 9;
  const gap            = isSm ? 3  : 4;
  const borderPx       = isSm ? 1.5 : 1.5;
  const padX           = isSm ? [4, 7]  : [5, 10];
  const padY           = isSm ? [1, 1]  : [2, 2];

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
          border: `${borderPx}px solid ${BLUE}`,
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
            color: BLUE,
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
            color: BLUE,
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
