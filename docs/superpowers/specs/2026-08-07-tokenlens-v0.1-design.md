# TokenLens v0.1 设计文档

- 日期:2026-08-07
- 状态:已获用户批准(v2 修订,改为 Web 端优先,后期封装 Desktop)
- 范围:最小可用版(MVP)— Web 端

## 背景与目标

TokenLens 是面向 AI 开发团队的 Credits 用量看板工具,目标是把分散在控制台、Agent 观测及本地日志中的 Credits 用量聚合为统一实时看板。

**演进入口**:先开发 **Web 端**,后期再封装成 **Desktop 端**(Tauri)。Web 端通过「前端 + 本地后端服务」架构获取真实数据。

**调研结论(2026-08-07):**
1. 通义千问 Token Plan 团队版**无公开 HTTP REST 用量查询 API**,用量仅能通过 Web 控制台查看。
2. 官方提供 **CLI `@qianwenai/qianwen-cli`**(Node 18+,npm 全局安装),内置用量 / 账单 / 订阅命令,认证基于 **OAuth 登录**(PKCE / Device Flow)。可程序化查询 Token Plan 真实 Credits 数据。

**MVP 目标**:Web 前端展示团队/成员/模型的 Credits 用量看板。浏览器 → 本地 Node 后端服务 → 调用官方 CLI 拿真实数据;CLI 不可用 / 认证失败时降级到 MockProvider。后期用 Tauri 将「前端构建产物 + 后端」封装成跨平台桌面应用。

## 架构总览

```
浏览器 (React 前端)
   │  HTTP (localhost, 轮询)
   ▼
本地 Node 后端服务 (Express)
   │  UsageProvider 抽象层
   ├── QianwenCliProvider ──调用──► qianwen CLI (官方, OAuth 已登录)
   └── MockProvider (降级/演示)
```

- **前端**:纯浏览器应用,只负责渲染看板 + 轮询后端 API。
- **后端**:本地 Node 服务(localhost),持有数据层抽象,调用 CLI。
- **Desktop 后期**:Tauri 打包前端 build 产物 + 内嵌/随附后端,复用同一套代码。

## 技术栈

| 层 | 选型 |
| -- | ---- |
| 前端框架 | React 18 + Vite + TypeScript |
| 图表 | ECharts |
| 状态管理 | Zustand |
| 前端数据获取 | 轮询后端 REST API |
| 后端 | Node.js + Express(TypeScript) |
| 数据源 | 官方 CLI `@qianwenai/qianwen-cli` + MockProvider 降级 |
| 本地配置 | 后端本地 JSON 文件(纯本地) |

## 目录结构

```
TokenLens/
├── frontend/                # React 前端
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/      # 看板组件
│   │   │   ├── OverviewCards/  # 顶部概览卡
│   │   │   ├── TrendChart/     # 趋势折线图
│   │   │   ├── MemberTable/    # 成员消耗表
│   │   │   ├── ModelList/      # 模型消耗
│   │   │   └── StatusBar/      # 刷新状态 + 数据源指示
│   │   ├── hooks/
│   │   │   └── useUsage.ts     # 轮询 hook
│   │   ├── stores/
│   │   │   └── usageStore.ts   # Zustand store
│   │   └── types/
│   │       └── index.ts        # 数据类型
│   ├── vite.config.ts
│   └── package.json
├── backend/                 # Node 后端服务
│   ├── src/
│   │   ├── server.ts        # Express 入口
│   │   ├── providers/
│   │   │   ├── index.ts      # UsageProvider 接口 + ProviderError
│   │   │   ├── mock.ts       # MockProvider(降级/演示)
│   │   │   └── qianwen-cli.ts # QianwenCliProvider(官方 CLI,主数据源)
│   │   ├── routes/
│   │   │   └── usage.ts      # /api/usage 路由
│   │   └── models.ts         # 数据模型
│   ├── package.json
│   └── tsconfig.json
└── ...
```

## 数据模型

前后端共享(前端 TS interface / 后端 TS interface,字段一致):

