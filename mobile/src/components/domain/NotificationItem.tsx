import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '@/constants/theme';
import { AppNotification } from '@/models/types';
import { dayLabel } from '@/utils/format';

const typeMeta: Record<AppNotification['type'], { icon: keyof typeof Ionicons.glyphMap; bg: string; tint: string }> = {
  appointment: { icon: 'calendar', bg: colors.primarySoft, tint: colors.primary },
  message: { icon: 'chatbubble-ellipses', bg: colors.infoSoft, tint: colors.info },
  prescription: { icon: 'document-text', bg: colors.warningSoft, tint: colors.warning },
  renewal: { icon: 'refresh', bg: colors.warningSoft, tint: colors.warning },
  payment: { icon: 'card', bg: colors.successSoft, tint: colors.success },
  order: { icon: 'cube', bg: colors.successSoft, tint: colors.success },
  document: { icon: 'folder', bg: colors.aiSoft, tint: colors.ai },
  summary: { icon: 'sparkles', bg: colors.aiSoft, tint: colors.ai },
};

export function NotificationItem({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress?: () => void;
}) {
  const meta = typeMeta[notification.type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }, !notification.read && styles.unread]}
    >
      <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={20} color={meta.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.title, flex1]} numberOfLines={1}>{notification.title}</Text>
          {!notification.read && <View style={styles.dot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        <Text style={styles.time}>{dayLabel(notification.date)} • {notification.time}</Text>
      </View>
    </Pressable>
  );
}

const flex1 = { flex: 1 };

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.m,
    padding: spacing.m,
    borderRadius: radii.l,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: {
    backgroundColor: '#F2FAF7',
    borderColor: '#CBE8DF',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.size.base,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  body: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 19,
  },
  time: {
    fontSize: font.size.xs,
    color: colors.textFaint,
    marginTop: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
});
