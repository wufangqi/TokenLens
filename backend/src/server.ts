import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { QianwenCliProvider } from './providers/qianwen-cli';
import { MockProvider } from './providers/mock';
import { DeepSeekProvider } from './providers/deepseek';
import { CodeBuddyProvider } from './providers/codebuddy';
import { createUsageRouter } from './routes/usage';
import { ProviderError } from './models';
import { UsageProvider } from './providers';

const PORT = Number(process.env.PORT || 5174);

/** 轻量加载 backend/.env（不覆盖已有环境变量；无依赖）。 */
function loadDotEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

// 启动时探测 CLI:仅认证失败 / 未安装才降级 Mock。
async function chooseQianwenProvider(): Promise<{ provider: UsageProvider; source: string }> {
  const cli = new QianwenCliProvider();
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await cli.teamUsage();
      return { provider: cli, source: 'cli' };
    } catch (e) {
      lastErr = e;
      if (e instanceof ProviderError && (e.kind === 'auth' || e.kind === 'cli-missing')) {
        console.warn(`[TokenLens] ${e.message},已降级到 MockProvider`);
        return { provider: new MockProvider(), source: 'mock' };
      }
      console.warn(`[TokenLens] CLI 探测第 ${attempt} 次失败:`, (e as Error).message);
    }
  }
  console.warn(
    '[TokenLens] CLI 探测未完全成功,仍使用 QianwenCliProvider:',
    (lastErr as Error)?.message,
  );
  return { provider: cli, source: 'cli' };
}

async function main() {
  const { provider: qianwen, source } = await chooseQianwenProvider();
  const deepseek = new DeepSeekProvider();
  const codebuddy = new CodeBuddyProvider();
  console.log(`[TokenLens] 千问数据源: ${source === 'cli' ? 'CLI(真实)' : 'Mock(演示)'}`);
  console.log(
    `[TokenLens] DeepSeek: ${process.env.DEEPSEEK_API_KEY ? '已配置 API Key' : '未配置 DEEPSEEK_API_KEY'}`,
  );
  console.log(
    `[TokenLens] CodeBuddy: ${process.env.CODEBUDDY_API_BASE ?? 'http://127.0.0.1:8080'}`,
  );

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', createUsageRouter({ qianwen, deepseek, codebuddy }));
  app.listen(PORT, () => console.log(`TokenLens backend on http://localhost:${PORT}`));
}

main();
