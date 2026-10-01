import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, EmptyState, SearchBar } from '@/components/ui';
import { Badge } from '@/components/ui/Card';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';

export default function MessagesTab() {
  const { threads } = useAppData();
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return threads.filter((t) => !q || t.doctorName.toLowerCase().includes(q));
  }, [threads, query]);

  const lastMessage = (threadId: string) => {
    const t = threads.find((x) => x.id === threadId);
    const msg = t?.messages[t.messages.length - 1];
    if (!msg) return '';
    if (msg.kind === 'text') return msg.text ?? '';
    if (msg.kind === 'image') return '📷 Photo';
    if (msg.kind === 'document') return '📄 Document';
    if (msg.kind === 'audio') return '🎤 Message vocal';
    if (msg.kind === 'prescription') return '📋 Ordonnance partagée';
    return msg.text ?? '';
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
        <Text style={styles.title}>Messages</Text>
        <View style={{ marginTop: spacing.m }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Rechercher une conversation…" />
        </View>
      </View>
      {list.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={query ? 'Aucun résultat' : 'Aucun message'}
          message={
            query
              ? 'Aucune conversation ne correspond à votre recherche.'
              : 'Vos échanges avec vos médecins apparaîtront ici après une consultation par chat.'
          }
          actionLabel={query ? undefined : 'Prendre rendez-vous'}
          onAction={query ? undefined : () => router.push('/doctors')}
        />
      ) : (
        <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m, flex: 1 }}>
          {list.map((t) => {
            const last = t.messages[t.messages.length - 1];
            return (
              <Pressable
                key={t.id}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(`/consultation/chat/${t.id}`)}
              >
                <Avatar name={t.doctorName} size={50} />
                <View style={{ flex: 1, marginLeft: spacing.m }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{t.doctorName}</Text>
                    <Text style={styles.time}>{last?.time ?? ''}</Text>
                  </View>
                  <Text style={styles.preview} numberOfLines={1}>{lastMessage(t.id)}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <Badge label={t.doctorSpecialty} variant="primary" size="sm" />
                    {t.status === 'ended' && <Badge label="Consultation terminée" variant="neutral" size="sm" />}
                  </View>
                </View>
              </Pressable>
            );
          })}
          <View style={{ height: 30 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  name: { fontSize: font.size.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  time: { fontSize: font.size.xs, color: colors.textFaint },
  preview: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 3 },
});
