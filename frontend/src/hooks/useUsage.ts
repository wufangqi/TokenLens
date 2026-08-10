import { useEffect } from 'react';
import { useUsageStore } from '../stores/usageStore';
import type { UsagePayload } from '../types';

const API = import.meta.env.VITE_API ?? 'http://localhost:5174/api';

export function useUsage(intervalMs: number) {
  const sourceQuery = useUsageStore((s) => s.sourceQuery);
  const setPayload = useUsageStore((s) => s.setPayload);
  const setLoading = useUsageStore((s) => s.setLoading);
  const setError = useUsageStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/usage?source=${sourceQuery}`);
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (body?.error) detail = body.error;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }
        const data: UsagePayload = await res.json();
        if (!cancelled) setPayload(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
    };
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, sourceQuery, setPayload, setLoading, setError]);
}
