import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Screen, useToast } from '@/components/ui';
import { colors, font, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';

export default function EditProfile() {
  const { patient, updatePatient } = useAppData();
  const { show } = useToast();
  const [firstName, setFirstName] = useState(patient.firstName);
  const [lastName, setLastName] = useState(patient.lastName);
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [city, setCity] = useState(patient.city);
  const [address, setAddress] = useState(patient.address ?? '');
  const [bloodType, setBloodType] = useState(patient.bloodType ?? '');
  const [height, setHeight] = useState(String(patient.heightCm ?? ''));
  const [weight, setWeight] = useState(String(patient.weightKg ?? ''));
  const [ecName, setEcName] = useState(patient.emergencyContact?.name ?? '');
  const [ecPhone, setEcPhone] = useState(patient.emergencyContact?.phone ?? '');

  const save = () => {
    updatePatient({
      firstName: firstName.trim() || patient.firstName,
      lastName: lastName.trim() || patient.lastName,
      phone,
      email,
      city,
      address,
      bloodType: bloodType || undefined,
      heightCm: Number(height) || undefined,
      weightKg: Number(weight) || undefined,
      emergencyContact: ecName ? { name: ecName, phone: ecPhone, relation: 'Contact d’urgence' } : undefined,
    });
    show('Profil mis à jour.');
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="Informations personnelles" onBack={() => router.back()}>
        <Text style={styles.section}>Identité</Text>
        <View style={{ flexDirection: 'row', gap: spacing.s }}>
          <View style={{ flex: 1 }}>
            <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Nom" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
        <Input label="Téléphone" value={phone} onChangeText={setPhone} leftIcon="call" keyboardType="phone-pad" />
        <Input label="E-mail" value={email} onChangeText={setEmail} leftIcon="mail" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.section}>Coordonnées</Text>
        <Input label="Ville" value={city} onChangeText={setCity} leftIcon="location" />
        <Input label="Adresse" value={address} onChangeText={setAddress} placeholder="Quartier, rue…" />

        <Text style={styles.section}>Informations médicales</Text>
        <View style={{ flexDirection: 'row', gap: spacing.s }}>
          <View style={{ flex: 1 }}>
            <Input label="Groupe sanguin" value={bloodType} onChangeText={setBloodType} placeholder="O+" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Taille (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="number-pad" />
          </View>
        </View>

        <Text style={styles.section}>Contact d’urgence</Text>
        <Input label="Nom" value={ecName} onChangeText={setEcName} placeholder="Nom et prénom" />
        <Input label="Téléphone" value={ecPhone} onChangeText={setEcPhone} leftIcon="call" keyboardType="phone-pad" />

        <Button title="Enregistrer les modifications" onPress={save} fullWidth size="lg" style={{ marginTop: spacing.m }} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: font.size.sm,
    fontWeight: '800',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
});
