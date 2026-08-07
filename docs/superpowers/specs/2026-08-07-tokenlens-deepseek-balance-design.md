# TokenLens DeepSeek 余额数据源 MVP

- 日期: 2026-08-07
- 状态: 已获用户批准
- 范围: 第二数据源切换；DeepSeek 仅余额；不改千问 CLI 主链路语义

## 背景

用户需要在 TokenLens 中查看 DeepSeek 官方平台用量。调研结论：

- 官方可编程接口仅有 `GET https://api.deepseek.com/user/balance`（Bearer API Key）
- **无** Bearer 认证的按模型用量 / 趋势 API
- 控制台月度 CSV 与 Cookie 接口不在本 MVP 范围

因此本版只做「余额 KPI + 数据源切换」。

## 目标

1. 前端可在 **千问** 与 **DeepSeek** 之间切换数据源
2. DeepSeek 展示账户可用余额（及 granted / topped-up 细分）
3. API Key 仅存本地环境变量，不进仓库、不上传第三方

## 非目标

- CSV 导入、Cookie 抓取 platform.deepseek.com
- 两家数据合并到同一套数字
- DeepSeek 模型表 / 趋势（官方 API 暂不提供则显示空态）
- 密钥管理 UI（本版用环境变量即可）

## 架构

```
浏览器
  │  GET /api/usage?source=qianwen|deepseek
  ▼
Express
  ├── source=qianwen → QianwenCliProvider | MockProvider（现有探测逻辑）
  └── source=deepseek → DeepSeekProvider（余额）
```

启动时仍按现有逻辑准备千问侧默认 provider；DeepSeek provider 按请求惰性使用（需 `DEEPSEEK_API_KEY`）。

## API

### `GET /api/usage?source=`

| `source` | 行为 |
| --- | --- |
| 缺省 / `qianwen` | 现有千问/Mock 行为，`source` 字段为 `cli` 或 `mock` |
| `deepseek` | 调用 DeepSeek 余额接口，`source` 字段为 `deepseek` |

错误：

| 情况 | HTTP | `kind` |
| --- | --- | --- |
| 未设置 `DEEPSEEK_API_KEY` | 401 | `auth` |
| DeepSeek 401/403 | 401 | `auth` |
| 网络/5xx/解析失败 | 502 | `server` / `parse` |

不因 DeepSeek 失败而降级到 Mock。

### 余额响应映射

DeepSeek 响应示例字段：`is_available`、`balance_infos[].{currency,total_balance,granted_balance,topped_up_balance}`。

映射到现有 `TeamUsage`：

| 字段 | 来源 |
| --- | --- |
| `balanceAmount` | 优先 CNY 的 `total_balance`，否则第一条 |
| `currency` | 对应 currency |
| `billAmount` | 不设置 / `undefined` |
| `totalCredits` / `remainingCredits` / `usedPct` / `todayCredits` | `0` |
| `generation` | provider 内自增 |

可选扩展（前后端一致，便于 KPI 细分）：

```ts
grantedBalance?: number;
toppedUpBalance?: number;
```

`members` / `models` / `trend` / `consumption` → 空数组。

## DeepSeekProvider

- 文件：`backend/src/providers/deepseek.ts`
- `readonly name = 'deepseek'`
- `UsageProvider.name` 联合类型扩展为 `'cli' | 'mock' | 'deepseek'`
- 使用 Node 内置 `fetch`；超时建议 15s
- Base URL：`https://api.deepseek.com`（可用 `DEEPSEEK_API_BASE` 覆盖，便于测试）

## 前端

- `DataSource` 扩展含 `deepseek`；请求查询参数用产品语义：`qianwen` | `deepseek`
- 顶栏增加切换控件：`千问` | `DeepSeek`
- `useUsage` 依赖当前选中 source，切换后立即请求并按间隔轮询
- DeepSeek 视图：
  - KPI：突出「可用余额」；若有 granted/topped-up 可作次要说明或额外小卡
  - 「当月账单」「模型用量」在 DeepSeek 下隐藏或显示「—」
  - 趋势与模型表：空态文案「DeepSeek 官方 API 暂不提供按模型用量」
- 状态标签：`DeepSeek`

## 配置

```bash
# backend 进程环境
export DEEPSEEK_API_KEY=sk-...
```

- `.env` 已在 `.gitignore`；可提供 `backend/.env.example` 仅含键名占位
- README 简短补充：如何设置 Key 与切换数据源

## 测试

- Vitest：解析 `balance_infos` 映射（纯函数或 provider 注入 mock fetch）
- 路由：`source=deepseek` 且无 Key → 401；有 mock provider → 200 且 `source=deepseek`
- 前端：手动切换验收即可（无强制组件测试）

## 验收标准

1. 未配置 Key 时切到 DeepSeek 显示明确认证错误，千问侧不受影响
2. 配置有效 Key 后 DeepSeek 显示余额与货币
3. 切换回千问仍为 CLI/Mock 原有看板
4. DeepSeek 下无伪造的模型/趋势数据
5. 仓库中无真实 API Key

## 清晰后续（非本版）

- 月度 CSV 本地解析补模型/趋势
- 密钥本地加密存储与设置页
