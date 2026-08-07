export interface TeamUsage {
  totalCredits: number;
  remainingCredits: number;
  usedPct: number;
  todayCredits: number;
  generation: number;
  billAmount?: number;
  balanceAmount?: number;
  currency?: string;
  grantedBalance?: number;
  toppedUpBalance?: number;
  activeDays?: number;
  currentStreak?: number;
}
export interface ConsumptionRow {
  name: string;
  credits: number;
  cost: number;
  pct: number;
}
export interface MemberUsage {
  name: string;
  credits: number;
  sessions: number;
  pct: number;
}
export interface ModelUsage {
  name: string;
  credits: number;
  pct: number;
}
export interface TrendPoint {
  ts: string;
  credits: number;
}
/** 后端响应里的实际数据源标签 */
export type DataSource = 'cli' | 'mock' | 'deepseek' | 'codebuddy';
/** 前端切换用的产品数据源 */
export type SourceQuery = 'qianwen' | 'deepseek' | 'codebuddy';
export interface UsagePayload {
  source: DataSource;
  data: {
    team: TeamUsage;
    members: MemberUsage[];
    models: ModelUsage[];
    trend: TrendPoint[];
    consumption?: ConsumptionRow[];
  };
}
