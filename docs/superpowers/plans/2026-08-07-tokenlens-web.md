# TokenLens Web v0.1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 TokenLens Web 版最小可用看板:React 前端轮询本地 Node 后端,后端通过官方 `qianwen` CLI 获取真实 Token Plan Credits 数据,CLI 不可用时降级到 MockProvider。

**Architecture:** 前后端分离。后端(Node + Express + TS)持有 `UsageProvider` 抽象层(`QianwenCliProvider` 调 CLI + `MockProvider` 降级),通过 REST 暴露 `/api/usage`。前端(React + Vite + TS)轮询后端,用 ECharts 渲染看板。后期 Tauri 封装时复用这套前后端。

**Tech Stack:** Node 24, TypeScript, Express, Vitest, React 18, Vite, Zustand, ECharts, `@qianwenai/qianwen-cli`。

**设计文档:** `docs/superpowers/specs/2026-08-07-tokenlens-v0.1-design.md`

---

## 文件结构总览

```
backend/
  package.json, tsconfig.json, vitest.config.ts
  src/
    server.ts                 # Express 入口,provider 选择 + 启动
    models.ts                 # TeamUsage/MemberUsage/ModelUsage/TrendPoint/ProviderError
    providers/
      index.ts                # UsageProvider 接口
      mock.ts                 # MockProvider
      qianwen-cli.ts          # QianwenCliProvider
    cli/
      parse.ts                # CLI JSON 输出解析(纯函数,可测)
    routes/
      usage.ts                # GET /api/usage 路由
  test/
    providers/mock.test.ts
    cli/parse.test.ts
    routes/usage.test.ts
frontend/
  package.json, vite.config.ts, tsconfig.json
  index.html
  src/
    main.tsx, App.tsx
    types/index.ts
    stores/usageStore.ts
    hooks/useUsage.ts
    components/OverviewCards.tsx
    components/TrendChart.tsx
    components/MemberTable.tsx
    components/ModelList.tsx
    components/StatusBar.tsx
```

---

## Task 0: 环境准备与脚手架

**Files:**
- Run: 全局安装 CLI
- Create: `backend/` 脚手架
- Create: `frontend/` 脚手架

- [ ] **Step 1: 安装 qianwen CLI**

```bash
npm install -g @qianwenai/qianwen-cli
qianwen version
```
Expected: 输出 CLI 版本(如 `1.3.0`)。

- [ ] **Step 2: 初始化 backend 脚手架**

```bash
mkdir -p backend/src/providers backend/src/cli backend/src/routes backend/test/providers backend/test/cli backend/test/routes
cd backend
npm init -y
npm install express cors
npm install -D typescript tsx vitest @types/express @types/cors @types/node
npx tsc --init
```
- 在 `package.json` 添加 scripts:
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "vitest run"
}
```
- 在 `tsconfig.json` 设置 `"outDir": "dist"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`, `"esModuleInterop": true`。

- [ ] **Step 3: 初始化 frontend 脚手架**

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install zustand echarts
npm install -D @types/echarts
```
Expected: 生成 `frontend/` React+TS 模板。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "chore: scaffold backend and frontend projects"
```

---

## Task 1: 后端数据模型

**Files:**
- Create: `backend/src/models.ts`
- Test: `backend/test/providers/mock.test.ts`(在下个任务,此处仅定义类型)

- [ ] **Step 1: 定义共享数据模型**

创建 `backend/src/models.ts`:
```ts
export interface TeamUsage {
  totalCredits: number;
  remainingCredits: number;
  usedPct: number;      // 0-100
  todayCredits: number;
  generation: number;   // 每次数据更新递增
}

export interface MemberUsage {
  name: string;
  credits: number;
  sessions: number;
  pct: number;          // 0-100,占团队比例
}

export interface ModelUsage {
  name: string;
  credits: number;
  pct: number;          // 0-100
}

