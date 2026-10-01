import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Chip, EmptyState, ErrorState, Screen, SearchBar } from '@/components/ui';
import { DoctorCard } from '@/components/domain';
import { ListSkeleton } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { doctorService, specialtyService } from '@/services';
import { useAsync } from '@/hooks/useAsync';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function DoctorsList() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 250);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [availableToday, setAvailableToday] = useState(false);
  const { data: specialtiesData } = useAsync(() => specialtyService.list(), []);
  const specialties = specialtiesData ?? [];
  const [videoOnly, setVideoOnly] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () =>
      doctorService.list({
        query: debouncedQuery,
        specialty: specialty ?? undefined,
        availableToday,
        videoOnly,
      }),
    [debouncedQuery, specialty, availableToday, videoOnly],
  );

  const debounceQuery = useDebounced(query, 250);

  return (
    <Screen title="Trouver un médecin" onBack={() => router.back()}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Nom, spécialité…"
        style={{ marginBottom: 12 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <Chip label="Disponible aujourd’hui" selected={availableToday} onPress={() => setAvailableToday((v) => !v)} />
        <Chip label="Consultation vidéo" selected={videoOnly} onPress={() => setVideoOnly((v) => !v)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {specialties.map((s) => (
          <Chip
            key={s.id}
            label={s.name}
            selected={specialty === s.name}
            onPress={() => setSpecialty((cur) => (cur === s.name ? null : s.name))}
          />
        ))}
      </View>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="search"
          title="Aucun médecin disponible"
          message="Aucun médecin ne correspond à votre recherche. Essayez de modifier vos filtres ou de réessayer plus tard."
          actionLabel="Réinitialiser les filtres"
          onAction={() => {
            setQuery('');
            setSpecialty(null);
            setAvailableToday(false);
            setVideoOnly(false);
          }}
        />
      ) : (
        <View style={{ gap: spacing.s }}>
          {data!.map((d) => (
            <DoctorCard key={d.id} doctor={d} onPress={() => router.push(`/doctors/${d.id}`)} />
          ))}
        </View>
      )}
    </Screen>
  );
}
