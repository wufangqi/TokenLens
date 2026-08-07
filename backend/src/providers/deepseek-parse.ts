import { TeamUsage } from '../models';

export interface DeepSeekBalanceResponse {
  is_available?: boolean;
  balance_infos?: Array<{
    currency?: string;
    total_balance?: string;
    granted_balance?: string;
    topped_up_balance?: string;
  }>;
}

/** 从 DeepSeek /user/balance JSON 映射到 TeamUsage（优先 CNY）。 */
export function parseDeepSeekBalance(raw: DeepSeekBalanceResponse, generation: number): TeamUsage {
  const infos = raw.balance_infos ?? [];
  const info = infos.find((i) => i.currency === 'CNY') ?? infos[0];
  const num = (v?: string) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    totalCredits: 0,
    remainingCredits: 0,
    usedPct: 0,
    todayCredits: 0,
    generation,
    balanceAmount: num(info?.total_balance),
    grantedBalance: num(info?.granted_balance),
    toppedUpBalance: num(info?.topped_up_balance),
    currency: info?.currency ?? 'CNY',
  };
}
