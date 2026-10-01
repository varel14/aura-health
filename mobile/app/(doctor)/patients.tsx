import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, EmptyState, SearchBar } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { doctorWorkspaceService } from '@/services';
import { dayLabel } from '@/utils/format';

export default function DoctorPatients() {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const { data, loading } = useAsync(() => doctorWorkspaceService.patients(), []);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return (data ?? []).filter((p) => !q || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
        <Text style={styles.title}>Mes patients</Text>
        <View style={{ marginTop: spacing.m }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Rechercher un patient…" />
        </View>
      </View>
      {loading ? (
        <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m, gap: spacing.s }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skel} />
          ))}
        </View>
      ) : list.length === 0 ? (
        <EmptyState icon="people" title="Aucun patient trouvé" message="Aucun patient ne correspond à votre recherche." />
      ) : (
        <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m, flex: 1 }}>
          {list.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/(doctor)/patients/${p.id}`)}
            >
              <Avatar name={`${p.firstName} ${p.lastName}`} size={50} />
              <View style={{ flex: 1, marginLeft: spacing.m }}>
                <Text style={styles.name}>
                  {p.firstName} {p.lastName}
                </Text>
                <Text style={styles.sub}>
                  {p.age} ans • {p.sex === 'M' ? 'H' : 'F'} • {p.bloodType} • {p.city}
                </Text>
                <Text style={styles.last}>Dernière visite : {dayLabel(p.lastVisit)} — {p.lastMotif}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))}
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
  name: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  last: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 3 },
  skel: { height: 82, backgroundColor: colors.card, borderRadius: radii.l, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.s },
});
