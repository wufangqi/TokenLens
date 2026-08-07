import express from 'express';
import cors from 'cors';
import { QianwenCliProvider } from './providers/qianwen-cli';
import { MockProvider } from './providers/mock';
import { createUsageRouter } from './routes/usage';
import { ProviderError } from './models';
import { UsageProvider } from './providers';

const PORT = Number(process.env.PORT || 5173);

let activeProvider: UsageProvider = new QianwenCliProvider();
let source: 'cli' | 'mock' = 'cli';

// 委托 provider:name 通过 getter 动态反映当前数据源
const delegatingProvider: UsageProvider = {
  get name() {
    return source;
  },
  teamUsage: () => activeProvider.teamUsage(),
  members: () => activeProvider.members(),
  models: () => activeProvider.models(),
  trend: (h: number) => activeProvider.trend(h),
};

// CLI 认证失效时降级到 mock
function fallbackOnAuth(err: any, _req: any, res: any, next: any) {
  if (err instanceof ProviderError && err.kind === 'auth') {
    activeProvider = new MockProvider();
    source = 'mock';
    console.warn('[TokenLens] CLI 认证失效,已降级到 MockProvider');
  }
  next(err);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', createUsageRouter(delegatingProvider));
app.use('/api', fallbackOnAuth);

app.listen(PORT, () => console.log(`TokenLens backend on http://localhost:${PORT}`));