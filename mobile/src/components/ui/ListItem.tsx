import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';

export function ListItem({
  icon,
  iconBg = colors.primarySoft,
  iconTint = colors.primary,
  title,
  subtitle,
  right,
  onPress,
  chevron = true,
  danger,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconTint?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, style, pressed && { opacity: 0.75 }]}
    >
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={danger ? colors.danger : iconTint} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, danger && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
      {chevron && onPress && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: 12,
    paddingHorizontal: spacing.m,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.size.base,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  infoLabel: {
    fontSize: font.size.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: font.size.sm,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
