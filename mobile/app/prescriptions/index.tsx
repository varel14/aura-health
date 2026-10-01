import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { EmptyState, Screen } from '@/components/ui';
import { PrescriptionCard } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { dayLabel, todayISO } from '@/utils/format';

export default function PrescriptionsList() {
  const { prescriptions } = useAppData();
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const today = todayISO();

  const { active, past } = useMemo(() => {
    const sorted = [...prescriptions].sort((a, b) => b.date.localeCompare(a.date));
    return {
      active: sorted.filter((p) => p.status === 'active' && p.expiryDate >= today),
      past: sorted.filter((p) => p.status === 'expired' || p.expiryDate < today),
    };
  }, [prescriptions, today]);

  const list = tab === 'active' ? active : past;

  return (
    <Screen
      title="Mes ordonnances"
      onBack={() => router.back()}
      right={
        <Pressable style={styles.importBtn} onPress={() => router.push('/prescriptions/import')}>
          <Ionicons name="cloud-download" size={15} color={colors.white} />
          <Text style={styles.importText}>Importer</Text>
        </Pressable>
      }
    >
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'active' && styles.tabActive]} onPress={() => setTab('active')}>
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Actives ({active.length})</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'past' && styles.tabActive]} onPress={() => setTab('past')}>
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Passées ({past.length})</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="document-text"
          title={tab === 'active' ? 'Aucune ordonnance active' : 'Aucune ordonnance passée'}
          message={
            tab === 'active'
              ? 'Les ordonnances délivrées par vos médecins sur AuraHealth, ainsi que celles que vous importez, apparaîtront ici.'
              : 'Vos ordonnances expirées seront archivées ici.'
          }
          actionLabel={tab === 'active' ? 'Importer une ordonnance' : undefined}
          onAction={tab === 'active' ? () => router.push('/prescriptions/import') : undefined}
        />
      ) : (
        <View style={{ gap: spacing.s }}>
          {list.map((rx) => (
            <PrescriptionCard
              key={rx.id}
              doctorName={rx.doctorName}
              date={dayLabel(rx.date)}
              establishment={rx.establishment}
              medicationCount={rx.lines.length}
              expiryLabel={tab === 'active' ? `Expire le ${dayLabel(rx.expiryDate)}` : undefined}
              status={rx.status}
              source={rx.source}
              onPress={() => router.push(`/prescriptions/${rx.id}`)}
            />
          ))}
        </View>
      )}

      {tab === 'active' && active.length > 0 && (
        <Pressable style={styles.orderCta} onPress={() => router.push('/medications')}>
          <Ionicons name="cart" size={18} color={colors.white} />
          <Text style={styles.orderCtaText}>Commander mes médicaments en pharmacie</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  importText: { color: colors.white, fontSize: font.size.xs, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radii.full,
    padding: 4,
    marginBottom: spacing.m,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.full },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.text },
  orderCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.m,
    paddingVertical: 14,
    marginTop: spacing.m,
  },
  orderCtaText: { color: colors.white, fontWeight: '700', fontSize: font.size.sm },
});