- `TeamUsage`:团队总 Credits 消耗、剩余额度、已用占比、今日消耗、generation(自增序号)
- `MemberUsage`:成员名、消耗 Credits、会话数、占比
- `ModelUsage`:模型名、消耗 Credits、占比
- `TrendPoint`:时间戳(ISO 字符串)、消耗 Credits 值

> 注:阈值预警留待后续版本,故第一版不定义 `Alert` 模型。

## 数据层抽象(后端 Node)

核心是 `UsageProvider` 接口,第一版实现两个 provider:

```ts
export interface UsageProvider {
  teamUsage(): Promise<TeamUsage>;
  members(): Promise<MemberUsage[]>;
  models(): Promise<ModelUsage[]>;
  trend(hours: number): Promise<TrendPoint[]>;
}
```

### QianwenCliProvider(第一版主数据源)
- 在 Node 后端通过 `child_process.execFile` 调用 `qianwen` CLI,一律追加 `--format json`。
- **认证**:依赖 CLI 内置 OAuth 登录(`qianwen auth login`,PKCE / Device Flow)。登录态由 CLI 保存。检测到退出码 2(认证失败)时,接口返回认证错误,前端提示引导登录。
- **命令映射**:
  - `qianwen usage summary --format json` → `TeamUsage`(`token_plan.totalCredits / remainingCredits / usedPct`)
  - `qianwen usage breakdown --days 7 --format json` → `ModelUsage` + `TrendPoint`
  - `qianwen subscription tokenplan seats --format json` → `MemberUsage`(席位/成员维度)
- **解析**:解析 CLI JSON 输出(hardcode 字段映射)。
- 退出码规范:0 成功 / 2 认证失败 / 5 限流 / 6 服务端错误 / 7 资源未找到 → 映射为清晰 `ProviderError`。

### MockProvider(降级/演示)
- 确定性伪随机生成平滑波动、逐步消耗的用量数据,模拟"实时"。
- 用于:CLI 未安装、认证未完成、或显式选择演示模式。

### Provider 选择策略
- 默认优先 `QianwenCliProvider`;启动时探测 CLI 是否可用。
- CLI 不可用 / 认证失败时,自动降级到 `MockProvider`,并在前端状态栏标注当前数据源。

## 看板 UI(单页,四个区块)

1. **顶部概览卡**:团队总 Credits 消耗、剩余额度、已用占比(进度条)、今日消耗。
2. **趋势图**:近 24 小时消耗折线图(ECharts)。
3. **成员消耗表**:按成员列出消耗与占比。
4. **模型消耗列表**:按模型(千问 / DeepSeek / Kimi)列出消耗。

顶部 **刷新状态指示**:上次成功更新时间、当前数据源(CLI / Mock)、轮询状态。

## 实时刷新

- **CLI 数据源**:CLI 查询是快照,后端缓存结果,轮询间隔 **5 分钟**,避免频繁进程调用。
- **Mock 数据源**:间隔 **5 秒**,用于演示实时刷新效果。
- 前端按 `generation` 序号比对,数据未变化时跳过重渲染。

## 错误处理

- 前端轮询失败:显示"数据加载失败 + 重试",保留上次成功数据,不闪断。
- 后端 provider 错误:映射为清晰用户提示;认证失败时提示执行 `qianwen auth login`。

## 测试

- **后端单元测试**(Vitest):`MockProvider` 数据生成正确性;CLI JSON 解析函数(用 fixture 数据);`ProviderError` 映射;generation 单调递增。
- **后端集成测试**(可选,需本机已登录):真实 CLI 解析路径。
- **前端**:保证可运行,组件测试列为可选项。

## 环境准备(实施第一步)

- 安装 Node 18+(本机已有 v24)。
- `npm install -g @qianwenai/qianwen-cli`。
- 初始化前后端两个 Vite / Express + TS 脚手架。
- 可选:`qianwen auth login` 完成 OAuth(用于验证真实数据链路)。

## 清晰范围(第一版不做)

- **Web 端**:不做直接 HTTP REST API 对接(官方无公开 REST 用量接口)、多源聚合、阈值告警、趋势预测、缓存命中率、数据导出。
- **Desktop 封装**:属于**下一里程碑**,本期仅确保前端 + 后端架构便于后期用 Tauri 打包(前后端分离、纯静态前端、后端可独立启动)。