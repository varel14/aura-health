import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from '@/utils/geo';

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

/**
 * Foreground permission + one-shot device position, requested on mount.
 * `retry` re-runs the whole flow (e.g. after the user enables location services).
 */
export function useLocation() {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const request = useCallback(async () => {
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setStatus('granted');
    } catch {
      setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { status, coords, retry: request };
}
