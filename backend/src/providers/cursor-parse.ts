import { TeamUsage } from '../models';

/** Cursor GET /api/usage-summary 响应（金额单位为美分）。 */
export interface CursorUsageSummary {
  billingCycleStart?: string;
  billingCycleEnd?: string;
  membershipType?: string;
  isUnlimited?: boolean;
  individualUsage?: {
    plan?: {
      enabled?: boolean;
      used?: number;
      limit?: number;
      remaining?: number;
    };
    onDemand?: {
      enabled?: boolean;
      used?: number;
      limit?: number | null;
      remaining?: number | null;
    };
  };
}

const centsToDollars = (cents?: number | null) => {
  const n = Number(cents ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
};

export function parseCursorUsageSummary(raw: CursorUsageSummary, generation: number): TeamUsage {
  const plan = raw.individualUsage?.plan ?? {};
  const used = centsToDollars(plan.used);
  const limit = centsToDollars(plan.limit);
  const remaining = centsToDollars(plan.remaining ?? (plan.limit != null && plan.used != null ? plan.limit - plan.used : 0));
  const usedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return {
    totalCredits: 0,
    remainingCredits: remaining,
    usedPct,
    todayCredits: 0,
    generation,
    billAmount: used,
    balanceAmount: remaining,
    planLimit: limit,
    currency: 'USD',
    membershipType: raw.membershipType,
    billingCycleEnd: raw.billingCycleEnd,
  };
}
