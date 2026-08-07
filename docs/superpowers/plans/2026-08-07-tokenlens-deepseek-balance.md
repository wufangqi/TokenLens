# DeepSeek Balance Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加 DeepSeek 余额数据源，支持 `?source=qianwen|deepseek` 切换；DeepSeek 仅展示余额 KPI。

**Architecture:** Express 持有千问默认 provider + DeepSeekProvider；路由按 query 选择。前端顶栏切换并带 source 轮询。

**Tech Stack:** Node fetch, Express, Vitest, React, Zustand

**Design spec:** `docs/superpowers/specs/2026-08-07-tokenlens-deepseek-balance-design.md`

---

### Task 1: Backend DeepSeekProvider + route source

**Files:**
- Modify: `backend/src/providers/index.ts`
- Modify: `backend/src/models.ts` (grantedBalance/toppedUpBalance optional)
- Create: `backend/src/providers/deepseek.ts`
- Create: `backend/src/providers/deepseek-parse.ts` (纯解析可测)
- Modify: `backend/src/routes/usage.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/.env.example`
- Test: `backend/test/providers/deepseek-parse.test.ts`, update `usage.test.ts`

- [ ] Implement parse + provider + multi-source router
- [ ] Run `npm test` in backend
- [ ] Commit backend

### Task 2: Frontend source switch

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/stores/usageStore.ts` (selectedSource)
- Modify: `frontend/src/hooks/useUsage.ts`
- Modify: `frontend/src/components/StatusBar.tsx` or new `SourceSwitch.tsx`
- Modify: `frontend/src/components/OverviewCards.tsx`
- Modify: `frontend/src/components/ConsumptionTable.tsx` / `TrendChart` empty copy
- Modify: `frontend/src/App.tsx` / `App.css`
- Modify: `README.md` short note

- [ ] Wire switch + DeepSeek empty states
- [ ] `npm run build` frontend
- [ ] Commit frontend
