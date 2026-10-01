import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, EmptyState, ErrorState, ListSkeleton, Screen, SectionHeader, Skeleton, useToast } from '@/components/ui';
import { ConfirmSheet } from '@/components/ui/BottomSheet';
import { colors, font, radii, spacing } from '@/constants/theme';

export default function StatesGallery() {
  const { show } = useToast();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  return (
    <Screen title="Galerie des états de l’interface" onBack={() => router.back()} subtitle="Tous les états réutilisables implémentés dans l’application.">
      <SectionHeader title="Chargement & squelettes" style={{ paddingHorizontal: 0 }} />
      <Card>
        <Text style={styles.label}>Liste en cours de chargement</Text>
        <ListSkeleton rows={2} />
        <Text style={[styles.label, { marginTop: spacing.m }]}>Blocs</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={80} height={80} radius={20} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="55%" height={12} />
          </View>
        </View>
      </Card>

      <SectionHeader title="États vides" style={{ paddingHorizontal: 0 }} />
      <View style={{ gap: spacing.s }}>
        <Card>
          <Text style={styles.label}>Aucune donnée</Text>
          <EmptyState compact icon="documents" title="Aucune donnée" message="Le contenu s’affichera ici." />
        </Card>
        <Card>
          <Text style={styles.label}>Aucune ordonnance</Text>
          <EmptyState compact icon="document-text" title="Aucune ordonnance active" message="Vos ordonnances apparaîtront ici." actionLabel="Importer une ordonnance" onAction={() => show('Action de démonstration.')} />
        </Card>
        <Card>
          <Text style={styles.label}>Aucun rendez-vous</Text>
          <EmptyState compact icon="calendar-outline" title="Aucun rendez-vous à venir" message="Prenez rendez-vous en quelques minutes." />
        </Card>
        <Card>
          <Text style={styles.label}>Aucun message</Text>
          <EmptyState compact icon="chatbubbles-outline" title="Aucun message" message="Vos discussions avec vos médecins apparaîtront ici." />
        </Card>
        <Card>
          <Text style={styles.label}>Aucun médecin disponible</Text>
          <EmptyState compact icon="search" title="Aucun médecin disponible" message="Essayez de modifier vos filtres ou de réessayer plus tard." actionLabel="Réinitialiser les filtres" onAction={() => show('Filtres réinitialisés.')} />
        </Card>
      </View>

      <SectionHeader title="Erreurs" style={{ paddingHorizontal: 0 }} />
      <View style={{ gap: spacing.s }}>
        <Card>
          <Text style={styles.label}>Erreur réseau</Text>
          <ErrorState onRetry={() => show('Nouvelle tentative…', 'info')} />
        </Card>
        <Card>
          <Text style={styles.label}>Paiement échoué</Text>
          <View style={styles.failBanner}>
            <Ionicons name="close-circle" size={26} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.failTitle}>Paiement échoué</Text>
              <Text style={styles.failText}>La transaction n’a pas pu être finalisée. Votre compte n’a pas été débité.</Text>
            </View>
          </View>
          <Button title="Réessayer" variant="danger" size="sm" onPress={() => show('Relance du paiement…', 'info')} style={{ marginTop: spacing.m }} />
        </Card>
      </View>

      <SectionHeader title="Garde-fous & permissions" style={{ paddingHorizontal: 0 }} />
      <View style={{ gap: spacing.s }}>
        <Card>
          <Text style={styles.label}>Ordonnance requise</Text>
          <View style={styles.blockBanner}>
            <Ionicons name="lock-closed" size={20} color={colors.warning} />
            <Text style={styles.blockTitle}>Ordonnance obligatoire</Text>
            <Text style={styles.blockText}>Ce médicament est délivré uniquement sur présentation d’une ordonnance médicale valide.</Text>
            <Button title="Importer mon ordonnance" size="sm" style={{ marginTop: spacing.m }} onPress={() => router.push('/prescriptions/import')} />
          </View>
        </Card>
        <Card>
          <Text style={styles.label}>Document en cours d’analyse</Text>
          <View style={styles.analyzing}>
            <Ionicons name="scan" size={22} color={colors.ai} />
            <View style={{ flex: 1, marginLeft: spacing.m }}>
              <Text style={styles.analyzingTitle}>Analyse de votre ordonnance…</Text>
              <Text style={styles.analyzingSub}>Extraction des médicaments et posologies en cours.</Text>
            </View>
          </View>
        </Card>
        <Card>
          <Text style={styles.label}>Accès caméra refusé</Text>
          <View style={styles.permRow}>
            <Ionicons name="camera" size={22} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: spacing.m }}>
              <Text style={styles.permTitle}>Accès à la caméra refusé</Text>
              <Text style={styles.permSub}>Autorisez la caméra dans les réglages pour photographier vos documents.</Text>
            </View>
          </View>
        </Card>
        <Card>
          <Text style={styles.label}>Accès fichiers refusé</Text>
          <View style={styles.permRow}>
            <Ionicons name="folder-open" size={22} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: spacing.m }}>
              <Text style={styles.permTitle}>Accès aux fichiers refusé</Text>
              <Text style={styles.permSub}>Autorisez l’accès au stockage pour importer vos documents.</Text>
            </View>
          </View>
        </Card>
      </View>

      <SectionHeader title="Confirmations & session" style={{ paddingHorizontal: 0 }} />
      <View style={{ gap: spacing.s }}>
        <Button title="Afficher une confirmation d’action" variant="soft" onPress={() => setConfirmVisible(true)} fullWidth />
        <Button title="Afficher « Session expirée »" variant="outline" onPress={() => setSessionExpired(true)} fullWidth />
      </View>

      <ConfirmSheet
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onConfirm={() => show('Action confirmée.')}
        title="Confirmer cette action ?"
        message="Cette action modifiera vos données. Vous pouvez l’annuler avant confirmation."
      />

      <ConfirmSheet
        visible={sessionExpired}
        onClose={() => setSessionExpired(false)}
        onConfirm={() => router.replace('/(auth)/login')}
        title="Votre session a expiré"
        message="Pour votre sécurité, votre session a expiré après une période d’inactivité. Veuillez vous reconnecter."
        confirmLabel="Se reconnecter"
        confirmVariant="primary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.size.xs, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.s },
  failBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.m,
    padding: spacing.m,
  },
  failTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.danger },
  failText: { fontSize: font.size.xs, color: colors.danger, marginTop: 2, lineHeight: 16 },
  blockBanner: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1.5,
    borderColor: '#F3DFB3',
    borderRadius: radii.l,
    padding: spacing.l,
    alignItems: 'center',
  },
  blockTitle: { fontSize: font.size.base, fontWeight: '800', color: colors.warning, marginTop: spacing.s },
  blockText: { fontSize: font.size.xs, color: colors.text, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  analyzing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.aiSoft,
    borderRadius: radii.m,
    padding: spacing.m,
  },
  analyzingTitle: { fontSize: font.size.sm, fontWeight: '800', color: colors.ai },
  analyzingSub: { fontSize: font.size.xs, color: '#7A5FB5', marginTop: 2 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  permTitle: { fontSize: font.size.sm, fontWeight: '800', color: colors.danger },
  permSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
});