export interface TrendPoint {
  ts: string;           // ISO 时间
  credits: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: 'auth' | 'cli-missing' | 'rate-limit' | 'server' | 'not-found' | 'parse' | 'unknown'
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/models.ts && git commit -m "feat(backend): define shared data models"
```

---

## Task 2: 后端 UsageProvider 接口 + MockProvider(TDD)

**Files:**
- Create: `backend/src/providers/index.ts`
- Create: `backend/src/providers/mock.ts`
- Test: `backend/test/providers/mock.test.ts`

- [ ] **Step 1: 定义 UsageProvider 接口**

创建 `backend/src/providers/index.ts`:
```ts
import { TeamUsage, MemberUsage, ModelUsage, TrendPoint } from '../models';

export interface UsageProvider {
  readonly name: 'cli' | 'mock';
  teamUsage(): Promise<TeamUsage>;
  members(): Promise<MemberUsage[]>;
  models(): Promise<ModelUsage[]>;
  trend(hours: number): Promise<TrendPoint[]>;
}
```

- [ ] **Step 2: 写失败测试**

创建 `backend/test/providers/mock.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/providers/mock';

describe('MockProvider', () => {
  it('generates monotonically increasing generation', async () => {
    const p = new MockProvider();
    const t1 = await p.teamUsage();
    const t2 = await p.teamUsage();
    expect(t2.generation).toBeGreaterThan(t1.generation);
  });

  it('usedPct is between 0 and 100', async () => {
    const p = new MockProvider();
    const t = await p.teamUsage();
    expect(t.usedPct).toBeGreaterThanOrEqual(0);
    expect(t.usedPct).toBeLessThanOrEqual(100);
  });

  it('members sum to roughly team total', async () => {
    const p = new MockProvider();
    const [team, members] = await Promise.all([p.teamUsage(), p.members()]);
    const sum = members.reduce((a, m) => a + m.credits, 0);
    expect(Math.abs(sum - team.totalCredits)).toBeLessThan(team.totalCredits * 0.2);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd backend && npx vitest run test/providers/mock.test.ts`
Expected: FAIL(`Cannot find module '../../src/providers/mock'` 或接口未实现)。

- [ ] **Step 4: 实现 MockProvider**

创建 `backend/src/providers/mock.ts`:
```ts
import { TeamUsage, MemberUsage, ModelUsage, TrendPoint } from '../models';
import { UsageProvider } from './index';

const TOTAL = 250000; // 模拟标准席位 Credits 总量
const MEMBERS = ['Alice', 'Bob', 'Carol', 'Dave'];
const MODELS = ['qwen-max', 'deepseek-v3', 'kimi-k2'];

export class MockProvider implements UsageProvider {
  readonly name = 'mock' as const;
  private generation = 0;
  private base = TOTAL * 0.42;

  private drift(): number {
    return (Math.sin(Date.now() / 60000) + 1) * 50; // 平滑波动
  }

  async teamUsage(): Promise<TeamUsage> {
    this.generation += 1;
    const total = this.base + this.drift();
    return {
      totalCredits: total,
      remainingCredits: TOTAL - total,
      usedPct: (total / TOTAL) * 100,
      todayCredits: 120 + (Date.now() % 80),
      generation: this.generation,
    };
  }

  async members(): Promise<MemberUsage[]> {
    const team = await this.teamUsage();
    const weights = [0.4, 0.3, 0.2, 0.1];
    return MEMBERS.map((name, i) => {
      const credits = team.totalCredits * weights[i];
      return { name, credits, sessions: 20 + i * 7, pct: weights[i] * 100 };
    });
  }

  async models(): Promise<ModelUsage[]> {
    const team = await this.teamUsage();
    const weights = [0.5, 0.3, 0.2];
    return MODELS.map((name, i) => ({
      name,
      credits: team.totalCredits * weights[i],
      pct: weights[i] * 100,
    }));
  }

  async trend(hours: number): Promise<TrendPoint[]> {
    const now = Date.now();
    return Array.from({ length: hours }, (_, i) => {
      const ts = new Date(now - (hours - i) * 3600_000);
      return { ts: ts.toISOString(), credits: 40 + Math.sin(i) * 20 + i };
    });
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd backend && npx vitest run test/providers/mock.test.ts`
Expected: PASS(3 个测试)。

- [ ] **Step 6: 提交**

```bash
git add backend/src/providers backend/test/providers && git commit -m "feat(backend): add UsageProvider interface and MockProvider"
```

---

## Task 3: 后端 CLI JSON 解析(TDD,纯函数)

**Files:**
- Create: `backend/src/cli/parse.ts`
- Test: `backend/test/cli/parse.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `backend/test/cli/parse.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseTeamUsage, parseModelUsage, parseSeats } from '../../src/cli/parse';

const usageSummaryFixture = {
  token_plan: {
    subscribed: true,
    planName: '团队版',
    totalCredits: 250000,
    remainingCredits: 145000,
    usedPct: 42,
    resetDate: '2026-09-01',
  },
};

describe('parseTeamUsage', () => {
  it('maps token_plan fields to TeamUsage', () => {
    const out = parseTeamUsage(usageSummaryFixture);
    expect(out.totalCredits).toBe(250000);
    expect(out.remainingCredits).toBe(145000);
    expect(out.usedPct).toBe(42);
  });
});

describe('parseModelUsage', () => {
  it('maps breakdown models to ModelUsage', () => {
    const fixture = {
      items: [
        { model_id: 'qwen-max', usage: { tokens: 1000 }, cost: 2.0 },
        { model_id: 'deepseek-v3', usage: { tokens: 500 }, cost: 1.0 },
      ],
    };
    const out = parseModelUsage(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('qwen-max');
    expect(out[0].pct).toBeCloseTo(66.67, 1);
  });
});

describe('parseSeats', () => {
  it('maps seats to MemberUsage', () => {
    const fixture = {
      seats: [
        { user_name: 'Alice', spec_type: 'pro' },
        { user_name: 'Bob', spec_type: 'standard' },
      ],
    };
    const out = parseSeats(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Alice');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && npx vitest run test/cli/parse.test.ts`
Expected: FAIL(`Cannot find module '../../src/cli/parse'`)。

- [ ] **Step 3: 实现解析函数(基于 CLI 文档字段)**

创建 `backend/src/cli/parse.ts`:
```ts
import { TeamUsage, MemberUsage, ModelUsage } from '../models';

export function parseTeamUsage(raw: any): TeamUsage {
  const tp = raw.token_plan ?? {};
  return {
    totalCredits: tp.totalCredits ?? 0,
    remainingCredits: tp.remainingCredits ?? 0,
    usedPct: tp.usedPct ?? 0,
    todayCredits: 0, // CLI 未直接提供,后续可从 breakdown 聚合
    generation: 0,
  };
}

export function parseModelUsage(raw: any): ModelUsage[] {
  const items: any[] = raw.items ?? [];
  const total = items.reduce((s, it) => s + (it.cost ?? 0), 0);
  return items.map((it) => ({
    name: it.model_id ?? 'unknown',
    credits: it.cost ?? 0,
    pct: total > 0 ? ((it.cost ?? 0) / total) * 100 : 0,
  }));
}

export function parseSeats(raw: any): MemberUsage[] {
  const seats: any[] = raw.seats ?? [];
  return seats.map((s) => ({
    name: s.user_name ?? 'unknown',
    credits: 0,
    sessions: 0,
    pct: 0,
  }));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend && npx vitest run test/cli/parse.test.ts`
Expected: PASS(3 个 describe 块)。

- [ ] **Step 5: 提交**

```bash
git add backend/src/cli backend/test/cli && git commit -m "feat(backend): add CLI JSON output parsers"
```

---

## Task 4: 后端 QianwenCliProvider

**Files:**
- Create: `backend/src/providers/qianwen-cli.ts`
- Test: `backend/test/providers/mock.test.ts` 不涉及;本项目以小段集成验证代替

- [ ] **Step 1: 实现 CLI 调用封装**

创建 `backend/src/providers/qianwen-cli.ts`:
```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { TeamUsage, MemberUsage, ModelUsage, TrendPoint } from '../models';
import { ProviderError } from '../models';
import { UsageProvider } from './index';
import { parseTeamUsage, parseModelUsage, parseSeats } from '../cli/parse';

const exec = promisify(execFile);

async function run(args: string[]): Promise<any> {
  const { stdout, stderr } = await exec('qianwen', [...args, '--format', 'json'], { timeout: 30000, encoding: 'utf8' });
  if (stderr) console.error('[qianwen]', stderr);
  return JSON.parse(stdout);
}

function exitToError(code: number, message: string): ProviderError {
  switch (code) {
    case 2: return new ProviderError('登录失效,请运行 qianwen auth login', 'auth');
    case 5: return new ProviderError('请求限流,请稍后重试', 'rate-limit');
    case 6: return new ProviderError('服务端错误', 'server');
    case 7: return new ProviderError('资源未找到', 'not-found');
    default: return new ProviderError(message || 'CLI 调用失败', 'unknown');
  }
}

export class QianwenCliProvider implements UsageProvider {
  readonly name = 'cli' as const;
  private generation = 0;

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e.code === 'ENOENT') throw new ProviderError('未安装 qianwen CLI,npm install -g @qianwenai/qianwen-cli', 'cli-missing');
      if (typeof e.code === 'number') throw exitToError(e.code, e.message);
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(`数据解析失败: ${e.message}`, 'parse');
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
```

> 注:`exitToError` 假定 CLI 以非零退出码时 `execFile` 抛错并在 `error.code` 携带退出码。若实际 CLI 以退出码 0 返回错误 JSON,需在 Step 2 的集成验证中据此调整。

- [ ] **Step 2: 集成验证(可选,需已登录)**

```bash
cd backend && npx tsx -e "import { QianwenCliProvider } from './src/providers/qianwen-cli'; const p=new QianwenCliProvider(); p.teamUsage().then(console.log).catch(e=>console.error('ERR',e.message, e.kind));"
```
Expected:`auth` 错误(未登录)或合法 `TeamUsage` 对象(已登录)。若未登录,记录该行为用于降级逻辑。

- [ ] **Step 3: 提交**

```bash
git add backend/src/providers/qianwen-cli.ts && git commit -m "feat(backend): add QianwenCliProvider calling official CLI"
```

---

## Task 5: 后端 Provider 选择 + Express 路由

**Files:**
- Create: `backend/src/server.ts`
- Create: `backend/src/routes/usage.ts`
- Test: `backend/test/routes/usage.test.ts`

- [ ] **Step 1: 安装 supertest 并写失败测试(路由响应 + 认证错误)**

```bash
cd backend && npm install -D supertest @types/supertest
```

创建 `backend/test/routes/usage.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createUsageRouter } from '../../src/routes/usage';
import { ProviderError } from '../../src/models';

function makeApp(provider: any) {
  const app = express();
  app.use(express.json());
  app.use('/api', createUsageRouter(provider));
  return app;
}

describe('usage route', () => {
  it('returns provider data with source label', async () => {
    const provider = {
      name: 'mock',
      teamUsage: vi.fn().mockResolvedValue({ totalCredits: 100, remainingCredits: 50, usedPct: 50, todayCredits: 1, generation: 1 }),
      members: vi.fn().mockResolvedValue([]),
      models: vi.fn().mockResolvedValue([]),
      trend: vi.fn().mockResolvedValue([]),
    };
    const res = await request(makeApp(provider)).get('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mock');
    expect(res.body.data.team.totalCredits).toBe(100);
  });

  it('returns 401 when provider throws auth error', async () => {
    const provider = {
      name: 'cli',
      teamUsage: vi.fn().mockRejectedValue(new ProviderError('login needed', 'auth')),
      members: vi.fn().mockResolvedValue([]),
      models: vi.fn().mockResolvedValue([]),
      trend: vi.fn().mockResolvedValue([]),
    };
    const res = await request(makeApp(provider)).get('/api/usage');
    expect(res.status).toBe(401);
    expect(res.body.kind).toBe('auth');
  });
});
```

- [ ] **Step 2: 实现 routes/usage.ts**

创建 `backend/src/routes/usage.ts`:
```ts
import { Router } from 'express';
import { UsageProvider } from '../providers';
import { ProviderError } from '../models';

export function createUsageRouter(provider: UsageProvider): Router {
  const r = Router();
  r.get('/usage', async (_req, res) => {
    try {
      const [team, members, models, trend] = await Promise.all([
        provider.teamUsage(), provider.members(), provider.models(), provider.trend(24),
      ]);
      res.json({ source: provider.name, data: { team, members, models, trend } });
    } catch (e) {
      if (e instanceof ProviderError) {
        res.status(e.kind === 'auth' ? 401 : 502).json({ error: e.message, kind: e.kind });
      } else {
        res.status(500).json({ error: '内部错误', kind: 'unknown' });
      }
    }
  });
  return r;
}
```

- [ ] **Step 3: 实现 server.ts(provider 选择 + 降级)**

创建 `backend/src/server.ts`:
```ts
import express from 'express';
import cors from 'cors';
import { QianwenCliProvider } from './providers/qianwen-cli';
import { MockProvider } from './providers/mock';
import { createUsageRouter } from './routes/usage';
import { ProviderError } from './models';

const PORT = Number(process.env.PORT || 5173);

function pickProvider(): { provider: any; source: string } {
  const cli = new QianwenCliProvider();
  // 探测 CLI 是否可用(仅检查命令存在,不触发真实调用)
  return { provider: cli, source: 'cli' };
}

const app = express();
app.use(cors());
app.use(express.json());

const { provider } = pickProvider();
let activeProvider = provider;
let source: string = 'cli';

app.use('/api', createUsageRouter(activeProvider));

// 降级:CLI 认证失败时切到 mock
app.use('/api', (err: any, _req: any, res: any, next: any) => {
  if (err instanceof ProviderError && err.kind === 'auth') {
    activeProvider = new MockProvider();
    source = 'mock';
  }
  next(err);
});

app.listen(PORT, () => console.log(`TokenLens backend on http://localhost:${PORT}`));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend && npx vitest run`
Expected: 全部 PASS(含 mock/parse/usage 测试,usage 路由 2 个用例)。

- [ ] **Step 5: 手动启动验证**

```bash
cd backend && npm run dev
```
Expected: 输出 `TokenLens backend on http://localhost:5173`。浏览器访问 `http://localhost:5173/api/usage` 返回 JSON(未登录时返回 401 `{ error, kind: 'auth' }`)。

- [ ] **Step 6: 提交**

```bash
git add backend/src/server.ts backend/src/routes backend/test/routes && git commit -m "feat(backend): add provider selection and usage REST route"
```

---

## Task 6: 前端类型 + Zustand store + useUsage hook

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/stores/usageStore.ts`
- Create: `frontend/src/hooks/useUsage.ts`

- [ ] **Step 1: 定义前端类型**

创建 `frontend/src/types/index.ts`:
```ts
export interface TeamUsage {
  totalCredits: number;
  remainingCredits: number;
  usedPct: number;
  todayCredits: number;
  generation: number;
}
export interface MemberUsage { name: string; credits: number; sessions: number; pct: number; }
export interface ModelUsage { name: string; credits: number; pct: number; }
export interface TrendPoint { ts: string; credits: number; }
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
```

- [ ] **Step 2: 创建 Zustand store**

创建 `frontend/src/stores/usageStore.ts`:
```ts
import { create } from 'zustand';
import { UsagePayload } from '../types';

interface UsageState {
  payload: UsagePayload | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  setPayload: (p: UsagePayload) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  payload: null,
  loading: false,
  error: null,
  lastUpdated: null,
  setPayload: (p) => set({ payload: p, lastUpdated: Date.now(), error: null, loading: false }),
  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e, loading: false }),
}));
```

- [ ] **Step 3: 创建 useUsage 轮询 hook**

创建 `frontend/src/hooks/useUsage.ts`:
```ts
import { useEffect } from 'react';
import { useUsageStore } from '../stores/usageStore';
import { UsagePayload } from '../types';

const API = import.meta.env.VITE_API ?? 'http://localhost:5173/api';

export function useUsage(intervalMs: number) {
  const setPayload = useUsageStore((s) => s.setPayload);
  const setLoading = useUsageStore((s) => s.setLoading);
  const setError = useUsageStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/usage`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: UsagePayload = await res.json();
        if (!cancelled) setPayload(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
    };
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs, setPayload, setLoading, setError]);
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/types frontend/src/stores frontend/src/hooks && git commit -m "feat(frontend): add types, zustand store, and useUsage polling hook"
```

---

## Task 7: 前端看板组件

**Files:**
- Create: `frontend/src/components/OverviewCards.tsx`
- Create: `frontend/src/components/TrendChart.tsx`
- Create: `frontend/src/components/MemberTable.tsx`
- Create: `frontend/src/components/ModelList.tsx`
- Create: `frontend/src/components/StatusBar.tsx`

- [ ] **Step 1: OverviewCards**

创建 `frontend/src/components/OverviewCards.tsx`:
```tsx
import { useUsageStore } from '../stores/usageStore';

export function OverviewCards() {
  const team = useUsageStore((s) => s.payload?.data.team);
  if (!team) return null;
  const cards = [
    { label: '总 Credits 消耗', value: Math.round(team.totalCredits).toLocaleString(), suffix: '' },
    { label: '剩余额度', value: Math.round(team.remainingCredits).toLocaleString(), suffix: '' },
    { label: '今日消耗', value: Math.round(team.todayCredits).toLocaleString(), suffix: '' },
  ];
  return (
    <div className="overview">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <div className="label">{c.label}</div>
          <div className="value">{c.value}{c.suffix}</div>
        </div>
      ))}
      <div className="card">
        <div className="label">已用占比</div>
        <div className="bar"><div className="fill" style={{ width: `${team.usedPct}%` }} /></div>
        <div className="pct">{Math.round(team.usedPct)}%</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TrendChart(ECharts)**

创建 `frontend/src/components/TrendChart.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useUsageStore } from '../stores/usageStore';

export function TrendChart() {
  const ref = useRef<HTMLDivElement>(null);
  const trend = useUsageStore((s) => s.payload?.data.trend ?? []);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', name: 'Credits' },
      series: [{ type: 'line', smooth: true, data: trend.map((p) => [p.ts, p.credits]), areaStyle: {} }],
    });
    return () => chart.dispose();
  }, [trend]);
  return <div ref={ref} style={{ width: '100%', height: 280 }} />;
}
```

- [ ] **Step 3: MemberTable**

创建 `frontend/src/components/MemberTable.tsx`:
```tsx
import { useUsageStore } from '../stores/usageStore';

