# TokenLens Dashboard UI Light Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有用量看板换成浅色工具台视觉，去掉重复模型列表，金额全 0 时隐藏金额列并加脚注。

**Architecture:** 仅改 `frontend/` 展示层。CSS 变量驱动配色；`App.tsx` 去掉 `ModelList`；`ConsumptionTable` 增加条件列与进度条；ECharts 配色对齐钢蓝强调色。不改后端与轮询。

**Tech Stack:** React 19, Vite, Zustand, ECharts, Google Fonts (IBM Plex Sans / JetBrains Mono)

**Design spec:** `docs/superpowers/specs/2026-08-07-tokenlens-dashboard-ui-design.md`

---

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `frontend/index.html` | 标题 + 字体 link |
| `frontend/src/index.css` | 全局 token / 基础排版 |
| `frontend/src/App.css` | 看板布局与组件样式 |
| `frontend/src/App.tsx` | 组装；去掉 ModelList；趋势标题 |
| `frontend/src/components/StatusBar.tsx` | 数据源标签 |
| `frontend/src/components/OverviewCards.tsx` | KPI 三卡（样式类名对齐） |
| `frontend/src/components/TrendChart.tsx` | 浅色图表主题 |
| `frontend/src/components/ConsumptionTable.tsx` | 单表明细 + 进度条 + 条件金额列 |
| `frontend/src/components/ModelList.tsx` | 删除（不再引用） |

---

### Task 1: 字体与全局 token

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`

- [x] **Step 1: 更新 index.html**

将 `<title>` 改为 `TokenLens`，`lang="zh-CN"`，在 `<head>` 加入：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

- [x] **Step 2: 重写 index.css 变量**

按 design spec 设置 `--bg #F4F5F7`、`--surface #FFFFFF`、`--text`、`--text-h`、`--border`、`--accent #2F5BFF`、`--accent-soft`、`--sans` / `--mono`。去掉紫色与 `color-scheme: light dark` 强制跟随的紫暗色覆盖（可保留极简 dark 媒体查询用中性灰，或不做 dark）。页面 `background: var(--bg)`，`#root` 最小高度 100svh。

- [x] **Step 3: 提交**

```bash
git add frontend/index.html frontend/src/index.css
git commit -m "style(frontend): set light toolbench tokens and fonts"
```

---

### Task 2: App 布局与去掉重复列表

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.css`
- Delete: `frontend/src/components/ModelList.tsx`

- [x] **Step 1: 更新 App.tsx**

移除 `ModelList` import 与渲染。结构：

```tsx
<div className="app">
  <header>...</header>
  <OverviewCards />
  <section className="panel trend">
    <h2 className="panel-title">近 7 日用量</h2>
    <TrendChart />
  </section>
  <section className="panel">
    <h2 className="panel-title">模型用量</h2>
    <ConsumptionTable />
  </section>
</div>
```

- [x] **Step 2: 重写 App.css**

实现顶栏、KPI grid、panel、table、statusbar 标签样式（见 design spec）。移动端 `.overview` / panel 单列。删除旧的 `.grid` 双列表局。

- [x] **Step 3: 删除 ModelList.tsx**

- [x] **Step 4: 提交**

```bash
git add frontend/src/App.tsx frontend/src/App.css
git add -u frontend/src/components/ModelList.tsx
git commit -m "feat(frontend): restyle layout and drop duplicate model list"
```

---

### Task 3: 状态栏、KPI、趋势图、消费表

**Files:**
- Modify: `frontend/src/components/StatusBar.tsx`
- Modify: `frontend/src/components/OverviewCards.tsx`
- Modify: `frontend/src/components/TrendChart.tsx`
- Modify: `frontend/src/components/ConsumptionTable.tsx`

- [x] **Step 1: StatusBar**

数据源用 `<span className="tag">CLI</span>` / `Mock`；错误用 `tag-error`。

- [x] **Step 2: OverviewCards**

卡片 class 用 `kpi-card`；数值 class `kpi-value`（mono）。逻辑不变。

- [x] **Step 3: TrendChart**

ECharts：`color: ['#2F5BFF']`，网格线浅灰，tooltip 白底，areaStyle `rgba(47,91,255,0.12)`，smooth line。resize 监听可选。

- [x] **Step 4: ConsumptionTable**

- 按 `credits` 降序
- `showCost = rows.some(r => r.cost > 0)`
- 列：模型 | 用量 | [金额?] | 占比（`xx%` + `.bar > .fill` width=pct）
- 全 0 时脚注：`套餐抵扣，按量金额为 0`
- 空数据：`暂无模型用量`

- [x] **Step 5: 浏览器目视验收**

`frontend` `npm run dev`，确认：浅灰底、无紫、无右侧列表、金额列隐藏+脚注、KPI/趋势可读。

- [x] **Step 6: 提交**

```bash
git add frontend/src/components/
git commit -m "feat(frontend): polish status, KPI, chart, and model table"
```

---

## 验收对照

- [x] 浅色工具台、钢蓝强调、无紫
- [x] 仅一处模型表
- [x] cost 全 0 无金额列 + 有脚注
- [x] 窄屏单列可读
- [x] 状态栏 CLI/Mock + 更新时间
