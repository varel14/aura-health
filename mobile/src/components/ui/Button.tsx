import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { bg: ViewStyle; text: TextStyle; elevated?: boolean }> = {
  primary: { bg: { backgroundColor: colors.primary }, text: { color: colors.white }, elevated: true },
  secondary: { bg: { backgroundColor: colors.dark }, text: { color: colors.white }, elevated: true },
  outline: { bg: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary }, text: { color: colors.primary } },
  ghost: { bg: { backgroundColor: 'transparent' }, text: { color: colors.primary } },
  danger: { bg: { backgroundColor: colors.danger }, text: { color: colors.white }, elevated: true },
  soft: { bg: { backgroundColor: colors.primarySoft }, text: { color: colors.primaryDark } },
};

const sizeStyles: Record<Size, { pad: ViewStyle; text: TextStyle; icon: number }> = {
  sm: { pad: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 38 }, text: { fontSize: font.size.sm }, icon: 15 },
  md: { pad: { paddingVertical: 13, paddingHorizontal: 20, minHeight: 50 }, text: { fontSize: font.size.md }, icon: 18 },
  lg: { pad: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 56 }, text: { fontSize: font.size.md }, icon: 20 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        s.pad,
        v.bg,
        fullWidth && { alignSelf: 'stretch' },
        v.elevated && !isDisabled && shadow.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' || variant === 'soft' ? colors.primary : colors.white} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={s.icon} color={v.text.color} style={{ marginRight: 8 }} />}
          <Text style={[styles.text, s.text, v.text]}>{title}</Text>
          {iconRight && <Ionicons name={iconRight} size={s.icon} color={v.text.color} style={{ marginLeft: 8 }} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.m,
  },
  text: {
    fontWeight: '600',
    fontSize: font.size.md,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});

export function IconButton({
  name,
  onPress,
  size = 22,
  color = colors.text,
  background,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
          transform: pressed ? [{ scale: 0.96 }] : [],
          backgroundColor: background ?? 'transparent',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
  tint = colors.primary,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  tint?: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        actionStyles.actionRow,
        pressed && { backgroundColor: colors.divider, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[actionStyles.actionIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[actionStyles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sublabel && <Text style={actionStyles.actionSub}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: 12,
    paddingHorizontal: spacing.m,
    borderRadius: radii.m,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: font.size.base,
    fontWeight: '600',
    color: colors.text,
  },
  actionSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});

export const ShortcutTile = ({
  icon,
  label,
  onPress,
  tint = colors.primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  tint?: string;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      {
        flex: 1,
        minWidth: 96,
        backgroundColor: colors.card,
        borderRadius: radii.l,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.m,
        alignItems: 'center',
        gap: spacing.s,
        opacity: pressed ? 0.9 : 1,
        transform: pressed ? [{ scale: 0.96 }] : [],
      },
    ]}
  >
    <View style={{ width: 44, height: 44, borderRadius: radii.m, backgroundColor: `${tint}15`, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color={tint} />
    </View>
    <Text style={{ fontSize: font.size.xs, color: colors.text, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
  </Pressable>
);
