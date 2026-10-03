# Contributing

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, etc.
5. Push and open a pull request

## Verification

Run from the repository root with the Node 22.22.2+ within 22.x and pnpm 10.28.1 (CI selects Node 22) in
`.github/workflows/quality-gates.yml`. The locked jsdom 30.0.1 requires this
Node 22 minimum; older Node 22 releases are unsupported. In an isolated checkout,
start with:

```bash
corepack pnpm@10.28.1 install --frozen-lockfile --ignore-scripts
corepack pnpm@10.28.1 exec vitest run tests/unit/utils/codegen.test.ts  # synthetic string fixtures
corepack pnpm@10.28.1 typecheck
corepack pnpm@10.28.1 test                         # broader unit suite
corepack pnpm@10.28.1 build:desktop                # compile main/preload/renderer
```

Use the pinned Corepack invocation when a different global pnpm is installed.
The focused codegen test generates strings; it does not send its example URLs or
access an application database. Broader unit tests may bind local fixture ports.
There is no `lint` script; `make lint` is only a message. Do not claim lint passed.
The repository-wide contributor lane is defined by `.codex/verify.commands` and
run by `bash .codex/scripts/run_verify_commands.sh` on a non-main
`codex/<type>/<slug>` branch. It includes Git guards, Electron smoke and perf
checks, so it requires the desktop prerequisites and isolation described below.

For UI or desktop protocol changes, the existing `pnpm test:e2e:smoke` rebuilds
`better-sqlite3` for Electron, compiles the desktop sources, opens an Electron
window, starts a local mock server and sends fixture localhost traffic. It
requires normal dependency build scripts (Electron binary/native rebuild), the
platform compiler toolchain, and a display; Linux CI uses `xvfb-run`.
`--ignore-scripts` installation alone is not enough for this lane.

Run desktop launch/smoke only in disposable CI or a dedicated OS user. The smoke
sets `NODE_ENV=test`, but `electron/main/database/connection.ts` still opens
`app.getPath('userData')/nexus.db`; that flag does not isolate personal app data.
An ordinary browser cannot replace Electron IPC verification. Do not run release,
packaging, signing, cleanup or provider calls to verify pure documentation changes.
If Playwright test discovery fails, retain the failure: current `playwright` and
`@playwright/test` versions differ, and a docs change does not repair that gate.

## Reporting Issues

Open a [GitHub Issue](../../issues) with a clear description and steps to reproduce.

## Code Style

Follow the existing conventions in the codebase.
