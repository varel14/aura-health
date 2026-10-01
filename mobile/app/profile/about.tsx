import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Screen } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';

export default function About() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="À propos d’AuraHealth" onBack={() => router.back()}>
        <View style={{ alignItems: 'center', paddingVertical: spacing.l }}>
          <View style={styles.logo}>
            <Ionicons name="pulse" size={34} color={colors.white} />
          </View>
          <Text style={styles.appName}>AuraHealth</Text>
          <Text style={styles.version}>Version 1.0.0 (prototype)</Text>
          <Text style={styles.tagline}>« Votre santé, plus proche de vous. »</Text>
        </View>

        <Card>
          <Text style={styles.about}>
            AuraHealth est une plateforme de télémédecine qui connecte les patients aux médecins, hôpitaux et
            pharmacies du Cameroun. Consultez à distance, prenez rendez-vous en présentiel, conservez votre dossier
            médical en sécurité et gérez vos ordonnances et vos médicaments — le tout depuis votre téléphone.
          </Text>
        </Card>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>120+</Text>
            <Text style={styles.statLabel}>Médecins vérifiés</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>40+</Text>
            <Text style={styles.statLabel}>Établissements</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>300+</Text>
            <Text style={styles.statLabel}>Pharmacies partenaires</Text>
          </View>
        </View>

        <Card style={{ marginTop: spacing.s }}>
          <Text style={styles.aiNoteTitle}>Transparence IA</Text>
          <Text style={styles.aiNote}>
            AuraHealth utilise l’intelligence artificielle pour organiser l’information (résumés de consultation,
            synthèse de symptômes, lecture d’ordonnances importées). Ces outils n’émettent aucun diagnostic : ils
            préparent et structurent l’information pour vous et votre médecin.
          </Text>
        </Card>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text, marginTop: spacing.m },
  version: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 3 },
  tagline: { fontSize: font.size.sm, color: colors.primary, fontWeight: '600', marginTop: spacing.s, fontStyle: 'italic' },
  about: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 22 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.s,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.m },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statValue: { fontSize: font.size.xl, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  aiNoteTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.text },
  aiNote: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 6, lineHeight: 18 },
});
