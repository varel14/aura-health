import type { ReactNode } from 'react';
import { ColorValue, ScrollView, StyleProp, StyleSheet, Text, Pressable, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  large?: boolean;
  right?: ReactNode;
  left?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edges;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Screen({
  title,
  subtitle,
  onBack,
  large,
  right,
  left,
  scroll = true,
  padded = true,
  edges = ['top'],
  style,
  children,
}: ScreenProps) {
  const showHeader = Boolean(title || onBack || right || left);
  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      {showHeader && (
        <View style={[styles.header, !large && styles.headerCompact]}>
          <View style={styles.headerSide}>
            {onBack && (
              <Pressable onPress={onBack ?? (() => router.back())} style={styles.backBtn} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            )}
            {left}
          </View>
          <View style={{ flex: 1 }}>
            {title && !large && <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>}
          </View>
          <View style={styles.headerSideRight}>{right}</View>
        </View>
      )}
      {title && large && (
        <View style={[styles.largeTitleWrap, padded && styles.hpad]}>
          <Text style={styles.largeTitle}>{title}</Text>
          {subtitle && <Text style={styles.largeSubtitle}>{subtitle}</Text>}
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={padded ? styles.hpadScroll : undefined}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded && styles.hpad]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
  },
  headerCompact: { paddingBottom: spacing.s },
  headerSide: { flexDirection: 'row', alignItems: 'center', minWidth: 40 },
  headerSideRight: { flexDirection: 'row', alignItems: 'center', minWidth: 40, justifyContent: 'flex-end' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: font.size.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  largeTitleWrap: { paddingTop: spacing.l },
  largeTitle: { fontSize: font.size.title, fontWeight: '700', color: colors.text },
  largeSubtitle: { fontSize: font.size.base, color: colors.textMuted, marginTop: 4 },
  hpad: { paddingHorizontal: spacing.m },
  hpadScroll: { paddingHorizontal: spacing.m },
});

export function TabBarIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: ColorValue; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 46, height: 32 }}>
      <Ionicons name={name} size={22} color={color} />
      {focused && <View style={{ position: 'absolute', bottom: -6, width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />}
    </View>
  );
}
