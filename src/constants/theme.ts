import '@/global.css';
import { FontFamily as Fonts } from './typography';
export { Fonts };

export const Palette = {
  black: '#0D0D1A',
  blackLight: '#1A1A2E',
  surface: '#222240',
  surfaceLight: '#2A2A4A',
  white: '#FFFFFF',
  whiteMuted: '#B8B8D0',
  whiteDim: '#6B6B8A',

  neonGreen: '#00FFB2',
  neonOrange: '#FF6B35',
  neonPurple: '#6C5CE7',
  neonYellow: '#FFD700',
  neonPink: '#FF3366',
  neonCyan: '#00E5FF',
  neonBlue: '#00B4FF',

  greenDim: '#004D36',
  orangeDim: '#4D1F0A',
  purpleDim: '#1F1A4D',
  blueDim: '#002D4D',
} as const;

export type NeonAccent = 'green' | 'orange' | 'purple' | 'cyan' | 'pink' | 'yellow';

export const AccentMap: Record<NeonAccent, { main: string; dim: string }> = {
  green: { main: Palette.neonGreen, dim: Palette.greenDim },
  orange: { main: Palette.neonOrange, dim: Palette.orangeDim },
  purple: { main: Palette.neonPurple, dim: Palette.purpleDim },
  cyan: { main: Palette.neonCyan, dim: '#00334D' },
  pink: { main: Palette.neonPink, dim: '#4D0020' },
  yellow: { main: Palette.neonYellow, dim: '#4D3F00' },
};

export const Colors = {
  light: {
    text: Palette.black,
    background: '#F5F5FA',
    surface: Palette.white,
    surfaceBorder: '#E0E0EC',
    textSecondary: Palette.whiteDim,
    textMuted: '#9A9AB0',
    tabBar: Palette.white,
    tabBarBorder: '#E0E0EC',
    // Accessible light mode accent colors (contrast >= 4.5:1 on white/light gray)
    neonGreen: '#00855A',
    neonOrange: '#C84B1E',
    neonPurple: '#5243C0',
    neonYellow: '#8A7300',
    neonPink: '#C71B4B',
    neonCyan: '#007A99',
    neonBlue: '#005FB8',
  },
  dark: {
    text: Palette.white,
    background: Palette.black,
    surface: Palette.blackLight,
    surfaceBorder: '#2A2A4A',
    textSecondary: Palette.whiteMuted,
    textMuted: Palette.whiteDim,
    tabBar: Palette.blackLight,
    tabBarBorder: '#2A2A4A',
    // Vibrant neon dark mode accent colors
    neonGreen: Palette.neonGreen,
    neonOrange: Palette.neonOrange,
    neonPurple: Palette.neonPurple,
    neonYellow: Palette.neonYellow,
    neonPink: Palette.neonPink,
    neonCyan: Palette.neonCyan,
    neonBlue: Palette.neonBlue,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const NeonGlow = {
  green: {
    shadowColor: Palette.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  orange: {
    shadowColor: Palette.neonOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  purple: {
    shadowColor: Palette.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const BottomTabInset = 0;

export const MaxContentWidth = 600;
