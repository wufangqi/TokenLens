import express from 'express';
import cors from 'cors';
import { QianwenCliProvider } from './providers/qianwen-cli';
import { MockProvider } from './providers/mock';
import { createUsageRouter } from './routes/usage';
import { ProviderError } from './models';
import { UsageProvider } from './providers';

const PORT = Number(process.env.PORT || 5174);

// 启动时探测 CLI 可用性:未登录或未安装则降级到 MockProvider
async function chooseProvider(): Promise<{ provider: UsageProvider; source: string }> {
  const cli = new QianwenCliProvider();
  try {
    await cli.teamUsage();
    return { provider: cli, source: 'cli' };
  } catch (e) {
    if (e instanceof ProviderError && (e.kind === 'auth' || e.kind === 'cli-missing')) {
      console.warn(`[TokenLens] ${e.message},已降级到 MockProvider`);
    } else {
      console.warn('[TokenLens] CLI 不可用,已降级到 MockProvider');
    }
    return { provider: new MockProvider(), source: 'mock' };
  }
}

async function main() {
  const { provider, source } = await chooseProvider();
  console.log(`[TokenLens] 数据源: ${source === 'cli' ? 'CLI(真实)' : 'Mock(演示)'}`);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', createUsageRouter(provider));
  app.listen(PORT, () => console.log(`TokenLens backend on http://localhost:${PORT}`));
}

main();