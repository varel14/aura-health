import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Chip, EmptyState, Screen } from '@/components/ui';
import { TransactionCard } from '@/components/domain';
import { spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';

const filters = [
  { key: 'all', label: 'Tous' },
  { key: 'consultation', label: 'Consultations' },
  { key: 'medkit', label: 'Médicaments' },
  { key: 'order', label: 'Commandes' },
] as const;

export default function PaymentsList() {
  const { payments } = useAppData();
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all');

  const list = useMemo(() => {
    const sorted = [...payments].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (filter === 'all') return sorted;
    return sorted.filter((p) => p.category === filter);
  }, [payments, filter]);

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <Screen title="Mes paiements" onBack={() => router.back()} subtitle={`Total réglé : ${totalPaid.toLocaleString('fr-FR').replace(/\u202F|\u00A0/g, ' ')} FCFA`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {filters.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>
      {list.length === 0 ? (
        <EmptyState
          icon="card"
          title="Aucune transaction"
          message="Vos paiements de consultations et de médicaments apparaîtront ici."
        />
      ) : (
        <View style={{ gap: spacing.s }}>
          {list.map((p) => (
            <TransactionCard
              key={p.id}
              label={p.label}
              amount={p.amount}
              status={p.status}
              method={p.method}
              date={p.date.split('-').reverse().join('/')}
              reference={p.reference}
              onPress={() => router.push(`/payments/${p.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
