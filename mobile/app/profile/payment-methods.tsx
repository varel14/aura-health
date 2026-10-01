import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';

const methods = [
  { id: 'mtn', name: 'MTN Mobile Money', sub: '+237 691 45 78 20', tint: '#F5C400', icon: 'phone-portrait' as const, def: true },
  { id: 'orange', name: 'Orange Money', sub: '+237 691 45 78 20', tint: '#FF7900', icon: 'phone-portrait' as const, def: false },
  { id: 'card', name: 'Visa •••• 4242', sub: 'Expire 09/28', tint: colors.info, icon: 'card' as const, def: false },
];

export default function PaymentMethods() {
  const { show } = useToast();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Moyens de paiement" onBack={() => router.back()}>
        {methods.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: `${m.tint}22` }]}>
              <Ionicons name={m.icon} size={20} color={m.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.sub}>{m.sub}</Text>
            </View>
            {m.def ? (
              <Badge label="Par défaut" variant="success" size="sm" />
            ) : (
              <Pressable onPress={() => show(`${m.name} défini par défaut (simulation).`)}>
                <Text style={styles.setDefault}>Définir</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Pressable style={styles.add} onPress={() => show('Ajout de moyen de paiement (simulation).', 'info')}>
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <Text style={styles.addText}>Ajouter un moyen de paiement</Text>
        </Pressable>

        <Text style={styles.help}>
          Les paiements sont traités de manière sécurisée. AuraHealth ne stocke jamais vos codes secrets Mobile Money
          ni le CVV de vos cartes.
        </Text>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
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
  icon: { width: 44, height: 44, borderRadius: radii.s, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  sub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  setDefault: { fontSize: font.size.xs, color: colors.primary, fontWeight: '700' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radii.m,
    paddingVertical: spacing.m,
    marginTop: spacing.s,
  },
  addText: { color: colors.primary, fontWeight: '700', fontSize: font.size.sm },
  help: { fontSize: font.size.xs, color: colors.textFaint, lineHeight: 17, marginTop: spacing.l, textAlign: 'center' },
});