export function MemberTable() {
  const members = useUsageStore((s) => s.payload?.data.members ?? []);
  return (
    <table>
      <thead><tr><th>成员</th><th>Credits</th><th>会话数</th><th>占比</th></tr></thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.name}>
            <td>{m.name}</td>
            <td>{Math.round(m.credits).toLocaleString()}</td>
            <td>{m.sessions}</td>
            <td>{Math.round(m.pct)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: ModelList**

创建 `frontend/src/components/ModelList.tsx`:
```tsx
import { useUsageStore } from '../stores/usageStore';

export function ModelList() {
  const models = useUsageStore((s) => s.payload?.data.models ?? []);
  return (
    <ul>
      {models.map((m) => (
        <li key={m.name}>
          <span>{m.name}</span>
          <span>{Math.round(m.credits).toLocaleString()} ({Math.round(m.pct)}%)</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: StatusBar**

创建 `frontend/src/components/StatusBar.tsx`:
```tsx
import { useUsageStore } from '../stores/usageStore';

export function StatusBar() {
  const source = useUsageStore((s) => s.payload?.source);
  const loading = useUsageStore((s) => s.loading);
  const error = useUsageStore((s) => s.error);
  const updated = useUsageStore((s) => s.lastUpdated);
  return (
    <div className="statusbar">
      <span>数据源:{source === 'cli' ? 'CLI(真实)' : 'Mock(演示)'}</span>
      <span>{loading ? '刷新中…' : error ? `错误:${error}` : updated ? `更新于 ${new Date(updated).toLocaleTimeString()}` : ''}</span>
    </div>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add frontend/src/components && git commit -m "feat(frontend): add dashboard components"
```

---

## Task 8: 前端 App 组装 + 联调

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.css`(或 index.css)

- [ ] **Step 1: 组装 App**

修改 `frontend/src/App.tsx`:
```tsx
import { useUsage } from './hooks/useUsage';
import { OverviewCards } from './components/OverviewCards';
import { TrendChart } from './components/TrendChart';
import { MemberTable } from './components/MemberTable';
import { ModelList } from './components/ModelList';
import { StatusBar } from './components/StatusBar';

const INTERVAL_MS = 5000;

export default function App() {
  useUsage(INTERVAL_MS);
  return (
    <div className="app">
      <header><h1>TokenLens</h1><StatusBar /></header>
      <OverviewCards />
      <section className="trend"><TrendChart /></section>
      <section className="grid">
        <MemberTable />
        <ModelList />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 更新 main.tsx 与样式**

修改 `frontend/src/main.tsx` 入口(保留 React StrictMode 渲染 `<App />`)。在 `frontend/src/App.css` 添加基础布局样式(卡片、表格、进度条、状态栏布局)。

- [ ] **Step 3: 联调验证**

```bash
# 终端 1:后端
cd backend && npm run dev
# 终端 2:前端
cd frontend && npm run dev
```
浏览器打开 Vite 输出的 URL(默认 http://localhost:5173,若冲突改后端端口)。Expected:看板渲染;StatusBar 显示数据源与更新时间;未登录时后端返回 401,前端降级启动 mock(见 Task 5 降级逻辑联动)。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx frontend/src/App.css && git commit -m "feat(frontend): assemble dashboard app"
```

---

## 验证(端到端)

1. 后端:`cd backend && npm test` → 全部 PASS。
2. 启动后端 `npm run dev` + 前端 `npm run dev`。
3. 浏览器打开前端地址,确认四个区块渲染、状态栏更新时间跳动。
4. 未登录时确认后端 `/api/usage` 返回 401 `{ kind: 'auth' }`,前端展示降级提示。
5. 若已 `qianwen auth login`,确认显示真实 CLI 数据。

## 后续里程碑(本期不做)

- Desktop 封装(Tauri 打包前端 + 后端)
- 真实成员消耗聚合(CLI seats → credits)、直接 REST API 对接
- 阈值告警、趋势预测、缓存命中率
- 数据导出、托盘、悬浮窗