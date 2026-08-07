export interface TeamUsage {
  totalCredits: number;
  remainingCredits: number;
  usedPct: number;
  todayCredits: number;
  generation: number;
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
export type DataSource = 'cli' | 'mock';
export interface UsagePayload {
  source: DataSource;
  data: {
    team: TeamUsage;
    members: MemberUsage[];
    models: ModelUsage[];
    trend: TrendPoint[];
  };
}