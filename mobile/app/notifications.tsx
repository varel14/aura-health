import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui';
import { NotificationItem } from '@/components/domain';
import { colors, font, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';

export default function NotificationsScreen() {
  const { notifications, markAllNotificationsRead, markNotificationRead } = useAppData();
  const insets = useSafeAreaInsets();

  const unread = notifications.filter((n) => !n.read).length;

  const open = (id: string, deepLink: string) => {
    markNotificationRead(id);
    router.push(deepLink);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && (
            <Pressable onPress={markAllNotificationsRead} hitSlop={8}>
              <Text style={styles.markAll}>Tout marquer comme lu</Text>
            </Pressable>
          )}
        </View>
        {unread > 0 && (
          <View style={styles.unreadPill}>
            <Ionicons name="notifications" size={13} color={colors.primary} />
            <Text style={styles.unreadText}>{unread} notification{unread > 1 ? 's' : ''} non lue{unread > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState icon="notifications-off" title="Aucune notification" message="Vous serez informé ici de l’activité de vos rendez-vous, ordonnances et paiements." />
      ) : (
        <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m, gap: spacing.s, flex: 1 }}>
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onPress={() => open(n.id, n.deepLink)} />
          ))}
          <View style={{ height: 30 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  markAll: { fontSize: font.size.sm, color: colors.primary, fontWeight: '600' },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.s,
  },
  unreadText: { fontSize: font.size.xs, fontWeight: '700', color: colors.primaryDark },
});
