import { useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'welcome',
    icon: 'pulse' as const,
    emoji: '👋',
    bg: colors.primarySoft,
    title: 'Bienvenue sur AuraHealth',
    text: 'Votre santé, plus proche de vous. Consultez un médecin qualifié où que vous soyez, en toute confiance.',
  },
  {
    key: 'remote',
    icon: 'videocam' as const,
    emoji: '🩺',
    bg: colors.infoSoft,
    title: 'Consultez à distance',
    text: 'Consultation vidéo ou par chat, prise de rendez-vous en présentiel, résumés de consultation et ordonnances — directement dans l’application.',
  },
  {
    key: 'record',
    icon: 'folder' as const,
    emoji: '📁',
    bg: colors.aiSoft,
    title: 'Tout votre suivi au même endroit',
    text: 'Dossier médical sécurisé, ordonnances, recherche de médicaments, pharmacies de garde et paiements centralisés.',
  },
];

export default function Onboarding() {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { completeOnboarding } = useAuth();

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const finish = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={10}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {slides.map((s) => (
          <View key={s.key} style={[styles.slide, { width }]}>
            <View style={[styles.illustration, { backgroundColor: s.bg }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>
              <View style={styles.illustrationBadge}>
                <Ionicons name={s.icon} size={26} color={colors.primary} />
              </View>
              <View style={[styles.bubble, { top: 30, left: 26 }]}>
                <Ionicons name="heart" size={14} color={colors.danger} />
              </View>
              <View style={[styles.bubble, { bottom: 40, right: 30 }]}>
                <Ionicons name="chatbubble-ellipses" size={14} color={colors.info} />
              </View>
              <View style={[styles.bubble, { top: 60, right: 46 }]}>
                <Ionicons name="document-text" size={14} color={colors.warning} />
              </View>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        {page < slides.length - 1 ? (
          <Button title="Suivant" onPress={() => goTo(page + 1)} fullWidth size="lg" />
        ) : (
          <Button title="Commencer" iconRight="arrow-forward" onPress={finish} fullWidth size="lg" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.l, paddingTop: spacing.s },
  skip: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: '600', padding: spacing.s },
  slide: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.l },
  illustration: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  emoji: { fontSize: 84 },
  illustrationBadge: {
    position: 'absolute',
    bottom: 46,
    left: 40,
    backgroundColor: colors.white,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  bubble: {
    position: 'absolute',
    backgroundColor: colors.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  title: {
    fontSize: font.size.xxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  text: {
    fontSize: font.size.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.m,
    lineHeight: 24,
  },
  footer: { paddingHorizontal: spacing.l, paddingBottom: spacing.l, gap: spacing.l },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
});
