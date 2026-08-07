import { TeamUsage, ModelUsage, TrendPoint, ConsumptionRow } from '../models';

export interface CodeBuddyModelUsage {
  displayName?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  costUSD?: number;
}

export interface CodeBuddyStats {
  modelUsage?: Record<string, CodeBuddyModelUsage>;
  dailyModelTokens?: Array<Record<string, number | string>>;
  streaks?: { currentStreak?: number; longestStreak?: number };
  activeDays?: number;
  totalDays?: number;
  toolUsage?: Array<{ name?: string; tool?: string; count?: number }>;
}

function modelTokens(m: CodeBuddyModelUsage): number {
  return (m.inputTokens ?? 0) + (m.outputTokens ?? 0);
}

export function parseCodeBuddyTeam(stats: CodeBuddyStats, generation: number): TeamUsage {
  const models = stats.modelUsage ?? {};
  const total = Object.values(models).reduce((s, m) => s + modelTokens(m), 0);
  return {
    totalCredits: total,
    remainingCredits: 0,
    usedPct: 0,
    todayCredits: 0,
    generation,
    activeDays: stats.activeDays ?? 0,
    currentStreak: stats.streaks?.currentStreak ?? 0,
  };
}

export function parseCodeBuddyModels(stats: CodeBuddyStats): ModelUsage[] {
  const entries = Object.entries(stats.modelUsage ?? {});
  const total = entries.reduce((s, [, m]) => s + modelTokens(m), 0);
  return entries
    .map(([id, m]) => {
      const credits = modelTokens(m);
      return {
        name: m.displayName || id,
        credits,
        pct: total > 0 ? (credits / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.credits - a.credits);
}

export function parseCodeBuddyConsumption(stats: CodeBuddyStats): ConsumptionRow[] {
  const entries = Object.entries(stats.modelUsage ?? {});
  const total = entries.reduce((s, [, m]) => s + modelTokens(m), 0);
  return entries
    .map(([id, m]) => {
      const credits = modelTokens(m);
      return {
        name: m.displayName || id,
        credits,
        cost: Number(m.costUSD ?? 0),
        pct: total > 0 ? (credits / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.credits - a.credits);
}

/**
 * dailyModelTokens: 每日每模型 token 行。
 * 常见形态: [{ date|day: '2026-08-01', modelA: 100, modelB: 50 }, ...]
 * 或带 tokens 字段。汇总为 TrendPoint。
 */
export function parseCodeBuddyTrend(stats: CodeBuddyStats, hours: number): TrendPoint[] {
  const rows = stats.dailyModelTokens ?? [];
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = String(row.date ?? row.day ?? row.period ?? '');
    if (!day) continue;
    let sum = 0;
    for (const [k, v] of Object.entries(row)) {
      if (k === 'date' || k === 'day' || k === 'period') continue;
      const n = Number(v);
      if (Number.isFinite(n)) sum += n;
    }
    byDay.set(day, (byDay.get(day) ?? 0) + sum);
  }
  const dayLimit = Math.max(1, Math.ceil(hours / 24));
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-dayLimit)
    .map(([day, tokens]) => ({
      ts: new Date(`${day}T00:00:00Z`).toISOString(),
      credits: tokens,
    }));
}
