import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { colors, font, spacing } from '@/constants/theme';

export default function NotFound() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🩺</Text>
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.text}>La page que vous cherchez n’existe pas ou a été déplacée.</Text>
      <Button title="Retour à l’accueil" onPress={() => router.replace('/(patient)')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 56 },
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text, marginTop: spacing.m },
  text: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.s, marginBottom: spacing.l },
});
