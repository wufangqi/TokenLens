# TokenLens v0.1 设计文档

- 日期:2026-08-07
- 状态:已获用户批准(v1 修订,纳入官方 CLI 数据源)
- 范围:最小可用版(MVP)

## 背景与目标

TokenLens 是一款面向 AI 开发团队的跨平台桌面客户端(macOS / Windows / Linux),目标是把分散在控制台、Agent 观测及本地日志中的 Credits 用量聚合为统一实时看板。

**调研结论(2026-08-07,两轮):**
1. 通义千问 Token Plan 团队版**没有公开的 HTTP REST 用量查询 API**,所有用量仅能通过 Web 控制台查看。
2. 但官方提供 **CLI 工具 `@qianwenai/qianwen-cli`**(Node 18+,npm 全局安装),内置一整套**用量 / 账单 / 订阅命令**,认证基于 **OAuth 登录**(PKCE / Device Flow)。可程序化查询 Token Plan 的真实 Credits 数据。

**MVP 目标**:运行一个 Tauri v2 桌面应用,通过官方 CLI 获取并展示团队/成员/模型的 Credits 用量看板;未安装 CLI 或认证失败时降级到 MockProvider(模拟数据)保证可运行。本地存储配置,窗口常驻。

## 技术栈

| 层 | 选型 |
| -- | ---- |
| 桌面外壳 | Tauri v2(Rust) |
| 前端框架 | React 18 + Vite + TypeScript |
| 图表 | ECharts |
| 状态管理 | Zustand |
| 数据获取 | 前端向 Tauri command 轮询 |
| 数据源 | 官方 CLI `@qianwenai/qianwen-cli` + MockProvider 降级 |
| 本地配置 | tauri-plugin-store(纯本地) |

## 目录结构

```
TokenLens/
├── src/                    # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/         # 看板组件
│   │   ├── OverviewCards/  # 顶部概览卡
│   │   ├── TrendChart/     # 趋势折线图
│   │   ├── MemberTable/    # 成员消耗表
│   │   ├── ModelList/      # 模型消耗
│   │   └── StatusBar/      # 刷新状态指示
│   ├── hooks/
│   │   └── useUsage.ts     # 轮询 hook
│   ├── stores/
│   │   └── usageStore.ts   # Zustand store
│   └── types/
│       └── index.ts        # 与后端共享的数据类型
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── main.rs         # Tauri 入口
│   │   ├── lib.rs
│   │   ├── providers/
│   │   │   ├── mod.rs      # UsageProvider trait + ProviderError
│   │   │   ├── mock.rs     # MockProvider(降级/演示)
│   │   │   └── qianwen_cli.rs # QianwenCliProvider(官方 CLI,第一版主数据源)
│   │   ├── commands.rs     # Tauri commands
│   │   └── models.rs       # 数据模型
│   ├── Cargo.toml
│   └── tauri.conf.json
└── ...
```

## 数据模型

前后端共享(前端 TS interface / 后端 Rust struct,字段一一对应):

- `TeamUsage`:团队总 Credits 消耗、剩余额度、已用占比、今日消耗、generation(自增序号)
- `MemberUsage`:成员名、消耗 Credits、会话数、占比
- `ModelUsage`:模型名、消耗 Credits、占比
- `TrendPoint`:时间戳(ISO 字符串)、消耗 Credits 值

> 注:阈值预警留待后续版本,故第一版不定义 `Alert` 模型。

## 数据层抽象(Rust)

核心是 `UsageProvider` trait,第一版实现两个 provider:

```rust
#[async_trait]
pub trait UsageProvider: Send + Sync {
    async fn team_usage(&self) -> Result<TeamUsage, ProviderError>;
    async fn members(&self) -> Result<Vec<MemberUsage>, ProviderError>;
    async fn models(&self) -> Result<Vec<ModelUsage>, ProviderError>;
    async fn trend(&self, hours: u32) -> Result<Vec<TrendPoint>, ProviderError>;
}
```

