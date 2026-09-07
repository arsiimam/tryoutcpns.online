/**
 * BrandLogo – gunakan file PNG sesuai background
 *
 * variant: "light" → logo-navy.png  (untuk background putih/terang)
 *          "dark"  → logo-white.png (untuk background gelap/berwarna)
 * size:    "md" (default) | "sm" | "lg"
 *          sm = 36px (footer)
 *          md = 56px (dashboard & admin sidebar — ruang strip terbatas, 64px)
 *          lg = 68px (landing page nav — ruang lebih lega, 80px)
 */

interface BrandLogoProps {
  variant?: "light" | "dark";
  size?: "md" | "sm" | "lg";
}

export function BrandLogo({ variant = "light", size = "md" }: BrandLogoProps) {
  const src = variant === "dark" ? "/logo-white.png" : "/logo-navy.png";
  const height = size === "sm" ? 36 : size === "lg" ? 68 : 56;

  return (
    <img
      src={src}
      alt="Tryout CPNS Online"
      style={{ height, width: "auto", display: "block" }}
      draggable={false}
    />
  );
}
