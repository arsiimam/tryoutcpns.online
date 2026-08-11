/**
 * BrandLogo – gunakan file PNG sesuai background
 *
 * variant: "light" → logo-navy.png  (untuk background putih/terang)
 *          "dark"  → logo-white.png (untuk background gelap/berwarna)
 * size:    "md" (default) | "sm"
 */

interface BrandLogoProps {
  variant?: "light" | "dark";
  size?: "md" | "sm";
}

export function BrandLogo({ variant = "light", size = "md" }: BrandLogoProps) {
  const src = variant === "dark" ? "/logo-white.png" : "/logo-navy.png";
  const height = size === "sm" ? 36 : 56;

  return (
    <img
      src={src}
      alt="Tryout CPNS Online"
      style={{ height, width: "auto", display: "block" }}
      draggable={false}
    />
  );
}
