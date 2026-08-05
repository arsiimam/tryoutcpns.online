/**
 * BrandLogo – uses the actual logo PNG asset
 *
 * variant: "light" → logo normal (untuk background terang)
 *          "dark"  → logo normal (PNG sudah transparan, cocok di semua bg)
 * size:    "md" (default) | "sm"
 */

interface BrandLogoProps {
  variant?: "light" | "dark";
  size?: "md" | "sm";
}

export function BrandLogo({ size = "md" }: BrandLogoProps) {
  const height = size === "sm" ? 36 : 52;

  return (
    <img
      src="/brand-logo.png"
      alt="Tryout CPNS.Online"
      style={{ height, width: "auto", display: "block" }}
      draggable={false}
    />
  );
}
