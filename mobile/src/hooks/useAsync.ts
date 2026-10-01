import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Runs an async fetch on mount (and on reload), exposing loading / error / data. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (mounted.current) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current) {
          setError('Impossible de charger les données. Vérifiez votre connexion internet.');
          setLoading(false);
        }
      });
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger les données. Vérifiez votre connexion internet.');
        setLoading(false);
      });
  }, []);

  return { data, loading, error, reload };
}
