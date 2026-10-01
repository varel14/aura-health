import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';

const faqs = [
  {
    q: 'Comment fonctionne une consultation vidéo ?',
    a: 'À l’heure du rendez-vous, ouvrez votre rendez-vous puis touchez « Rejoindre la consultation vidéo ». Une connexion sécurisée s’établit avec votre médecin.',
  },
  {
    q: 'Comment utiliser une ordonnance ?',
    a: 'Depuis « Mes ordonnances », touchez « Rechercher les médicaments » puis choisissez une pharmacie pour commander avec livraison ou retrait.',
  },
  {
    q: 'Mes données médicales sont-elles confidentielles ?',
    a: 'Oui. Vos données sont chiffrées et uniquement accessibles par vous et les professionnels de santé que vous consultez.',
  },
  {
    q: 'Que faire en cas d’urgence ?',
    a: 'AuraHealth ne gère pas les urgences vitales. Composez le 112 (pompiers) ou rendez-vous dans l’établissement de santé le plus proche.',
  },
];

export default function Help() {
  const { show } = useToast();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Aide et assistance" onBack={() => router.back()}>
        <View style={styles.emergency}>
          <Ionicons name="medical" size={20} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Urgence vitale ?</Text>
            <Text style={styles.emergencyText}>Composez immédiatement le 112 ou allez à l’établissement le plus proche.</Text>
          </View>
          <Pressable style={styles.callBtn} onPress={() => show('Appel du 112 (simulation).')}>
            <Text style={styles.callText}>Appeler</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Questions fréquentes</Text>
        {faqs.map((f) => (
          <Pressable
            key={f.q}
            style={styles.faq}
            onPress={() => show('Réponse complète disponible dans l’app finale (simulation).', 'info')}
          >
            <Text style={styles.faqQ}>{f.q}</Text>
            <Text style={styles.faqA} numberOfLines={2}>{f.a}</Text>
          </Pressable>
        ))}

        <Text style={styles.section}>Nous contacter</Text>
        <Pressable style={styles.contact} onPress={() => show('Ouverture du chat support (simulation).', 'info')}>
          <Ionicons name="chatbubbles" size={19} color={colors.primary} />
          <Text style={[styles.contactText, { flex: 1 }]}>Chat avec le support AuraHealth</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <Pressable style={styles.contact} onPress={() => Linking.openURL('mailto:support@aurahealth.cm')}>
          <Ionicons name="mail" size={19} color={colors.primary} />
          <Text style={[styles.contactText, { flex: 1 }]}>support@aurahealth.cm</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <Pressable style={styles.contact} onPress={() => Linking.openURL('tel:+237222000000')}>
          <Ionicons name="call" size={19} color={colors.primary} />
          <Text style={[styles.contactText, { flex: 1 }]}>+237 222 00 00 00 (7j/7, 7h–21h)</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1.5,
    borderColor: '#F3C1C1',
    borderRadius: radii.l,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  emergencyTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.danger },
  emergencyText: { fontSize: font.size.xs, color: colors.danger, marginTop: 2, lineHeight: 16 },
  callBtn: {
    backgroundColor: colors.danger,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callText: { color: colors.white, fontWeight: '700', fontSize: font.size.xs },
  section: {
    fontSize: font.size.sm,
    fontWeight: '800',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  faq: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  faqQ: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  faqA: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  contactText: { fontSize: font.size.sm, fontWeight: '600', color: colors.text },
});
