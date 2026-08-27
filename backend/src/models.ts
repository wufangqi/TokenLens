export interface TeamUsage {
  totalCredits: number;
  remainingCredits: number;
  usedPct: number; // 0-100
  todayCredits: number;
  generation: number; // 每次数据更新递增
  // 个人版 token-plan / DeepSeek 余额字段
  billAmount?: number; // 当月账单金额
  balanceAmount?: number; // 可用余额
  currency?: string; // 如 "CNY"
  grantedBalance?: number; // DeepSeek 赠送余额
  toppedUpBalance?: number; // DeepSeek 充值余额
  // CodeBuddy 本地统计
  activeDays?: number;
  currentStreak?: number;
  // Cursor Session 用量（美元）
  planLimit?: number;
  membershipType?: string;
  billingCycleEnd?: string;
}

export interface ConsumptionRow {
  name: string;
  credits: number; // tokens 用量
  cost: number; // 金额
  pct: number; // 0-100,占总量比例
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