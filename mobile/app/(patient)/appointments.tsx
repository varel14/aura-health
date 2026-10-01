import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui';
import { AppointmentCard } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { todayISO } from '@/utils/format';

export default function AppointmentsTab() {
  const doctorCache = useDoctorDirectory();
  const { appointments } = useAppData();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const insets = useSafeAreaInsets();
  const today = todayISO();

  const { upcoming, past } = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return {
      upcoming: sorted.filter((a) => a.date >= today && (a.status === 'confirmed' || a.status === 'pending')),
      past: [...sorted].reverse().filter((a) => a.status === 'completed' || a.status === 'cancelled' || a.date < today),
    };
  }, [appointments, today]);

  const list = tab === 'upcoming' ? upcoming : past;

  const doctorInfo = (id: string) => {
    const doc = doctorCache[id];
    return doc ?? { name: 'Médecin', specialty: 'Médecine' };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>Mes rendez-vous</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push('/doctors')}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.addText}>Nouveau</Text>
          </Pressable>
        </View>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'upcoming' && styles.tabActive]} onPress={() => setTab('upcoming')}>
            <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>À venir ({upcoming.length})</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'past' && styles.tabActive]} onPress={() => setTab('past')}>
            <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Passés ({past.length})</Text>
          </Pressable>
        </View>
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={tab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
          message={
            tab === 'upcoming'
              ? 'Prenez rendez-vous avec un médecin en quelques minutes, en vidéo, par chat ou en présentiel.'
              : 'Vos consultations terminées et annulées apparaîtront ici.'
          }
          actionLabel={tab === 'upcoming' ? 'Trouver un médecin' : undefined}
          onAction={tab === 'upcoming' ? () => router.push('/doctors') : undefined}
        />
      ) : (
        <View style={{ paddingHorizontal: spacing.m, gap: spacing.s, flex: 1 }}>
          {list.map((a) => {
            const info = doctorInfo(a.doctorId);
            return (
              <AppointmentCard
                key={a.id}
                appointment={a}
                doctorName={info.name}
                specialty={info.specialty}
                onPress={() => router.push(`/appointment/${a.id}`)}
              />
            );
          })}
          <View style={{ height: 30 }} />
        </View>
      )}
    </View>
  );
}

// doctor names resolved through the shared API-backed directory
import { useDoctorDirectory } from '@/services/doctorDirectory';

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { color: colors.white, fontSize: font.size.sm, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radii.full,
    padding: 4,
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.text },
});
