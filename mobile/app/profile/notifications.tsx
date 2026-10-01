import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';

const settings = [
  { key: 'appointments', title: 'Rappels de rendez-vous', sub: 'Notification 2h avant chaque consultation', def: true },
  { key: 'messages', title: 'Messages des médecins', sub: 'Nouveaux messages et documents reçus', def: true },
  { key: 'prescriptions', title: 'Ordonnances', sub: 'Ordonnance disponible et renouvellement', def: true },
  { key: 'payments', title: 'Paiements', sub: 'Confirmation, échec et remboursement', def: true },
  { key: 'orders', title: 'Commandes pharmacie', sub: 'Suivi des commandes de médicaments', def: false },
  { key: 'marketing', title: 'Conseils santé AuraHealth', sub: 'Contenus de prévention et actualités (rare)', def: false },
];

export default function NotificationSettings() {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(settings.map((s) => [s.key, s.def])),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Notifications" onBack={() => router.back()} subtitle="Choisissez les alertes que vous souhaitez recevoir.">
        {settings.map((s, i) => (
          <View key={s.key} style={[styles.row, i === settings.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.sub}>{s.sub}</Text>
            </View>
            <Switch
              value={state[s.key]}
              onValueChange={(v) => setState((cur) => ({ ...cur, [s.key]: v }))}
              trackColor={{ true: colors.primary }}
            />
          </View>
        ))}
        <Text style={styles.foot}>
          Les notifications critiques liées à votre sécurité (rappel de prise de médicaments urgent, alerte de garde)
          ne peuvent pas être désactivées.
        </Text>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radii.m,
    borderTopRightRadius: radii.m,
    borderBottomLeftRadius: radii.m,
    borderBottomRightRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  title: { fontSize: font.size.base, fontWeight: '600', color: colors.text },
  sub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  foot: { fontSize: font.size.xs, color: colors.textFaint, lineHeight: 17, marginTop: spacing.m },
});
