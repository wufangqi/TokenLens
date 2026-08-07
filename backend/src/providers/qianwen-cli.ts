import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow } from '../models';
import { ProviderError } from '../models';
import { UsageProvider } from './index';
import {
  parseTeamUsage,
  parseModelUsage,
  parseSeats,
  parseTrendDays,
  parseBillSummary,
  parseBalance,
  parseConsumption,
} from '../cli/parse';

const exec = promisify(execFile);

interface CliError extends Error {
  code?: number | string;
  stdout?: string;
  stderr?: string;
}

/** 解析 stdout;CLI 偶发以 JSON error 对象返回业务错误(exit 0)。 */
function parseStdout(stdout: string): any {
  const raw = JSON.parse(stdout);
  if (raw?.error?.message) {
    const code = Number(raw.error.exit_code ?? 1);
    throw exitToError(code, raw.error.message);
  }
  return raw;
}

/**
 * 调用 qianwen CLI。
 * 个人版 usage summary 在 FreeTier 不完整时会非零退出并在 stderr 警告,
 * 但 stdout 仍可能是完整 JSON——此时应恢复数据而非失败。
 */
async function run(args: string[]): Promise<any> {
  try {
    const { stdout, stderr } = await exec('qianwen', [...args, '--format', 'json'], {
      timeout: 60000,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stderr) console.warn('[qianwen]', stderr.trim());
    return parseStdout(stdout);
  } catch (e) {
    const err = e as CliError;
    if (err.stdout) {
      try {
        const recovered = parseStdout(err.stdout);
        console.warn(
          '[qianwen] recovered JSON after non-zero exit:',
          (err.stderr || err.message || '').toString().slice(0, 200),
        );
        return recovered;
      } catch {
        /* fall through */
      }
    }
    throw e;
  }
}

function exitToError(code: number, message: string): ProviderError {
  switch (code) {
    case 2:
      return new ProviderError('登录失效,请运行 qianwen auth login', 'auth');
    case 5:
      return new ProviderError('请求限流,请稍后重试', 'rate-limit');
    case 6:
      return new ProviderError('服务端错误', 'server');
    case 7:
      return new ProviderError('资源未找到', 'not-found');
    default:
      return new ProviderError(message || 'CLI 调用失败', 'unknown');
  }
}

export class QianwenCliProvider implements UsageProvider {
  readonly name = 'cli' as const;
  private generation = 0;
  private summaryCache: { at: number; raw: any } | null = null;
  private static SUMMARY_TTL_MS = 30_000;

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      const err = e as CliError;
      if (err instanceof ProviderError) throw err;
      if (err.code === 'ENOENT') {
        throw new ProviderError(
          '未安装 qianwen CLI,npm install -g @qianwenai/qianwen-cli',
          'cli-missing',
        );
      }
      if (typeof err.code === 'number') throw exitToError(err.code, err.message);
      throw new ProviderError(`数据解析失败: ${err.message}`, 'parse');
    }
  }

  /** 个人版与团队版共用 usage summary;短时缓存避免一次请求打爆 CLI。 */
  private async usageSummary(): Promise<any> {
    const now = Date.now();
    if (this.summaryCache && now - this.summaryCache.at < QianwenCliProvider.SUMMARY_TTL_MS) {
      return this.summaryCache.raw;
    }
    const raw = await run(['usage', 'summary']);
    this.summaryCache = { at: now, raw };
    return raw;
  }

  async teamUsage(): Promise<TeamUsage> {
    return this.wrap(async () => {
      // 个人版:token_plan.subscribed=false,真实用量在 pay_as_you_go;账单/余额走 billing
      const raw = await this.usageSummary();
      const t = parseTeamUsage(raw);
      const models: any[] = raw.pay_as_you_go?.models ?? [];
      const totalTokens = models.reduce((s, it) => s + (it.usage?.tokens ?? it.tokens ?? 0), 0);

      let bill = { amount: 0, currency: 'CNY' };
      let balance = { amount: 0, currency: 'CNY' };
      try {
        const [billRaw, balanceRaw] = await Promise.all([
          run(['billing', 'summary']),
          run(['billing', 'balance', 'summary']),
        ]);
        bill = parseBillSummary(billRaw);
        balance = parseBalance(balanceRaw);
      } catch (e) {
        console.warn('[TokenLens] billing 拉取失败,概览仅展示用量:', (e as Error).message);
      }

      this.generation += 1;
      return {
        ...t,
        // 个人版无团队 Credits 额度字段,用本月模型 tokens 总量作为用量指标
        totalCredits: totalTokens || t.totalCredits,
        billAmount: bill.amount,
        balanceAmount: balance.amount,
        currency: bill.currency ?? balance.currency ?? 'CNY',
        generation: this.generation,
      };
    });
  }

  async members(): Promise<MemberUsage[]> {
    return this.wrap(async () => {
      // 团队版 seats;个人版通常为空列表,不视为错误
      try {
        const raw = await run(['subscription', 'tokenplan', 'seats']);
        return parseSeats(raw);
      } catch (e) {
        if (e instanceof ProviderError && (e.kind === 'not-found' || e.kind === 'unknown')) {
          return [];
        }
        throw e;
      }
    });
  }

  async models(): Promise<ModelUsage[]> {
    return this.wrap(async () => {
      const raw = await this.usageSummary();
      return parseModelUsage(raw);
    });
  }

  async consumption(): Promise<ConsumptionRow[]> {
    return this.wrap(async () => {
      const summaryRaw = await this.usageSummary();
      let breakdownRaw: any = { rows: [] };
      try {
        breakdownRaw = await run(['billing', 'breakdown', '--group-by', 'model']);
      } catch (e) {
        console.warn('[TokenLens] billing breakdown 失败,金额列置 0:', (e as Error).message);
      }
      return parseConsumption(summaryRaw, breakdownRaw);
    });
  }

  async trend(hours: number): Promise<TrendPoint[]> {
    return this.wrap(async () => {
      // breakdown 必须带 --model;汇总各模型逐日 tokens_in
      const summary = await this.usageSummary();
      const models = summary.pay_as_you_go?.models ?? [];
      if (models.length === 0) return [];
      const days = Math.max(1, Math.ceil(hours / 24));
      const breakdowns = await Promise.all(
        models.map(async (m: any) => {
          try {
            return await run(['usage', 'breakdown', '--model', m.model_id, '--days', String(days)]);
          } catch (e) {
            console.warn(`[TokenLens] breakdown ${m.model_id} 失败:`, (e as Error).message);
            return { model_id: m.model_id, rows: [] };
          }
        }),
      );
      return parseTrendDays(breakdowns, hours);
    });
  }
}
