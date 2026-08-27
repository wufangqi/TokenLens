import { useEffect, useState } from 'react';
import type { SourceQuery, TeamUsage } from '../types';

const API = import.meta.env.VITE_API ?? 'http://localhost:5174/api';
const SOURCES: SourceQuery[] = ['qianwen', 'deepseek', 'cursor', 'codebuddy'];

export interface OverviewEntry {
  loading: boolean;
  error: string | null;
  team: TeamUsage | null;
  sourceLabel: string | null;
  updated: number | null;
}

export type OverviewMap = Record<SourceQuery, OverviewEntry>;

const EMPTY: OverviewEntry = {
  loading: true,
  error: null,
  team: null,
  sourceLabel: null,
  updated: null,
};

/** 并行拉取全部数据源,供「总览」面板展示每个源的概要指标。 */
export function useOverview(intervalMs: number): OverviewMap {
  const [map, setMap] = useState<OverviewMap>(() =>
    Object.fromEntries(SOURCES.map((s) => [s, { ...EMPTY }])) as OverviewMap,
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const fetchAll = async () => {
      if (document.hidden) return;
      const results = await Promise.allSettled(
        SOURCES.map((s) =>
          fetch(`${API}/usage?source=${s}`, { signal: controller.signal }).then(async (r) => {
            if (!r.ok) {
              let detail = `HTTP ${r.status}`;
              try {
                const body = await r.json();
                if (body?.error) detail = body.error;
              } catch {
                /* ignore */
              }
              throw new Error(detail);
            }
            return r.json();
          }),
        ),
      );
      if (cancelled) return;
      setMap((prev) => {
        const next = { ...prev };
        SOURCES.forEach((s, i) => {
          const r = results[i];
          if (r.status === 'fulfilled') {
            next[s] = {
              loading: false,
              error: null,
              team: r.value.data.team,
              sourceLabel: r.value.source,
              updated: Date.now(),
            };
          } else {
            next[s] = {
              loading: false,
              error: (r.reason as Error)?.message ?? 'failed',
              team: prev[s]?.team ?? null,
              sourceLabel: prev[s]?.sourceLabel ?? null,
              updated: Date.now(),
            };
          }
        });
        return next;
      });
    };

    const poll = async () => {
      await fetchAll();
      if (!cancelled) timer = setTimeout(poll, intervalMs);
    };
    poll();

    const onVisibility = () => {
      if (!cancelled && !document.hidden) {
        if (timer) clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return map;
}
