# TokenLens CodeBuddy 本地统计数据源

- 日期: 2026-08-07
- 状态: 已实现
- 范围: 第三数据源；对接本机 CodeBuddy CLI HTTP API `/api/v1/stats`

## 目标

看板可切换 **CodeBuddy**，展示本地 CLI 历史统计：总 Token、活跃天数、连续天数、模型用量与日趋势。

## 非目标

- 官网积分余额（无公开 Bearer API）
- `/profile/keys` 云端 Key 查询积分

## 接口

- Base: `CODEBUDDY_API_BASE` 默认 `http://127.0.0.1:8080`
- `GET /api/v1/stats`，Header `X-CodeBuddy-Request: 1`
- 可选 `CODEBUDDY_API_PASSWORD` → `Authorization: Bearer …`
- TokenLens: `GET /api/usage?source=codebuddy`

## 映射

见 `backend/src/providers/codebuddy-parse.ts`。
