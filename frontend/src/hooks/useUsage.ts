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
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const fetchData = async () => {
      // Skip work while the tab is hidden to avoid wasteful background polling.
      if (document.hidden) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API}/usage?source=${sourceQuery}`, {
          signal: controller.signal,
        });
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
      } catch (e) {
        if (cancelled || controller.signal.aborted) return; // superseded by a newer request
        setError((e as Error).message);
      }
    };

    const tick = () => {
      fetchData().finally(() => {
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      });
    };

    tick();

    // Re-fetch immediately when the tab becomes visible again.
    const onVisibility = () => {
      if (!document.hidden && !cancelled) {
        if (timer) clearTimeout(timer);
        fetchData().finally(() => {
          if (!cancelled) timer = setTimeout(tick, intervalMs);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, sourceQuery, setPayload, setLoading, setError]);
}
