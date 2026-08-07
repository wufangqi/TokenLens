# TokenLens v0.1 设计文档

- 日期:2026-08-07
- 状态:已获用户批准
- 范围:最小可用版(MVP)

## 背景与目标

TokenLens 是一款面向 AI 开发团队的跨平台桌面客户端(macOS / Windows / Linux),目标是把分散在控制台、Agent 观测及本地日志中的 Credits 用量聚合为统一实时看板。

**调研结论(2026-08-07)**:通义千问 Token Plan 团队版目前没有公开的用量查询 API 与 OAuth 授权流程。所有用量数据仅能通过 Web 控制台查看。因此第一版采用 **mock 数据 + 抽象数据层** 策略,先把跨平台看板、架构与数据抽象层搭好,未来官方 API 开放后在 Rust 侧新增 provider 即可无缝对接,前端零改动。

**MVP 目标**:运行一个 Tauri v2 桌面应用,展示团队/成员/模型的 Credits 用量看板(数据由 MockProvider 生成模拟"实时"),本地存储配置,窗口常驻。

## 技术栈

| 层 | 选型 |
| -- | ---- |
| 桌面外壳 | Tauri v2(Rust) |
| 前端框架 | React 18 + Vite + TypeScript |
| 图表 | ECharts |
| 状态管理 | Zustand |
| 数据获取 | 前端向 Tauri command 轮询(5s) |
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
│   │   └── useUsage.ts     # 5s 轮询 hook
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
│   │   │   ├── mock.rs     # MockProvider(第一版)
│   │   │   └── qianwen.rs  # 预留:未来真实 provider
│   │   ├── commands.rs     # Tauri commands
│   │   └── models.rs       # 数据模型
│   ├── Cargo.toml
│   └── tauri.conf.json
└── ...
```

## 数据模型

前后端共享以下结构(前端以 TS interface 定义,后端以 Rust struct 定义,字段一一对应):

- `TeamUsage`:团队总 Credits 消耗、剩余额度、已用占比、今日消耗、generation(自增序号)
- `MemberUsage`:成员名、消耗 Credits、会话数、占比
- `ModelUsage`:模型名、消耗 Credits、占比
- `TrendPoint`:时间戳(ISO 字符串)、消耗 Credits 值

> 注:阈值预警留待后续版本,故第一版不定义 `Alert` 模型。

## 数据层抽象(Rust)

核心是 `UsageProvider` trait,第一版实现 `MockProvider`:

```rust
#[async_trait]
pub trait UsageProvider: Send + Sync {
    async fn team_usage(&self) -> Result<TeamUsage, ProviderError>;
    async fn members(&self) -> Result<Vec<MemberUsage>, ProviderError>;
    async fn models(&self) -> Result<Vec<ModelUsage>, ProviderError>;
    async fn trend(&self, hours: u32) -> Result<Vec<TrendPoint>, ProviderError>;
}
```

- `MockProvider`:用确定性伪随机生成器制造平滑波动、逐步消耗的用量数据,模拟"实时"效果。
- 未来新增 `QianwenProvider` 实现同一 trait,前端零改动。
- 错误统一为 `ProviderError`,含错误信息;后端映射为清晰用户提示。

## 看板 UI(单窗口,四个区块)

1. **顶部概览卡**:团队总 Credits 消耗、剩余额度、已用占比(进度条)、今日消耗。
2. **趋势图**:近 24 小时消耗折线图(ECharts)。
3. **成员消耗表**:按成员列出消耗与占比。
4. **模型消耗列表**:按模型(千问 / DeepSeek / Kimi)列出消耗。

顶部 **刷新状态指示**:上次成功更新时间、轮询中状态。

## 实时刷新

- 前端 `useUsage` hook 每 **5 秒** 调用一次后端 command 拉取数据。
- 后端返回自增 `generation` 序号;前端比对,数据未变化时跳过重渲染。
- 第一版仅窗口常驻,最小化到托盘 / 悬浮窗留待后续版本。

## 错误处理

- 前端轮询失败:显示"数据加载失败 + 重试",保留上次成功数据,不闪断。
- 后端 provider 错误:映射为清晰用户提示。

## 测试

- **Rust 单元测试**:MockProvider 数据生成正确性、命令返回结构、generation 单调递增。
- 前端:第一版保证可运行,组件测试(Vitest + Testing Library)列为可选项。

## 环境准备(实施第一步)

- 通过 rustup 安装 Rust 工具链(用户已同意)。
- 安装 Linux 系统依赖(webkit2gtk、libappindicator 等)。
- 初始化 Tauri v2 + React + Vite 脚手架。

## 明确不做(第一版范围外)

- 真实 Token Plan API 对接(待官方 API + 文档开放)
- OAuth 登录
- 多源聚合(ECS Agent / 本地日志)
- 系统托盘常驻、悬浮窗
- 阈值告警、消耗趋势预测、缓存命中率分析
- 数据导出(CSV / JSON / Markdown)