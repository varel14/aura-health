import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Screen } from '@/components/ui';
import { colors, font, radii, shadow, spacing } from '@/constants/theme';

export default function ProfessionalType() {
  const [type, setType] = useState<'hospital' | 'pharmacy' | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Créer un compte professionnel" onBack={() => router.back()}>
        <Text style={styles.question}>Quel type d’établissement représentez-vous ?</Text>
        <Pressable
          onPress={() => setType('hospital')}
          style={[styles.card, type === 'hospital' && styles.cardSelected]}
        >
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="business" size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Hôpital / Centre de santé</Text>
            <Text style={styles.cardSub}>Hôpitaux, cliniques, centres médicaux</Text>
          </View>
          {type === 'hospital' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </Pressable>
        <Pressable
          onPress={() => setType('pharmacy')}
          style={[styles.card, type === 'pharmacy' && styles.cardSelected]}
        >
          <View style={[styles.icon, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="medkit" size={30} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Pharmacie</Text>
            <Text style={styles.cardSub}>Officines, pharmacies de garde</Text>
          </View>
          {type === 'pharmacy' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </Pressable>
        <View style={{ marginTop: spacing.l }}>
          <Button
            title="Continuer"
            disabled={!type}
            onPress={() => router.push({ pathname: '/(auth)/professional/form', params: { type: type! } })}
            fullWidth
            size="lg"
          />
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  question: {
    fontSize: font.size.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.s,
    marginBottom: spacing.l,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.l,
    marginBottom: spacing.m,
    ...shadow.card,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: '#F4FAF8' },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radii.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: font.size.md, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 3 },
});
