import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, font, radii, spacing } from '@/constants/theme';

export function EmptyState({
  icon = 'folder-open',
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && { paddingVertical: spacing.l }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="sm" style={{ marginTop: spacing.m }} />
      )}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>Oups, une erreur est survenue</Text>
      <Text style={styles.message}>
        {message ?? 'Impossible de charger les données. Vérifiez votre connexion internet puis réessayez.'}
      </Text>
      {onRetry && (
        <Button title="Réessayer" icon="refresh" onPress={onRetry} size="sm" style={{ marginTop: spacing.m }} />
      )}
    </View>
  );
}

export function Skeleton({
  width,
  height = 14,
  radius = 7,
  style,
}: {
  width: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.divider,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={{ gap: spacing.m }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.rowCard}>
          <Skeleton width={48} height={48} radius={24} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width={'70%' as DimensionValue} height={14} />
            <Skeleton width={'45%' as DimensionValue} height={12} />
          </View>
          <Skeleton width={60} height={22} radius={11} />
        </View>
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  return (
    <View style={{ gap: spacing.m }}>
      <View style={styles.rowCard}>
        <Skeleton width={64} height={64} radius={32} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={'55%' as DimensionValue} height={16} />
          <Skeleton width={'40%' as DimensionValue} height={13} />
        </View>
      </View>
      <Skeleton width={'100%' as DimensionValue} height={120} radius={radii.l} />
      <Skeleton width={'100%' as DimensionValue} height={90} radius={radii.l} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl + spacing.l,
    paddingHorizontal: spacing.l,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  title: {
    fontSize: font.size.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 280,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.m,
  },
});
