import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActionRow, Avatar, Button, Card, SectionHeader } from '@/components/ui';
import { colors, font, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const ADMIN_ACCOUNT = { phone: '+237 690 00 00 00', pin: '1234', email: 'admin@aura.cm' };

export default function AdminProfile() {
  const { signOut } = useAuth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Avatar name="Administration Aura" size={64} color={colors.dark} />
        <View style={{ flex: 1, marginLeft: spacing.m }}>
          <Text style={styles.name}>Administration Aura</Text>
          <Text style={styles.sub}>Back-office • validation & supervision</Text>
        </View>
      </View>

      <Card style={{ marginTop: spacing.m }}>
        <View style={styles.line}>
          <Ionicons name="call" size={15} color={colors.textMuted} />
          <Text style={styles.lineText}>{ADMIN_ACCOUNT.phone} • PIN {ADMIN_ACCOUNT.pin}</Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="mail" size={15} color={colors.textMuted} />
          <Text style={styles.lineText}>{ADMIN_ACCOUNT.email}</Text>
        </View>
      </Card>

      <SectionHeader title="Gestion" style={{ marginTop: spacing.l }} />
      <Card padded={false}>
        <ActionRow
          icon="people"
          label="Médecins"
          sublabel="Valider, activer ou rejeter les profils"
          onPress={() => router.push('/(admin)/doctors')}
        />
        <ActionRow
          icon="business"
          label="Établissements"
          sublabel="Hôpitaux et pharmacies partenaires"
          tint={colors.info}
          onPress={() => router.push('/(admin)/establishments')}
        />
        <ActionRow
          icon="document-text"
          label="Candidatures professionnelles"
          sublabel="Formulaire hôpitaux & pharmacies"
          tint={colors.warning}
          onPress={() => router.push('/(admin)/applications')}
        />
      </Card>

      <Card style={{ marginTop: spacing.m }}>
        <Text style={styles.aboutTitle}>Rôle administrateur</Text>
        <Text style={styles.aboutText}>
          L’admin active les profils médecins créés via l’inscription publique : un profil
          « en attente » n’apparaît ni dans le catalogue, ni dans la prise de rendez-vous tant
          qu’il n’est pas activé. L’admin consulte aussi les informations de base des
          établissements et reçoit les candidatures professionnelles.
        </Text>
      </Card>

      <Button
        title="Se déconnecter"
        variant="outline"
        icon="log-out"
        onPress={() => {
          signOut();
          router.replace('/(auth)/login');
        }}
        fullWidth
        style={{ marginTop: spacing.l }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.l },
  name: { fontSize: font.size.xl, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lineText: { fontSize: font.size.sm, color: colors.textMuted },
  aboutTitle: { fontSize: font.size.sm, fontWeight: '800', color: colors.text, marginBottom: 6 },
  aboutText: { fontSize: font.size.sm, color: colors.textMuted, lineHeight: 20 },
});
