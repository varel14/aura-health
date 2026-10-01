import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { medicationService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useAppData } from '@/context/AppDataContext';

/** Ancien parcours d'achat mono-produit : redirigé vers le panier + checkout unifiés. */
export default function OrderMedicationRedirect() {
  const { medicationId } = useLocalSearchParams<{ medicationId: string }>();
  const { addToCart } = useAppData();
  const redirected = useRef(false);
  const { data: med } = useAsync(() => medicationService.get(medicationId), [medicationId]);

  useEffect(() => {
    if (!med || redirected.current) return;
    redirected.current = true;
    addToCart({
      medicationId: med.id,
      name: med.name,
      category: med.category,
      form: med.form,
      dosage: med.dosage,
      unitPrice: med.unitPrice,
      requiresPrescription: med.requiresPrescription,
    });
    router.replace('/checkout');
  }, [med, addToCart]);

  return (
    <Screen>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 140 }} />
    </Screen>
  );
}
