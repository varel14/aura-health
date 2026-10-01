import type { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        padded && { padding: spacing.m },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
}: {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'purple';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.divider, fg: colors.textMuted },
    primary: { bg: colors.primarySoft, fg: colors.primaryDark },
    purple: { bg: colors.aiSoft, fg: colors.ai },
  };
  const v = map[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, size === 'sm' && styles.badgeSm, style]}>
      {icon}
      <Text style={[styles.badgeText, { color: v.fg }, size === 'sm' && { fontSize: font.size.xs - 1 }]}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const map: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
    confirmed: { label: 'Confirmé', variant: 'success' },
    pending: { label: 'En attente', variant: 'warning' },
    completed: { label: 'Terminé', variant: 'info' },
    cancelled: { label: 'Annulé', variant: 'danger' },
    paid: { label: 'Payé', variant: 'success' },
    failed: { label: 'Échoué', variant: 'danger' },
    refunded: { label: 'Remboursé', variant: 'info' },
    active: { label: 'Active', variant: 'success' },
    expired: { label: 'Expirée', variant: 'neutral' },
  };
  const v = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge label={v.label} variant={v.variant} size={size} />;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={6}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function TimelineItem({
  title,
  subtitle,
  date,
  color = colors.primary,
  last,
}: {
  title: string;
  subtitle?: string;
  date?: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: color }]} />
        {!last && <View style={[styles.timelineLine, { backgroundColor: color + '33' }]} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.m }}>
        <Text style={styles.timelineTitle}>{title}</Text>
        {subtitle && <Text style={styles.timelineSub}>{subtitle}</Text>}
        {date && <Text style={styles.timelineDate}>{date}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: font.size.xs,
    fontWeight: '700',
  } as TextStyle,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: font.size.sm,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
    marginTop: spacing.l,
  },
  sectionTitle: {
    fontSize: font.size.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionAction: {
    fontSize: font.size.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineCol: {
    alignItems: 'center',
    marginRight: spacing.m,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  timelineTitle: {
    fontSize: font.size.base,
    fontWeight: '600',
    color: colors.text,
  },
  timelineSub: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 19,
  },
  timelineDate: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    marginTop: 4,
  },
});
