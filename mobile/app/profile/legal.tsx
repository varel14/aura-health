import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui';
import { colors, font, spacing } from '@/constants/theme';

const privacySections = [
  {
    title: '1. Collecte des données',
    body: 'AuraHealth collecte uniquement les informations nécessaires à votre prise en charge : identité, coordonnées, informations médicales que vous ou vos médecins renseignez, et historique des paiements.',
  },
  {
    title: '2. Finalité médicale',
    body: 'Vos données servent exclusivement à la fourniture des services de santé : consultations, ordonnances, dossier médical, commandes de médicaments. Elles ne sont jamais revendues.',
  },
  {
    title: '3. Accès restreint',
    body: 'Seuls vous et les professionnels de santé que vous consultez pouvez accéder à votre dossier médical. Tous les accès sont journalisés.',
  },
  {
    title: '4. Sécurité',
    body: 'Les données sont chiffrées en transit et au repos. Les documents sensibles (ordonnances, analyses) sont stockés dans un coffre numérique dédié.',
  },
  {
    title: '5. Vos droits',
    body: 'Vous pouvez exporter, corriger ou demander la suppression de vos données à tout moment depuis cette application ou en écrivant à dpo@aurahealth.cm.',
  },
];

const termsSections = [
  {
    title: '1. Objet du service',
    body: 'AuraHealth est une plateforme de télémédecine mettant en relation des patients, des médecins, des établissements de santé et des pharmacies.',
  },
  {
    title: '2. Limites de la téléconsultation',
    body: 'La téléconsultation ne remplace pas une consultation physique lorsque l’état du patient l’exige. En cas d’urgence vitale, appelez le 112.',
  },
  {
    title: '3. Ordonnances',
    body: 'Seuls les médecins inscrits et vérifiés peuvent délivrer des ordonnances sur AuraHealth. Les ordonnances importées par le patient sont clairement identifiées comme externes.',
  },
  {
    title: '4. Paiements',
    body: 'Les tarifs des consultations sont fixés par les professionnels. Les paiements Mobile Money et carte bancaire sont traités par des prestataires sécurisés.',
  },
  {
    title: '5. Responsabilité',
    body: 'Les résumés générés par IA sont des outils d’organisation d’information et ne constituent en aucun cas un diagnostic médical.',
  },
];

export default function Legal() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const isTerms = section === 'terms';
  const sections = isTerms ? termsSections : privacySections;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title={isTerms ? 'Conditions d’utilisation' : 'Confidentialité'} onBack={() => router.back()}>
        <Text style={styles.updated}>Dernière mise à jour : septembre 2026</Text>
        {sections.map((s) => (
          <View key={s.title} style={styles.block}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
        <Text style={styles.foot}>
          Pour toute question : legal@aurahealth.cm
        </Text>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  updated: { fontSize: font.size.xs, color: colors.textFaint, marginBottom: spacing.m },
  block: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  title: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  body: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 6, lineHeight: 21 },
  foot: { fontSize: font.size.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.m },
});
