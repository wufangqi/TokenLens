# TokenLens Cursor Session 用量数据源 MVP

- 日期: 2026-08-07
- 状态: 已获用户批准并实现
- 范围: 第四数据源；个人 Plan 已用/剩余/限额（USD）；模型表与趋势暂空态

## 背景

个人 Cursor 用量无稳定公开 Enterprise Admin API。社区与 Raycast 扩展普遍使用未文档化的 dashboard Session API：

- `GET /api/usage-summary`（Cookie `WorkosCursorSessionToken`）
- 金额单位为美分

本 MVP 仅接入 usage-summary KPI，不拉模型聚合事件。

## 目标

1. 前端可切换到 **Cursor**
2. KPI：已用 / 剩余 / 限额（美分 ÷ 100 → USD）
3. Session Token 仅存 `backend/.env`，不进仓库

## 非目标

- Enterprise Admin API / Team 账单
- `get-aggregated-usage-events` 模型拆分（后续可选）
- Token 自动刷新 / 密钥管理 UI

## 配置

```bash
# backend/.env
CURSOR_SESSION_TOKEN=   # 浏览器 Cookie WorkosCursorSessionToken
# CURSOR_API_BASE=https://cursor.com
```

获取方式：登录 cursor.com → DevTools → Application → Cookies → 复制 `WorkosCursorSessionToken`。

## 风险

Session 会过期；API 未文档化可能变更。401 时需用户重新登录并更新 Token。
