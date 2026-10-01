import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Chip, EmptyState, ErrorState, Screen, SearchBar } from '@/components/ui';
import { MedicationCard } from '@/components/domain';
import { ListSkeleton } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { medicationService } from '@/services';
import { useAsync } from '@/hooks/useAsync';

export default function MedicationsList() {
  const { pharmacyId } = useLocalSearchParams<{ pharmacyId?: string }>();
  const [query, setQuery] = useState('');
  const [otcOnly, setOtcOnly] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => medicationService.list({ query, pharmacyId, otcOnly }),
    [query, pharmacyId, otcOnly],
  );

  return (
    <Screen
      title={pharmacyId ? 'Médicaments de la pharmacie' : 'Médicaments'}
      onBack={() => router.back()}
      subtitle="Catalogue de recherche — demande de commande auprès des pharmacies partenaires."
    >
      <SearchBar value={query} onChangeText={setQuery} placeholder="Rechercher un médicament…" style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Chip label="Sans ordonnance" selected={otcOnly} onPress={() => setOtcOnly((v) => !v)} />
      </View>
      {loading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="medkit"
          title="Aucun médicament trouvé"
          message={`Aucun résultat pour « ${query} ». Vérifiez l’orthographe ou demandez conseil à votre pharmacien.`}
          actionLabel="Effacer la recherche"
          onAction={() => setQuery('')}
        />
      ) : (
        <View style={{ gap: spacing.s }}>
          {data!.map((m) => (
            <MedicationCard
              key={m.id}
              name={m.name}
              dosage={m.dosage}
              form={m.form}
              price={m.unitPrice}
              requiresPrescription={m.requiresPrescription}
              pharmacyCount={m.pharmacyIds.length}
              onPress={() => router.push(`/medications/${m.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
