import { Platform, TextStyle } from 'react-native';

export const FontFamily = Platform.select({
  ios: {
    display: 'Futura',
    body: 'System',
    mono: 'Menlo',
    rounded: 'System',
  },
  android: {
    display: 'sans-serif-condensed',
    body: 'sans-serif',
    mono: 'monospace',
    rounded: 'sans-serif',
  },
  web: {
    display: 'var(--font-display)',
    body: 'var(--font-body)',
    mono: 'var(--font-mono)',
    rounded: 'var(--font-rounded)',
  },
  default: {
    display: 'System',
    body: 'System',
    mono: 'monospace',
    rounded: 'System',
  },
});

export const Typography = {
  display1: {
    fontFamily: FontFamily.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: 1.5,
    fontWeight: '700',
  } as TextStyle,

  display2: {
    fontFamily: FontFamily.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 1,
    fontWeight: '700',
  } as TextStyle,

  display3: {
    fontFamily: FontFamily.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.8,
    fontWeight: '600',
  } as TextStyle,

  headline: {
    fontFamily: FontFamily.body,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  } as TextStyle,

  body: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  } as TextStyle,

  bodyBold: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  } as TextStyle,

  caption: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  } as TextStyle,

  small: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,

  score: {
    fontFamily: FontFamily.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 2,
    fontWeight: '700',
  } as TextStyle,

  scoreSmall: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 1.5,
    fontWeight: '600',
  } as TextStyle,

  tabLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

export type TypographyKey = keyof typeof Typography;
