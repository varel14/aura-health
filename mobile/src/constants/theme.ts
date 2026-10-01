export const colors = {
  primary: '#6200EE',
  primaryDark: '#3700B3',
  primarySoft: '#EDE2FD',
  primaryTouch: '#5600D1',
  accent: '#F59E0B',
  ai: '#7C3AED',
  aiSoft: '#EFE9FD',
  bg: '#F6F8F9',
  card: '#FFFFFF',
  text: '#152220',
  textMuted: '#667573',
  textFaint: '#93A3A0',
  border: '#E4EAE9',
  divider: '#EEF2F1',
  success: '#178A50',
  successSoft: '#E1F6EA',
  warning: '#C47F10',
  warningSoft: '#FDF2DC',
  danger: '#D64545',
  dangerSoft: '#FCE8E8',
  info: '#2E6BD6',
  infoSoft: '#E5EEFB',
  dark: '#0F1D1A',
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
    shadowColor: '#0F2E29',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: '#0F2E29',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const avatarPalette = [
  '#6200EE', '#2E6BD6', '#7C3AED', '#C47F10', '#D64545',
  '#0F8B8D', '#B85C38', '#5B8C2A', '#8A4FBF', '#31699E',
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
}
