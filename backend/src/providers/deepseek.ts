import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow, ProviderError } from '../models';
import { UsageProvider } from './index';
import { parseDeepSeekBalance } from './deepseek-parse';

export class DeepSeekProvider implements UsageProvider {
  readonly name = 'deepseek' as const;
  private generation = 0;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts?: { apiKey?: string; baseUrl?: string; fetchImpl?: typeof fetch }) {
    this.apiKey = opts?.apiKey ?? process.env.DEEPSEEK_API_KEY ?? '';
    this.baseUrl = (opts?.baseUrl ?? process.env.DEEPSEEK_API_BASE ?? 'https://api.deepseek.com').replace(
      /\/$/,
      '',
    );
    this.fetchImpl = opts?.fetchImpl ?? fetch;
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(`DeepSeek 请求失败: ${(e as Error).message}`, 'server');
    }
  }

  async teamUsage(): Promise<TeamUsage> {
    return this.wrap(async () => {
      if (!this.apiKey) {
        throw new ProviderError('未配置 DEEPSEEK_API_KEY', 'auth');
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      try {
        const res = await this.fetchImpl(`${this.baseUrl}/user/balance`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
          },
          signal: ctrl.signal,
        });
        if (res.status === 401 || res.status === 403) {
          throw new ProviderError('DeepSeek API Key 无效或无权限', 'auth');
        }
        if (!res.ok) {
          throw new ProviderError(`DeepSeek HTTP ${res.status}`, 'server');
        }
        const raw = await res.json();
        this.generation += 1;
        return parseDeepSeekBalance(raw, this.generation);
      } finally {
        clearTimeout(timer);
      }
    });
  }

  async members(): Promise<MemberUsage[]> {
    return [];
  }

  async models(): Promise<ModelUsage[]> {
    return [];
  }

  async consumption(): Promise<ConsumptionRow[]> {
    return [];
  }

  async trend(_hours: number): Promise<TrendPoint[]> {
    return [];
  }
}
