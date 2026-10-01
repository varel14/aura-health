import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Chip, EmptyState, ErrorState, Screen, SearchBar } from '@/components/ui';
import { FacilityCard } from '@/components/domain';
import { ListSkeleton } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { pharmacyService } from '@/services';
import { useAsync } from '@/hooks/useAsync';

export default function PharmaciesList() {
  const [query, setQuery] = useState('');
  const [onDuty, setOnDuty] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => pharmacyService.list({ query, onDutyOnly: onDuty, deliveryOnly: delivery }),
    [query, onDuty, delivery],
  );

  return (
    <Screen title="Pharmacies" onBack={() => router.back()}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Nom, quartier, ville…" style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Chip label="De garde" selected={onDuty} onPress={() => setOnDuty((v) => !v)} />
        <Chip label="Livraison disponible" selected={delivery} onPress={() => setDelivery((v) => !v)} />
      </View>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="medkit"
          title="Aucune pharmacie trouvée"
          message="Aucune pharmacie ne correspond à votre recherche. Modifiez vos filtres."
          actionLabel="Réinitialiser"
          onAction={() => {
            setQuery('');
            setOnDuty(false);
            setDelivery(false);
          }}
        />
      ) : (
        <View style={{ gap: spacing.s }}>
          {data!.map((p) => (
            <FacilityCard
              key={p.id}
              name={p.name}
              subtitle={`${p.district}, ${p.city} • ${p.hours}`}
              rating={p.rating}
              icon="medkit"
              badges={[
                ...(p.onDuty ? [{ label: 'De garde', variant: 'success' as const }] : []),
                ...(p.deliveryAvailable ? [{ label: 'Livraison', variant: 'primary' as const }] : []),
                ...(p.pickupAvailable ? [{ label: 'Retrait', variant: 'info' as const }] : []),
              ]}
              onPress={() => router.push(`/pharmacies/${p.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
