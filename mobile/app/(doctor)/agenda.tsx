import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui';
import { PatientAppointmentRow, consultationTypeInfo } from '@/components/domain';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { doctorWorkspaceService } from '@/services';
import { shortDay, todayISO } from '@/utils/format';

export default function DoctorAgenda() {
  const insets = useSafeAreaInsets();
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => todayISO(i)), []);
  const [selected, setSelected] = useState(todayISO());
  const agenda = useAsync(() => doctorWorkspaceService.dayAppointments(selected), [selected]);

  // The backend serves the real per-day agenda (working days and slots).
  const items = useMemo(() => agenda.data?.appointments ?? [], [agenda.data]);

  const inPerson = items.filter((i) => i.type === 'in-person').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
        <Text style={styles.title}>Agenda</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: spacing.m }}>
          <View style={{ flexDirection: 'row', gap: spacing.s, paddingBottom: 2 }}>
            {dates.map((d) => {
              const s = shortDay(d);
              const active = d === selected;
              return (
                <Pressable key={d} onPress={() => setSelected(d)} style={[styles.dateChip, active && styles.dateChipActive]}>
                  <Text style={[styles.dateWeekday, active && { color: colors.white }]}>{s.weekday}</Text>
                  <Text style={[styles.dateDay, active && { color: colors.white }]}>{s.day}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="calendar" size={13} color={colors.primary} />
            <Text style={styles.summaryText}>{items.length} rendez-vous</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="people" size={13} color={colors.info} />
            <Text style={styles.summaryText}>{inPerson} en présentiel</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={13} color={colors.warning} />
            <Text style={styles.summaryText}>
              {items.length ? `${items[0].time} – ${items[items.length - 1].time}` : '—'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.m, paddingTop: spacing.s, paddingBottom: 40, gap: spacing.s }}
      >
        {items.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Journée sans consultation"
            message="Aucun rendez-vous n’est prévu à cette date. Les patients peuvent toutefois demander des créneaux."
          />
        ) : (
          items.map((a) => (
            <PatientAppointmentRow
              key={a.id}
              appointment={a}
              onPress={() => router.push(`/appointment/${a.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  dateChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.m,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 56,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateWeekday: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
  dateDay: { fontSize: font.size.md, fontWeight: '800', color: colors.text, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryText: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600' },
});
