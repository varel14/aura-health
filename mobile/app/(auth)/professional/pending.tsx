import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Screen } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';

const steps = [
  { label: 'Demande reçue', sub: 'Vos informations ont bien été transmises.', state: 'done' as const },
  { label: 'Vérification des documents', sub: 'Notre équipe examine vos justificatifs.', state: 'current' as const },
  { label: 'Activation du compte', sub: 'Vous recevrez un e-mail de confirmation.', state: 'todo' as const },
];

export default function ProfessionalPending() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Demande envoyée">
        <View style={styles.wrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="hourglass" size={38} color={colors.warning} />
          </View>
          <Text style={styles.title}>Votre demande est en cours de vérification</Text>
          <Text style={styles.text}>
            Notre équipe vérifie les informations de votre établissement. Vous serez notifié par e-mail et par SMS dès
            l’activation de votre compte, généralement sous 48 heures.
          </Text>
          <View style={styles.timeline}>
            {steps.map((s, i) => (
              <View key={s.label} style={styles.stepRow}>
                <View style={[styles.stepIcon, s.state === 'done' && { backgroundColor: colors.successSoft }, s.state === 'current' && { backgroundColor: colors.warningSoft }]}>
                  <Ionicons
                    name={s.state === 'done' ? 'checkmark' : s.state === 'current' ? 'sync' : 'ellipse-outline'}
                    size={16}
                    color={s.state === 'done' ? colors.success : s.state === 'current' ? colors.warning : colors.textFaint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepLabel}>{s.label}</Text>
                  <Text style={styles.stepSub}>{s.sub}</Text>
                </View>
                {i < steps.length - 1 && <View style={styles.stepLine} />}
              </View>
            ))}
          </View>
          <View style={{ alignSelf: 'stretch', gap: spacing.s }}>
            <Button title="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} fullWidth size="lg" />
            <Button title="Contacter le support" variant="outline" onPress={() => router.back()} fullWidth />
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing.xl },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.size.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.l,
    lineHeight: 30,
  },
  text: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.s,
    lineHeight: 21,
    paddingHorizontal: spacing.s,
  },
  timeline: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginVertical: spacing.xl,
    gap: spacing.m,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  stepSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  stepLine: {
    position: 'absolute',
    left: 16,
    bottom: -spacing.m - spacing.m,
    width: 2,
    height: spacing.m + spacing.m,
    backgroundColor: colors.border,
  },
});
