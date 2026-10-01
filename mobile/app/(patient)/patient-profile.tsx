import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';

export default function ProfileTab() {
  const { patient, appointments, prescriptions, documents } = useAppData();
  const { signInDoctor, signOut } = useAuth();
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const logout = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  const age = patient.birthDate ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / 31557600000) : null;
  const allergyNames = (patient.allergies ?? []).map((a) => a.name);
  const conditionNames = (patient.conditions ?? []).map((c) => c.name);
  const activeTreatments = (patient.treatments ?? []).filter((t) => t.active);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
          <Text style={styles.title}>Mon profil</Text>

          <View style={styles.headerCard}>
            <Avatar name={`${patient.firstName} ${patient.lastName}`} size={64} />
            <View style={{ flex: 1, marginLeft: spacing.m }}>
              <Text style={styles.name}>{patient.firstName} {patient.lastName}</Text>
              <Text style={styles.meta}>{patient.phone}</Text>
              <Text style={styles.meta}>{patient.email}</Text>
              {(age !== null || patient.city) && (
                <Text style={styles.meta}>
                  {[age !== null ? `${age} ans` : null, patient.city].filter(Boolean).join(' • ')}
                </Text>
              )}
            </View>
            <Pressable style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
              <Ionicons name="create" size={16} color={colors.primary} />
              <Text style={styles.editText}>Modifier</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{appointments.length}</Text>
              <Text style={styles.statLabel}>Rendez-vous</Text>
            </View>
            <View style={[styles.stat, styles.statBorder]}>
              <Text style={styles.statValue}>{prescriptions.length}</Text>
              <Text style={styles.statLabel}>Ordonnances</Text>
            </View>
            <View style={[styles.stat, styles.statBorder]}>
              <Text style={styles.statValue}>{documents.length}</Text>
              <Text style={styles.statLabel}>Documents</Text>
            </View>
          </View>

          <Text style={styles.section}>Résumé santé</Text>
          <View style={styles.card}>
            <HealthRow icon="water" label="Groupe sanguin" value={patient.bloodType ?? 'Non renseigné'} />
            <HealthRow
              icon="resize"
              label="Taille & poids"
              value={[patient.heightCm ? `${patient.heightCm} cm` : null, patient.weightKg ? `${patient.weightKg} kg` : null].filter(Boolean).join(' • ') || 'Non renseignés'}
            />
            <HealthRow
              icon="alert-circle"
              label="Allergies"
              value={allergyNames.length ? allergyNames.join(', ') : 'Aucune connue'}
              danger={allergyNames.length > 0}
            />
            <HealthRow
              icon="pulse"
              label="Antécédents"
              value={conditionNames.length ? conditionNames.join(', ') : 'Aucun'}
            />
            <HealthRow
              icon="medkit"
              label="Traitements en cours"
              value={activeTreatments.length ? activeTreatments.map((t) => `${t.name} (${t.dosage})`).join(', ') : 'Aucun'}
            />
            <HealthRow
              icon="call"
              label="Contact d’urgence"
              value={patient.emergencyContact ? `${patient.emergencyContact.name} (${patient.emergencyContact.relation}) • ${patient.emergencyContact.phone}` : 'Non renseigné'}
              last
            />
          </View>

          <Text style={styles.section}>Compte</Text>
          <View style={styles.card}>
            <MenuRow icon="person" label="Informations personnelles" onPress={() => router.push('/profile/edit')} />
            <MenuRow icon="medkit" label="Informations médicales" sub="Groupe sanguin, taille, poids, contact d’urgence" onPress={() => router.push('/(patient)/records')} />
            <MenuRow icon="lock-closed" label="Sécurité" sub="Mot de passe et sessions" onPress={() => router.push('/profile/security')} />
            <MenuRow icon="notifications" label="Notifications" sub="Rappels de rendez-vous, ordonnances…" onPress={() => router.push('/profile/notifications')} last />
          </View>

          <Text style={styles.section}>Santé & services</Text>
          <View style={styles.card}>
            <MenuRow icon="folder" label="Mes documents" sub="Ordonnances, analyses, comptes-rendus" onPress={() => router.push('/(patient)/records')} />
            <MenuRow icon="card" label="Moyens de paiement" sub="Mobile Money et cartes enregistrées" onPress={() => router.push('/profile/payment-methods')} />
            <MenuRow icon="receipt" label="Historique des paiements" onPress={() => router.push('/payments')} last />
          </View>

          <Text style={styles.section}>Assistance</Text>
          <View style={styles.card}>
            <MenuRow icon="help-circle" label="Aide et assistance" onPress={() => router.push('/profile/help')} />
            <MenuRow icon="shield" label="Confidentialité et données" onPress={() => router.push('/profile/legal?section=privacy')} />
            <MenuRow icon="document" label="Conditions d’utilisation" onPress={() => router.push('/profile/legal?section=terms')} />
            <MenuRow icon="information-circle" label="À propos d’AuraHealth" onPress={() => router.push('/profile/about')} last />
          </View>

          <Text style={styles.section}>Espace de démonstration</Text>
          <View style={styles.card}>
            <MenuRow
              icon="swap-horizontal"
              label="Basculer vers l’espace médecin"
              sub="Découvrir le parcours professionnel (démo)"
              onPress={() => {
                signInDoctor();
                router.replace('/(doctor)');
              }}
            />
            <MenuRow icon="construct" label="Galerie des états de l’interface" sub="Chargement, vide, erreur, permission…" onPress={() => router.push('/dev/states')} last />
          </View>

          <Pressable style={styles.logout} onPress={() => show('Utilisez le bouton rouge pour vous déconnecter.', 'info')}>
            <Text style={styles.appVersion}>AuraHealth v1.0.0 — prototype de démonstration</Text>
          </Pressable>

          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function HealthRow({
  icon,
  label,
  value,
  last,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <View style={[styles.healthRow, !last && styles.menuBorder]}>
      <View style={[styles.menuIcon, danger && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={[styles.healthValue, danger && { color: colors.danger }]}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onPress,
  last,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuBorder, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.menuIcon, danger && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  name: { fontSize: font.size.lg, fontWeight: '800', color: colors.text },
  meta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  editText: { fontSize: font.size.xs, fontWeight: '700', color: colors.primaryDark },
  section: { fontSize: font.size.sm, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.l, marginBottom: spacing.s },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: 13, paddingHorizontal: spacing.m },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.s,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: font.size.base, fontWeight: '600', color: colors.text },
  menuSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.s,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.m },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statValue: { fontSize: font.size.lg, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: 12, paddingHorizontal: spacing.m },
  healthValue: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  logout: { alignItems: 'center', marginTop: spacing.xl },
  appVersion: { fontSize: font.size.xs, color: colors.textFaint },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.dangerSoft,
    borderRadius: radii.m,
    paddingVertical: 14,
    marginTop: spacing.m,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: font.size.base },
});
