# Nexus Phase 4 Execution Brief

## Scope Contract (Frozen)

- Complete all non-deferred README Phase 4 capabilities required for a local, production-ready desktop API client.
- Release target is macOS first.
- Team collaboration and cloud sync remain intentionally deferred and do not block v1 release.

## Execution Order

1. Stabilize build and packaging contracts.
2. Implement remaining Phase 4 product capabilities.
3. Pass quality/security/release gates.
4. Produce release evidence and complete closeout docs.

## Required Gates

- Local checks: `pnpm test`, `pnpm typecheck`, `pnpm package`.
- Verification contract: `.codex/scripts/run_verify_commands.sh`.
- Release dry run: `pnpm release:mac:dry-run`.
- Evidence artifacts: `out/release/release-manifest.json`, `out/release/checksums.txt`, `out/release/go-no-go.json`.

## Stop Conditions For Autonomous Runs

- Packaging fails after contract fixes are applied.
- High-severity security gap is discovered in IPC or process isolation.
- Release signing/notarization credentials are missing when release mode requires them.
- A gate required by this brief reports `fail`.

## Deferred Scope (Non-Goals For This Release)

- Team collaboration features.
- Cloud sync and remote data synchronization.
