import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, BottomSheet, SectionHeader, StatusBadge, TimelineItem, useToast } from '@/components/ui';
import { ListItem } from '@/components/ui/ListItem';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { ageFrom, dayLabel, fullDate } from '@/utils/format';

const docTypeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  ordonnance: 'document-text',
  analyse: 'flask',
  imagerie: 'scan',
  'compte-rendu': 'reader',
  certificat: 'ribbon',
  vaccination: 'shield-checkmark',
};

export default function RecordsTab() {
  const { patient, documents, prescriptions, appointments, addDocument } = useAppData();
  // The medical record sections live on the patient profile served by the API.
  const { allergies = [], conditions = [], treatments = [], vaccines = [], examResults = [] } = patient;
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  const [importSheet, setImportSheet] = useState(false);

  const activeTreatments = treatments.filter((t) => t.active);
  const activeRx = prescriptions.filter((p) => p.status === 'active');

  const importDoc = (kind: 'photo' | 'galerie' | 'fichier') => {
    const label = kind === 'photo' ? 'Ordonnance photographiée' : kind === 'galerie' ? 'Compte-rendu importé' : 'Analyse importée (PDF)';
    addDocument({
      name: label,
      type: kind === 'photo' ? 'ordonnance' : kind === 'fichier' ? 'analyse' : 'compte-rendu',
      date: new Date().toISOString().slice(0, 10),
      source: 'imported',
      sizeKb: 240,
    });
    setImportSheet(false);
    show('Document ajouté à votre dossier médical.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.m }}>
          <Text style={styles.title}>Mon dossier médical</Text>
          <Text style={styles.subtitle}>Vos informations de santé, centralisées et sécurisées.</Text>

          <View style={styles.profileCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodText}>{patient.bloodType ?? '—'}</Text>
                <Text style={styles.bloodLabel}>Groupe</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.m }}>
                <Text style={styles.profileName}>{patient.firstName} {patient.lastName}</Text>
                <Text style={styles.profileMeta}>
                  {ageFrom(patient.birthDate)} ans • {patient.sex === 'M' ? 'Homme' : 'Femme'} • {patient.city}
                </Text>
                <Text style={styles.profileMeta}>
                  {patient.heightCm} cm • {patient.weightKg} kg
                </Text>
              </View>
            </View>
            {patient.emergencyContact && (
              <View style={styles.emergency}>
                <Ionicons name="call" size={14} color={colors.danger} />
                <Text style={styles.emergencyText}>
                  Contact d’urgence : {patient.emergencyContact.name} — {patient.emergencyContact.phone}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.m }}>
            <Pressable style={styles.shortcut} onPress={() => router.push('/prescriptions')}>
              <Ionicons name="document-text" size={18} color={colors.primary} />
              <Text style={styles.shortcutText}>{activeRx.length} ordonnances actives</Text>
            </Pressable>
            <Pressable style={styles.shortcut} onPress={() => router.push('/(patient)/appointments')}>
              <Ionicons name="calendar" size={18} color={colors.info} />
              <Text style={styles.shortcutText}>Mes consultations</Text>
            </Pressable>
          </View>

          <SectionHeader title="Allergies" style={{ marginTop: spacing.l }} />
          {allergies.length === 0 ? (
            <Text style={styles.noneText}>Aucune allergie connue enregistrée.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s }}>
              {allergies.map((a) => (
                <View key={a.id} style={[styles.allergyChip, a.severity === 'sévère' && styles.allergySevere]}>
                  <Ionicons name="warning" size={14} color={a.severity === 'sévère' ? colors.danger : colors.warning} />
                  <Text style={styles.allergyText}>{a.name}</Text>
                  <Badge label={a.severity} variant={a.severity === 'sévère' ? 'danger' : a.severity === 'modérée' ? 'warning' : 'neutral'} size="sm" />
                </View>
              ))}
            </View>
          )}

          <SectionHeader title="Traitements en cours" />
          {activeTreatments.length === 0 ? (
            <Text style={styles.noneText}>Aucun traitement en cours.</Text>
          ) : (
            <View style={styles.block}>
              {activeTreatments.map((t) => (
                <ListItem
                  key={t.id}
                  icon="medkit"
                  iconBg={colors.primarySoft}
                  iconTint={colors.primary}
                  title={t.name}
                  subtitle={`${t.dosage} — ${t.frequency}`}
                  right={
                    <Text style={styles.sinceText}>Depuis {t.since}</Text>
                  }
                  chevron={false}
                />
              ))}
            </View>
          )}

          <SectionHeader title="Antécédents médicaux" />
          <View style={[styles.block, { padding: spacing.m }]}>
            {[...conditions].reverse().map((c, i, arr) => (
              <TimelineItem
                key={c.id}
                title={c.name}
                subtitle={`${c.type === 'chirurgie' ? 'Intervention' : c.type === 'maladie chronique' ? 'Maladie chronique' : 'Antécédent'}${c.note ? ' — ' + c.note : ''}`}
                date={String(c.year)}
                last={i === arr.length - 1}
                color={c.type === 'chirurgie' ? colors.info : colors.primary}
              />
            ))}
          </View>

          <SectionHeader title="Vaccinations" />
          <View style={styles.block}>
            {vaccines.map((v) => (
              <ListItem
                key={v.id}
                icon="shield-checkmark"
                iconBg={colors.successSoft}
                iconTint={colors.success}
                title={v.name}
                subtitle={fullDate(v.date)}
                right={v.nextDue ? <Text style={styles.sinceText}>Rappel : {fullDate(v.nextDue)}</Text> : undefined}
                chevron={false}
              />
            ))}
          </View>

          <SectionHeader title="Résultats d’examens" />
          <View style={styles.block}>
            {examResults.map((e) => (
              <ListItem
                key={e.id}
                icon={e.category === 'analyse' ? 'flask' : 'scan'}
                iconBg={colors.aiSoft}
                iconTint={colors.ai}
                title={e.name}
                subtitle={`${dayLabel(e.date)}${e.conclusion ? ' — ' + e.conclusion : ''}`}
                right={<StatusBadge status={e.status === 'disponible' ? 'paid' : 'pending'} size="sm" />}
                chevron={false}
              />
            ))}
          </View>

          <SectionHeader
            title="Documents médicaux"
            actionLabel="Ajouter"
            onAction={() => setImportSheet(true)}
          />
          <View style={styles.block}>
            {documents.map((d) => (
              <ListItem
                key={d.id}
                icon={docTypeIcon[d.type] ?? 'document'}
                iconBg={d.source === 'imported' ? colors.warningSoft : colors.primarySoft}
                iconTint={d.source === 'imported' ? colors.warning : colors.primary}
                title={d.name}
                subtitle={`${dayLabel(d.date)} • ${d.sizeKb} Ko`}
                right={
                  <Badge label={d.source === 'imported' ? 'Importé' : 'AuraHealth'} variant={d.source === 'imported' ? 'warning' : 'primary'} size="sm" />
                }
                chevron={Boolean(d.deepLink)}
                onPress={() =>
                  d.deepLink
                    ? router.push(d.deepLink)
                    : show('Prévisualisation du document (simulation).', 'info')
                }
              />
            ))}
          </View>
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <BottomSheet visible={importSheet} onClose={() => setImportSheet(false)} title="Ajouter un document médical" height="42%">
        <Text style={styles.sheetHelp}>Importez un document reçu en dehors d’AuraHealth (ordonnance, analyse, compte-rendu…).</Text>
        <Pressable style={styles.sheetOption} onPress={() => importDoc('photo')}>
          <Ionicons name="camera" size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={styles.sheetOptionTitle}>Prendre une photo</Text>
            <Text style={styles.sheetOptionSub}>Photographier le document</Text>
          </View>
        </Pressable>
        <Pressable style={styles.sheetOption} onPress={() => importDoc('galerie')}>
          <Ionicons name="images" size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={styles.sheetOptionTitle}>Importer depuis la galerie</Text>
            <Text style={styles.sheetOptionSub}>Choisir une image existante</Text>
          </View>
        </Pressable>
        <Pressable style={styles.sheetOption} onPress={() => importDoc('fichier')}>
          <Ionicons name="folder-open" size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={styles.sheetOptionTitle}>Importer un document</Text>
            <Text style={styles.sheetOptionSub}>PDF ou image depuis vos fichiers</Text>
          </View>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 4 },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginTop: spacing.m,
  },
  bloodBadge: {
    width: 62,
    height: 62,
    borderRadius: radii.l,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodText: { fontSize: font.size.lg, fontWeight: '800', color: colors.danger },
  bloodLabel: { fontSize: 9, color: colors.danger, fontWeight: '600' },
  profileName: { fontSize: font.size.lg, fontWeight: '800', color: colors.text },
  profileMeta: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.s,
    padding: 10,
    marginTop: spacing.m,
  },
  emergencyText: { fontSize: font.size.xs, color: colors.danger, fontWeight: '600', flex: 1 },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    padding: spacing.s,
  },
  shortcutText: { fontSize: font.size.xs, fontWeight: '700', color: colors.text },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  allergySevere: { backgroundColor: colors.dangerSoft },
  allergyText: { fontSize: font.size.sm, fontWeight: '700', color: colors.text },
  block: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  noneText: { fontSize: font.size.sm, color: colors.textMuted },
  sinceText: { fontSize: font.size.xs, color: colors.textFaint },
  sheetHelp: { fontSize: font.size.sm, color: colors.textMuted, marginBottom: spacing.m, lineHeight: 20 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: radii.m,
    backgroundColor: colors.bg,
    marginBottom: spacing.s,
  },
  sheetOptionTitle: { fontSize: font.size.base, fontWeight: '700', color: colors.text },
  sheetOptionSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
});
