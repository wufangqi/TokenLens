import { create } from 'zustand';
import type { SourceQuery, UsagePayload } from '../types';

interface UsageState {
  sourceQuery: SourceQuery;
  payload: UsagePayload | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  setSourceQuery: (s: SourceQuery) => void;
  setPayload: (p: UsagePayload) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  sourceQuery: 'qianwen',
  payload: null,
  loading: false,
  error: null,
  lastUpdated: null,
  setSourceQuery: (sourceQuery) => set({ sourceQuery, payload: null, error: null }),
  setPayload: (p) => set({ payload: p, lastUpdated: Date.now(), error: null, loading: false }),
  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e, loading: false }),
}));