### QianwenCliProvider(第一版主数据源)
- 在 Rust 侧通过 `std::process::Command` 调用 `qianwen` CLI,一律追加 `--format json`。
- **认证**:依赖 CLI 内置 OAuth 登录(`qianwen auth login`,PKCE / Device Flow)。登录态由 CLI 保存(优先系统钥匙串)。应用检测到退出码 2(认证失败)时,向前端提示引导用户执行登录。
- **命令映射**:
  - `qianwen usage summary --format json` → `TeamUsage`(`token_plan.totalCredits / remainingCredits / usedPct`)
  - `qianwen usage breakdown --days 7 --format json` → `ModelUsage` + `TrendPoint`
  - `qianwen subscription tokenplan seats --format json` → `MemberUsage`(席位/成员维度)
- **解析**:解析 CLI 的 JSON 输出(hardcode 字段映射)。
- 退出码规范:0 成功 / 2 认证失败 / 5 限流 / 6 服务端错误 / 7 资源未找到 → 映射为清晰的 `ProviderError`。

### MockProvider(降级/演示)
- 确定性伪随机生成平滑波动、逐步消耗的用量数据,模拟"实时"。
- 用于:CLI 未安装、认证未完成、或用户显式选择演示模式。

### Provider 选择策略
- 默认优先 `QianwenCliProvider`;初始化时探测 CLI 是否可用。
- CLI 不可用 / 认证失败时,自动降级到 `MockProvider`,并在 UI 状态栏标注当前数据来源。

## 看板 UI(单窗口,四个区块)

1. **顶部概览卡**:团队总 Credits 消耗、剩余额度、已用占比(进度条)、今日消耗。
2. **趋势图**:近 24 小时消耗折线图(ECharts)。
3. **成员消耗表**:按成员列出消耗与占比。
4. **模型消耗列表**:按模型(千问 / DeepSeek / Kimi)列出消耗。

顶部 **刷新状态指示**:上次成功更新时间、当前数据源(CLI / Mock)、轮询状态。

## 实时刷新

- **CLI 数据源**:CLI 查询是快照,轮询间隔设为 **5 分钟**,避免频繁进程调用。
- **Mock 数据源**:轮询间隔 **5 秒**,用于演示实时刷新效果。
- 前端按后端返回的 `generation` 序号比对,数据未变化时跳过重渲染。
- 第一版仅窗口常驻,最小化到托盘 / 悬浮窗留待后续版本。

## 错误处理

- 前端轮询失败:显示"数据加载失败 + 重试",保留上次成功数据,不闪断。
- 后端 provider 错误:映射为清晰用户提示;认证失败时提示执行 `qianwen auth login`。

## 测试

- **Rust 单元测试**:`MockProvider` 数据生成正确性;CLI JSON 解析函数(用 fixture 数据);`ProviderError` 映射;generation 单调递增。
- **CLI 集成测试**(可选,需本机已登录):调用真实 `qianwen` 的解析路径。
- 前端:第一版保证可运行,组件测试(Vitest + Testing Library)列为可选项。

## 环境准备(实施第一步)

- 通过 rustup 安装 Rust 工具链(用户已同意)。
- 安装 Linux 系统依赖(webkit2gtk、libappindicator 等)。
- 安装 Node 18+(本机已有 v24)+ `npm install -g @qianwenai/qianwen-cli`。
- 初始化 Tauri v2 + React + Vite 脚手架。
- 可选:执行 `qianwen auth login` 完成 OAuth(用于验证真实数据链路)。

## 明确不做(第一版范围外)

- 直接 HTTP REST API 对接(官方未提供公开 REST 用量接口)
- 多源聚合(ECS Agent / 本地日志)
- 系统托盘常驻、悬浮窗
- 阈值告警、消耗趋势预测、缓存命中率分析
- 数据导出(CSV / JSON / Markdown)
- 自实现 OAuth(复用 CLI 内置 OAuth 登录)