/**
 * Design tokens synced from the sibling CPNS Tryout web app (artifacts/cpns-tryout/src/index.css).
 * Primary: Navy hsl(213 74% 24%), Accent: Amber hsl(38 92% 50%)
 */

const colors = {
  light: {
    text: '#070d1f',
    tint: '#10396b',

    background: '#f5f8fc',
    foreground: '#070d1f',

    card: '#ffffff',
    cardForeground: '#070d1f',

    primary: '#10396b',       // Navy - hsl(213 74% 24%)
    primaryForeground: '#f5f8fc',

    secondary: '#eef2f8',
    secondaryForeground: '#1a2a42',

    muted: '#eef2f8',
    mutedForeground: '#6c7898',

    accent: '#f59f0a',        // Amber - hsl(38 92% 50%)
    accentForeground: '#070d1f',

    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    border: '#d7e2f0',
    input: '#d7e2f0',

    // Sidebar / navy surface
    navy: '#10396b',
    navyForeground: '#f5f8fc',
  },

  dark: {
    text: '#f5f8fc',
    tint: '#4d89d4',

    background: '#070d1f',
    foreground: '#f5f8fc',

    card: '#0f1f3d',
    cardForeground: '#f5f8fc',

    primary: '#10396b',
    primaryForeground: '#f5f8fc',

    secondary: '#1a2a42',
    secondaryForeground: '#f5f8fc',

    muted: '#1a2a42',
    mutedForeground: '#8ca0c0',

    accent: '#f59f0a',
    accentForeground: '#070d1f',

    destructive: '#7f1d1d',
    destructiveForeground: '#f5f8fc',

    border: '#1e3358',
    input: '#1e3358',

    navy: '#0d2147',
    navyForeground: '#f5f8fc',
  },

  radius: 8,
};

export default colors;
