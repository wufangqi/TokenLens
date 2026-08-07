# TokenLens

> **English** | [简体中文](README.md)

> A cross-platform desktop client for AI development teams — unify Credits consumption, optimize model invocation costs, and prevent quota overruns.

TokenLens is a lightweight, privacy-first desktop application (macOS / Windows / Linux) built on Tauri. It deeply integrates with the **Alibaba Cloud Token Plan Team Edition API** to aggregate usage data scattered across consoles, Agent observability systems, and local logs into a unified real-time dashboard — giving teams precise visibility into Credits consumption at the member, model, and session level.

## ✨ Key Features

- **Multi-Source Data Aggregation** — Seamlessly integrates Alibaba Cloud Token Plan Team Edition analytics, ECS Agent observability metrics, and local AI coding assistant session logs, enabling cross-validation and holistic visibility across cloud and offline data sources.

- **Unified Credits Metering** — Natively adapts to the Alibaba Cloud Credits system, automatically normalizing consumption units across diverse models (Qwen, DeepSeek, Kimi, etc.) and enabling granular cost breakdowns by team member, model, and session.

- **Real-Time Alerts & Insights** — Built-in dual monitoring for seat-based quotas and shared usage packages, featuring threshold alerts, consumption trend forecasting, and cache hit-rate analysis to ensure every dollar of budget is spent efficiently.

- **Lightweight Cross-Platform Experience** — Built on Tauri, with an installer size under 10MB and minimal memory footprint. Supports system tray residency, floating widget quick-view, and structured data export (CSV / JSON / Markdown), balancing daily monitoring with financial reconciliation needs.

- **Open Source & Privacy First** — TokenLens adopts a fully local data processing architecture; API keys and log files are stored exclusively on user devices and never transit through third-party servers. Fully open source — community contributions and customizations are welcome.

## 🎯 Use Cases

- **AI Team Leads** — Monitor overall team usage health in real time and allocate shared resource packages rationally.
- **Developers & Engineers** — Track personal coding assistant consumption, identify high-cost sessions, and refine prompt strategies.
- **Ops & Finance Teams** — Auto-generate multi-dimensional usage reports to streamline billing reconciliation and budget planning for Token Plan Team Edition.

## 🚀 Getting Started

> 🚧 *Project under active development. Installation and build instructions will be filled in as the codebase lands.*

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://www.rust-lang.org/) toolchain
- [Tauri v2](https://tauri.app/)

### Installation

```bash
# clone the repository
git clone https://github.com/wfqdreamcity/TokenLens.git
cd TokenLens

# install frontend dependencies
npm install

# run in development mode
npm run tauri dev

# build a production release
npm run tauri build
```

## 🗂️ Project Structure

> *Structure will be documented as the scaffold matures.*

```
TokenLens/
├── src/          # Frontend (Tauri webview)
├── src-tauri/    # Rust backend & native shell
└── ...
```

## 🔌 Data Sources

| Source | Purpose | Supported Platform |
| ------ | ------- | ------------------ |
| Alibaba Cloud Token Plan Team Edition | Credits usage & quota analytics | [Qwen Token Plan](https://www.qianwenai.com/benefits/tokenplan) |
| ECS Agent observability | Runtime metrics & health signals | [Qwen Token Plan](https://www.qianwenai.com/benefits/tokenplan) |
| Local AI coding assistant logs | Session-level consumption tracking | [Qwen Token Plan](https://www.qianwenai.com/benefits/tokenplan) |

## 📦 Export Formats

- CSV
- JSON
- Markdown

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome. Please open an [issue](https://github.com/wfqdreamcity/TokenLens/issues) or submit a pull request.

## 🔒 Privacy

All data processing happens locally. API keys and log files are stored only on your device and are never transmitted to third-party servers.

## 📄 License

[MIT](LICENSE)

---

*TokenLens is an independent open-source project and is not affiliated with or endorsed by Alibaba Cloud.*