import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow } from '../models';

export interface UsageProvider {
  readonly name: 'cli' | 'mock' | 'deepseek' | 'codebuddy' | 'cursor';
  teamUsage(): Promise<TeamUsage>;
  members(): Promise<MemberUsage[]>;
  models(): Promise<ModelUsage[]>;
  trend(hours: number): Promise<TrendPoint[]>;
  consumption(): Promise<ConsumptionRow[]>;
}

export type UsageSourceQuery = 'qianwen' | 'deepseek' | 'codebuddy' | 'cursor';
