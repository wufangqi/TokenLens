export interface TeamUsage {
  totalCredits: number;
  remainingCredits: number;
  usedPct: number; // 0-100
  todayCredits: number;
  generation: number; // 每次数据更新递增
}

export interface MemberUsage {
  name: string;
  credits: number;
  sessions: number;
  pct: number; // 0-100,占团队比例
}

export interface ModelUsage {
  name: string;
  credits: number;
  pct: number; // 0-100
}

export interface TrendPoint {
  ts: string; // ISO 时间
  credits: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | 'auth'
      | 'cli-missing'
      | 'rate-limit'
      | 'server'
      | 'not-found'
      | 'parse'
      | 'unknown',
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}