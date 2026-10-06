export const colors = {
  primary: '#0E9169',
  primaryDark: '#0A6B4A',
  primarySoft: '#DDF2E7',
  primaryTouch: '#0B7D59',
  accent: '#F59E0B',
  ai: '#7C3AED',
  aiSoft: '#EFE9FD',
  bg: '#F4F8F6',
  card: '#FFFFFF',
  text: '#14251D',
  textMuted: '#63756B',
  textFaint: '#94A69B',
  border: '#DFEAE4',
  divider: '#EBF3EF',
  success: '#1E8E3E',
  successSoft: '#E1F6EA',
  warning: '#C47F10',
  warningSoft: '#FDF2DC',
  danger: '#D64545',
  dangerSoft: '#FCE8E8',
  info: '#2E6BD6',
  infoSoft: '#E5EEFB',
  dark: '#0F211A',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

export const radii = {
  s: 10,
  m: 14,
  l: 20,
  xl: 28,
  full: 999,
} as const;

export const font = {
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 21,
    xxl: 25,
    title: 29,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0A2E20',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: '#0A2E20',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  button: {
    shadowColor: '#0A6B4A',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
} as const;

export const avatarPalette = [
  '#0E9169', '#2E6BD6', '#7C3AED', '#C47F10', '#D64545',
  '#0F8B8D', '#B85C38', '#5B8C2A', '#8A4FBF', '#31699E',
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
}
