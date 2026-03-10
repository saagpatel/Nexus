# Nexus

Nexus is a desktop API client for people who want more than a plain request form.
It combines fast HTTP testing, GraphQL workflows, WebSocket inspection, local mocking, response assertions, and collection execution in a single Electron app built for real development loops.

![License](https://img.shields.io/badge/license-MIT-blue)
![Desktop](https://img.shields.io/badge/desktop-Electron%20%2B%20Vue-2d6cdf)
![Status](https://img.shields.io/badge/status-active%20local%20desktop%20app-1f9d55)
![Release](https://img.shields.io/badge/release%20target-macOS%20first-lightgrey)

## Why Nexus

Most API tools are great at sending a request, but they get awkward when your workflow crosses protocol boundaries or when you want to validate behavior instead of just eyeballing a response.

Nexus is designed for that next layer of work:

- Build and replay HTTP requests quickly
- Run GraphQL queries with variables and operation names
- Open WebSocket sessions and inspect live message timelines
- Spin up a local mock server and watch captured traffic
- Assert on responses instead of checking them manually
- Run collections sequentially with basic chaining between steps
- Generate cURL, `fetch`, and Axios snippets from the current request

It is especially useful for developers who want one desktop workspace for exploring, testing, iterating, and documenting API behavior.

## Current Stage

Nexus is no longer just an early prototype. The project now has:

- a working desktop app with the core HTTP, GraphQL, WebSocket, mock-server, assertions, and collection-runner flows in place
- local persistence through SQLite for workspaces, collections, requests, environments, and history
- runtime-hardened IPC boundaries and Electron safety controls for the trusted app surface
- automated verification across typecheck, unit/component tests, Electron smoke coverage, and packaging/release dry-runs
- a macOS-first release path validated through dry-run packaging and release evidence generation

Current release note:

- local and dry-run release readiness are in strong shape
- Apple signing and notarization are intentionally deferred for later credential setup
- team collaboration and cloud sync remain intentionally out of scope for the current release target

## What You Can Do Today

### Core request work

- Send `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS` requests
- Edit headers, query parameters, and request bodies with Monaco-powered editing
- Use JSON, plain text, form-urlencoded, and GraphQL request bodies
- Authenticate with Basic auth or Bearer tokens
- Inspect formatted responses, headers, and timing data

### Advanced API workflows

- Build GraphQL requests with query, variables, and operation name support
- Connect to WebSocket endpoints, send messages, and inspect a live event timeline
- Start a local mock server, define routes, and review captured mock traffic
- Create response assertions for status, headers, and body content
- Run collections sequentially with stop-on-failure behavior
- Reuse basic `last_*` values between collection-runner steps
- Generate cURL, `fetch`, and Axios code snippets from the active request

### Project organization

- Save requests into hierarchical collections
- Manage multiple environments with `{{variable}}` substitution
- Mark sensitive environment values as secrets in the UI
- Track request history and replay previous requests quickly
- Import Postman Collection v2.1 JSON files
- Discover OpenAPI and Swagger endpoints from common spec locations

## Why Someone Should Try It

Nexus is appealing if you want an API client that feels closer to a real desktop workbench than a simple tabbed request tool.

It is a strong fit if you want:

- one app for HTTP plus adjacent protocol workflows
- a local-first tool with no cloud account requirement
- a persistent request workspace instead of disposable tabs
- built-in validation and runner behavior without jumping into code first
- a modern Electron/Vue codebase that is already well past the sketch stage

## Quick Start

### Prerequisites

- Node.js 18+
- `pnpm`
- Git

### Install and run

```bash
git clone https://github.com/saagar210/Nexus.git
cd Nexus
pnpm install
pnpm start
```

### Useful commands

```bash
# Standard development mode
pnpm start

# Low-disk development mode with ephemeral Vite cache
pnpm lean:start

# Type safety
pnpm typecheck

# Unit and component tests
pnpm test

# Electron desktop smoke test
pnpm test:e2e:smoke

# Package the app locally
pnpm package

# Full macOS release dry-run without signing/notarization
pnpm release:mac:dry-run
```

## Verification Snapshot

Current verification coverage includes:

- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e:smoke`
- `.codex/scripts/run_verify_commands.sh`
- `pnpm package`
- `pnpm release:mac:dry-run`

Recent local verification evidence from the implementation pass:

- 124 automated tests passing
- desktop smoke path passing
- package flow passing
- macOS dry-run release path producing manifest, checksums, and go/no-go evidence

## Security and Architecture Notes

Nexus uses a typed IPC contract between the Electron renderer and main process, and the boundary is not trusted blindly.

Current protections include:

- runtime IPC payload validation for privileged main-process handlers
- preload event subscription allowlisting
- trusted renderer origin checks
- navigation and popup denial outside the intended app surface
- renderer sandbox enablement and tighter Electron surface controls

Local secrets are resolved in the main process so environment variables and sensitive request material do not need to be handled directly inside renderer UI logic.

## Stack

- Electron 40
- Vue 3
- TypeScript
- Pinia
- Tailwind CSS 4
- Monaco Editor
- SQLite via `better-sqlite3`
- `undici` for HTTP execution
- `ws` for WebSocket workflows
- Vitest + Vue Test Utils + Playwright Electron smoke coverage
- Electron Forge + Vite

## Project Layout

```text
Nexus/
├── electron/                  # Main process, preload bridge, and desktop services
├── src/                       # Vue renderer, stores, and UI
├── shared/                    # Shared IPC contracts and types
├── tests/                     # Unit, component, shared, and Electron smoke coverage
├── docs/                      # Execution and release notes
└── scripts/                   # Build, release, perf, and repo guardrail scripts
```

## Roadmap From Here

The biggest remaining release step is operational rather than product-functional:

- Apple signing and notarization setup for a fully production-ready macOS release

Explicitly deferred for now:

- team collaboration features
- cloud sync and shared remote workspaces

## Contributing

If you want to explore the project locally, the best path is:

1. install dependencies with `pnpm install`
2. run the app with `pnpm start`
3. validate changes with `bash .codex/scripts/run_verify_commands.sh`

The repository also includes branch, commit, secret-scan, and performance guardrails to keep changes disciplined as the app moves toward a fuller release.

## License

MIT
