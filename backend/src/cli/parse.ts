import { TeamUsage, MemberUsage, ModelUsage } from '../models';

export function parseTeamUsage(raw: any): TeamUsage {
  const tp = raw.token_plan ?? {};
  return {
    totalCredits: tp.totalCredits ?? 0,
    remainingCredits: tp.remainingCredits ?? 0,
    usedPct: tp.usedPct ?? 0,
    todayCredits: 0, // CLI 未直接提供,后续可从 breakdown 聚合
    generation: 0,
  };
}

export function parseModelUsage(raw: any): ModelUsage[] {
  const items: any[] = raw.items ?? [];
  const total = items.reduce((s, it) => s + (it.cost ?? 0), 0);
  return items.map((it) => ({
    name: it.model_id ?? 'unknown',
    credits: it.cost ?? 0,
    pct: total > 0 ? ((it.cost ?? 0) / total) * 100 : 0,
  }));
}

export function parseSeats(raw: any): MemberUsage[] {
  const seats: any[] = raw.seats ?? [];
  return seats.map((s) => ({
    name: s.user_name ?? 'unknown',
    credits: 0,
    sessions: 0,
    pct: 0,
  }));
}