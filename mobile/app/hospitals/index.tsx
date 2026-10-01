import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Chip, EmptyState, ErrorState, Screen, SearchBar } from '@/components/ui';
import { FacilityCard } from '@/components/domain';
import { ListSkeleton } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { hospitalService } from '@/services';
import { useAsync } from '@/hooks/useAsync';

const cities = ['Yaoundé', 'Douala', 'Bafoussam'];

export default function HospitalsList() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(
    () => hospitalService.list({ query, city: city ?? undefined }),
    [query, city],
  );

  return (
    <Screen title="Établissements de santé" onBack={() => router.back()}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Nom, quartier, spécialité…" style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {cities.map((c) => (
          <Chip key={c} label={c} selected={city === c} onPress={() => setCity((cur) => (cur === c ? null : c))} />
        ))}
      </View>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="business"
          title="Aucun établissement trouvé"
          message="Aucun établissement ne correspond à votre recherche dans cette zone."
          actionLabel="Réinitialiser"
          onAction={() => {
            setQuery('');
            setCity(null);
          }}
        />
      ) : (
        <View style={{ gap: spacing.s }}>
          {data!.map((h) => (
            <FacilityCard
              key={h.id}
              name={h.name}
              subtitle={`${h.type} • ${h.district}, ${h.city}`}
              rating={h.rating}
              icon="business"
              badges={[
                ...(h.emergency ? [{ label: 'Urgences 24h/24', variant: 'danger' as const }] : []),
                { label: `${h.specialties.length} spécialités`, variant: 'primary' as const },
              ]}
              onPress={() => router.push(`/hospitals/${h.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
