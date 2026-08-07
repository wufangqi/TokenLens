import { create } from 'zustand';
import { UsagePayload } from '../types';

interface UsageState {
  payload: UsagePayload | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  setPayload: (p: UsagePayload) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  payload: null,
  loading: false,
  error: null,
  lastUpdated: null,
  setPayload: (p) => set({ payload: p, lastUpdated: Date.now(), error: null, loading: false }),
  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e, loading: false }),
}));