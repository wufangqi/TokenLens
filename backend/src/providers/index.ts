import { TeamUsage, MemberUsage, ModelUsage, TrendPoint } from '../models';

export interface UsageProvider {
  readonly name: 'cli' | 'mock';
  teamUsage(): Promise<TeamUsage>;
  members(): Promise<MemberUsage[]>;
  models(): Promise<ModelUsage[]>;
  trend(hours: number): Promise<TrendPoint[]>;
}