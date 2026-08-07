import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { TeamUsage, MemberUsage, ModelUsage, TrendPoint } from '../models';
import { ProviderError } from '../models';
import { UsageProvider } from './index';
import { parseTeamUsage, parseModelUsage, parseSeats } from '../cli/parse';

const exec = promisify(execFile);

interface CliError extends Error {
  code?: number | string;
}

async function run(args: string[]): Promise<any> {
  const { stdout, stderr } = await exec('qianwen', [...args, '--format', 'json'], {
    timeout: 30000,
    encoding: 'utf8',
  });
  if (stderr) console.error('[qianwen]', stderr);
  return JSON.parse(stdout);
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

  async teamUsage(): Promise<TeamUsage> {
    return this.wrap(async () => {
      const raw = await run(['usage', 'summary']);
      const t = parseTeamUsage(raw);
      this.generation += 1;
      return { ...t, generation: this.generation };
    });
  }

  async members(): Promise<MemberUsage[]> {
    return this.wrap(async () => {
      const raw = await run(['subscription', 'tokenplan', 'seats']);
      return parseSeats(raw);
    });
  }

  async models(): Promise<ModelUsage[]> {
    return this.wrap(async () => {
      const raw = await run(['usage', 'breakdown', '--days', '7']);
      return parseModelUsage(raw);
    });
  }

  async trend(hours: number): Promise<TrendPoint[]> {
    return this.wrap(async () => {
      const raw = await run(['usage', 'breakdown', '--days', String(Math.max(1, Math.ceil(hours / 24)))]);
      const items: any[] = raw.items ?? [];
      return items.slice(-hours).map((it) => ({
        ts: new Date(it.day ?? Date.now()).toISOString(),
        credits: it.cost ?? 0,
      }));
    });
  }
}