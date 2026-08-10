import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow } from '../models';

/**
 * 解析 usage summary 输出(真实结构):
 * {
 *   token_plan: { subscribed, ... },   // 订阅套餐信息,未订阅时仅 { subscribed: false }
 *   pay_as_you_go: { models: [{ model_id, usage: { tokens }, cost }], total: { cost } }
 * }
 * 团队额度仅对已订阅用户有意义;未订阅时返回 0。
 */
export function parseTeamUsage(raw: any): TeamUsage {
  const tp = raw.token_plan ?? {};
  return {
    totalCredits: tp.totalCredits ?? 0,
    remainingCredits: tp.remainingCredits ?? 0,
    usedPct: tp.usedPct ?? 0,
    todayCredits: 0, // CLI 未直接提供
    generation: 0,
  };
}

/**
 * 解析模型用量。真实数据来自 pay_as_you_go.models。
 * 以 tokens 作为用量指标(贴合 TokenLens),pct 按 tokens 占比计算。
 */
export function parseModelUsage(raw: any): ModelUsage[] {
  const items: any[] = raw.pay_as_you_go?.models ?? raw.items ?? [];
  const totalTokens = items.reduce((s, it) => s + (it.usage?.tokens ?? it.tokens ?? 0), 0);
  return items.map((it) => {
    const tokens = it.usage?.tokens ?? it.tokens ?? 0;
    return {
      name: it.model_id ?? 'unknown',
      credits: tokens,
      pct: totalTokens > 0 ? (tokens / totalTokens) * 100 : 0,
    };
  });
}

/** 解析 seats 输出(真实结构为 items 数组)。 */
export function parseSeats(raw: any): MemberUsage[] {
  const seats: any[] = raw.items ?? raw.seats ?? [];
  return seats.map((s) => ({
    name: s.user_name ?? 'unknown',
    credits: 0,
    sessions: 0,
    pct: 0,
  }));
}

/**
 * 汇总多个模型的 usage breakdown(每次一个模型)按日合并为趋势点。
 * 真实 breakdown 结构: { model_id, rows: [{ period, cost, tokens_in }] }
 * 同一天跨模型累加 tokens_in。
 */
export function parseTrendDays(breakdowns: any[], hours: number): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const b of breakdowns) {
    for (const row of b.rows ?? []) {
      const day = row.period ?? row.day;
      if (!day) continue;
      byDay.set(day, (byDay.get(day) ?? 0) + (row.tokens_in ?? row.cost ?? 0));
    }
  }
  const dayLimit = Math.max(1, Math.ceil(hours / 24));
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return days.slice(-dayLimit).map(([day, tokens]) => ({
    ts: new Date(`${day}T00:00:00Z`).toISOString(),
    credits: tokens,
  }));
}

/**
 * 解析 billing summary 输出(个人版当月账单):
 * { totals: { aftertaxAmount }, currency }
 * 返回 { amount, currency },amount 无量纲化为 number。
 */
export function parseBillSummary(raw: any): { amount: number; currency: string } {
  const amount = Number(raw.totals?.aftertaxAmount ?? 0);
  return { amount: Number.isFinite(amount) ? amount : 0, currency: raw.currency ?? 'CNY' };
}

/** 解析 billing balance summary 输出(个人版可用余额):{ availableAmount, currency }。 */
export function parseBalance(raw: any): { amount: number; currency: string } {
  const amount = Number(raw.availableAmount ?? 0);
  return { amount: Number.isFinite(amount) ? amount : 0, currency: raw.currency ?? 'CNY' };
}

/**
 * 解析消费分解:合并 usage summary 的模型 tokens 与 billing breakdown 的模型金额。
 * summaryRaw: { pay_as_you_go: { models: [{ model_id, usage: { tokens } }] } }
 * breakdownRaw: { rows: [{ groupKey, groupLabel, amount }] }
 * 金额在对 token-plan 用户多为 0(套餐抵扣),因此以 tokens 为主,pct 按 tokens 占比。
 */
export function parseConsumption(summaryRaw: any, breakdownRaw: any): ConsumptionRow[] {
  const models: any[] = summaryRaw.pay_as_you_go?.models ?? [];
  const costByModel = new Map<string, number>();
  for (const row of breakdownRaw?.rows ?? []) {
    const key = row.groupKey ?? row.groupLabel;
    if (!key || key === 'DIMENSION_FILTER_NULL_VALUE') continue;
    costByModel.set(key, Number(row.amount ?? 0));
  }
  const totalTokens = models.reduce((s, it) => s + (it.usage?.tokens ?? it.tokens ?? 0), 0);
  return models.map((it) => {
    const tokens = it.usage?.tokens ?? it.tokens ?? 0;
    return {
      name: it.model_id ?? 'unknown',
      credits: tokens,
      cost: costByModel.get(it.model_id) ?? 0,
      pct: totalTokens > 0 ? (tokens / totalTokens) * 100 : 0,
    };
  });
}