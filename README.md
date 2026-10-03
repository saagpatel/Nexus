# Nexus

[![TypeScript](https://img.shields.io/badge/TypeScript-%233178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> The API workbench for what happens *after* you send the first request.

Most API clients are optimized for one request at a time. Nexus is built for the full iteration loop: explore an endpoint, assert its behavior, replay the flow, mock it locally while you shape payloads, save the sequence into a collection, and export code when you're done. All of it lives in a single local desktop workspace that persists between sessions.

## Features

- **Multi-Protocol** — HTTP, GraphQL, WebSocket, and local mock server workflows under one roof, switchable without changing tools
- **Monaco-Powered Editor** — Full-featured request/response editor with syntax highlighting, autocomplete, and variable support
- **Assertions Engine** — Write behavioral assertions on responses and run them as part of collection sequences
- **Collection Runner** — Save requests into ordered collections and execute them in sequence; results tracked per run
- **Code Export** — Turn any successful request into cURL, `fetch`, or Axios output in one click
- **Persistent Local Workspace** — SQLite-backed storage; your work survives restarts and never touches a cloud sync service

## Quick Start

### Prerequisites

- Node.js 22.22.2+ within 22.x (compatible with the locked jsdom; CI selects Node 22)
- pnpm 10.28.1 (the CI verification version)

### Installation

```bash
git clone https://github.com/saagpatel/Nexus.git
cd Nexus
corepack pnpm@10.28.1 install --frozen-lockfile
cp .env.example .env
```

### Run (development)

```bash
pnpm start
```

### Build (desktop app)

```bash
pnpm build:desktop
```

## Verification

See [contributor verification](CONTRIBUTING.md#verification) for a focused
synthetic test, broader unit/type/build commands, and the separate Electron
smoke lane. Desktop launch/smoke can open the standard application database;
use disposable CI or a dedicated OS user rather than a personal workspace.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron + Electron Forge |
| Frontend | Vue 3 + TypeScript + Vite |
| Editor | Monaco Editor |
| State | Pinia |
| Storage | SQLite (better-sqlite3) |
| HTTP | undici |
| UI components | Radix Vue |

## Architecture

Nexus is a multi-process Electron app. The main process owns the SQLite database, handles protocol connections (HTTP, WebSocket, GraphQL), and exposes an IPC surface to the renderer. The renderer runs a Vue 3 SPA with Monaco for editing and Pinia for state. The preload bridge enforces the context isolation boundary. A shared module layer keeps protocol and schema types consistent between main and renderer without duplication.

## License

MIT
