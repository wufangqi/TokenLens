# TokenLens

> **简体中文** | [English](README.en.md)

> 一款专为 AI 开发团队打造的跨平台桌面客户端——聚合 Credits 消耗、优化模型调用成本、预防额度超支。

TokenLens 是一款轻量、隐私优先的桌面应用(macOS / Windows / Linux),基于 Tauri 构建。它深度对接**阿里云 Token Plan 团队版 API**,将分散在控制台、Agent 观测及本地日志中的用量数据聚合为统一的实时可视化仪表盘,帮助团队在成员、模型、会话维度精准掌控 Credits 消耗。

## ✨ 核心特性

- **多源数据聚合** — 无缝集成阿里云 Token Plan 团队版用量分析接口、ECS Agent 观测数据及本地 AI 编程工具会话日志,实现云端与离线数据的交叉验证与全景展示。

- **Credits 统一计量** — 原生适配阿里云 Credits 体系,自动归一化不同模型(千问、DeepSeek、Kimi 等)的消耗单位,支持按成员、模型、会话维度的精细化成本拆解。

- **实时预警与洞察** — 内置坐席额度与共享用量包双重监控机制,提供阈值告警、消耗趋势预测及缓存命中率分析,让每一分预算都花在刀刃上。

- **轻量跨平台体验** — 基于 Tauri 构建,安装包体积小于 10MB,内存占用极低;支持系统托盘常驻、悬浮窗速览及结构化数据导出(CSV / JSON / Markdown),兼顾日常监控与财务核算需求。

- **开源 & 隐私优先** — TokenLens 采用纯本地数据处理架构,API Key 与日志文件仅存储于用户设备,不经过任何第三方服务器。项目完全开源,欢迎社区贡献与定制。

## 🎯 适用场景

- **AI 团队负责人** — 实时掌握团队整体用量健康度,合理分配共享资源包。
- **开发者 / 工程师** — 追踪个人编码助手消耗,识别高成本会话并优化 Prompt 策略。
- **运维 / 财务人员** — 自动生成多维度用量报表,简化 Token Plan 团队版的对账与预算规划流程。

## 🚀 快速开始

> 🚧 *项目开发中。安装与构建说明将在代码库落地后补充。*

### 环境要求

- [Node.js](https://nodejs.org/)(LTS)
- [Rust](https://www.rust-lang.org/) 工具链
- [Tauri v2](https://tauri.app/)

### 安装

```bash
# 克隆仓库
git clone https://github.com/wfqdreamcity/TokenLens.git
cd TokenLens

# 安装前端依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 🗂️ 项目结构

> *脚手架落地后补充。*

```
TokenLens/
├── src/          # 前端(Tauri webview)
├── src-tauri/    # Rust 后端与原生外壳
└── ...
```

## 🔌 数据源

| 数据源 | 用途 |
| ------ | ---- |
| 阿里云 Token Plan 团队版 | Credits 用量与额度分析 |
| ECS Agent 观测 | 运行时指标与健康信号 |
| 本地 AI 编程工具日志 | 会话级消耗追踪 |

## 📦 导出格式

- CSV
- JSON
- Markdown

## 🤝 参与贡献

欢迎提交 Issue、Bug 反馈与功能需求,可通过 [Issue](https://github.com/wfqdreamcity/TokenLens/issues) 或 Pull Request 参与贡献。

## 🔒 隐私说明

所有数据处理均在本地完成。API Key 与日志文件仅存储于您的设备,不会传输至任何第三方服务器。

## 📄 许可证

[MIT](LICENSE)

---

*TokenLens 是独立的开源项目,与阿里云无隶属关系,亦未获得阿里云背书。*