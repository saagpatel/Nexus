# Lane 3 Plan: Release/Ops for macOS Production (Electron)

## 1. Goal and Scope

**Goal**: ship a reliable, signed, notarized macOS production release for Nexus with clear go/no-go gates, rollback safety, and post-release support.

**In scope**

- macOS-only production distribution.
- Build pipeline hardening and release automation.
- Apple signing + notarization process (with placeholders for credentials).
- Versioning + changelog flow.
- Artifact packaging, checksums, and publication strategy.
- Rollback and post-release monitoring/support loop.

**Out of scope for this lane**

- Windows/Linux production release.
- Full auto-update implementation (can be prepared, not required to launch v1).

## 2. Delivery Model (Lane 3)

- Lane owner: Release/Ops.
- Interface with Lane 1 (product/engineering) for release notes and hotfixes.
- Interface with Lane 2 (QA) for final validation evidence.
- Ship decision uses hard gates below: any `fail` or `not-run` blocks production release.

## 3. Hard Gates (Go/No-Go)

### Gate G0: Repo + Branch Hygiene

**Pass when**

- Working branch matches `codex/<type>/<slug>`.
- Conventional Commit format is used.
- PR template sections are completed: What, Why, How, Testing, Performance impact, Risk / Notes.
- Lockfile rationale section exists if lockfile changed.

**Blockers**

- Invalid branch naming, missing PR sections, or lockfile change with no rationale.

### Gate G1: Build Pipeline Readiness

**Pass when**

- Deterministic verify commands pass via `.codex/scripts/run_verify_commands.sh`.
- Release workflow can build mac artifacts in CI from a clean checkout.
- Required baseline commands are green: git hygiene, bundle delta, build delta, assets/memory checks.

**Blockers**

- Any verify command failure.
- CI cannot produce artifacts for both target mac architectures.

### Gate G2: Review/Fix Loop Completion

**Pass when**

- `reviewer-findings-v1` run completed.
- `fixer-apply-findings-v1` applied.
- reviewer re-run shows no P0/P1 findings.

**Blockers**

- Any unresolved P0/P1 issue.

### Gate G3: Signing/Notarization Compliance

**Pass when**

- App is signed with Developer ID Application certificate.
- Hardened Runtime is enabled.
- Notarization succeeds and ticket is stapled.
- Gatekeeper validation succeeds on a clean macOS host.

**Blockers**

- Unsigned artifact, notarization failure, or Gatekeeper warning.

### Gate G4: Release Artifact Integrity

**Pass when**

- Artifact matrix is complete (see Section 6).
- SHA-256 checksums generated and published.
- Release notes/changelog correspond to shipped version.

**Blockers**

- Missing artifact, missing checksum, or version/changelog mismatch.

### Gate G5: Rollback Readiness

**Pass when**

- Previous stable release is still available and verified installable.
- Rollback runbook is reviewed by on-call release owner.
- Rollback communication template is ready.

**Blockers**

- No validated previous release path or no owner assigned.

### Gate G6: Post-Release Support Readiness

**Pass when**

- Monitoring signals and alert ownership are defined.
- Support triage SLA and escalation path are defined.
- First 72-hour monitoring schedule is staffed.

**Blockers**

- No staffed support window or no alert ownership.

## 4. Build Pipeline Fix Plan (Concrete Tasks)

### BPF-01: Add explicit production build scripts

- Add missing `build` script expected by CI (`pnpm build || pnpm build:ui` currently references non-existent scripts).
- Add `build:main` and `build:renderer` (or equivalent) for deterministic compile steps.
- Add `release:mac:dry-run` script that runs full packaging without publish.

**Done when**

- CI no longer relies on fallback/undefined scripts.
- `pnpm release:mac:dry-run` succeeds on clean machine.

### BPF-02: Create dedicated macOS release workflow

- Add `.github/workflows/release-macos.yml` with:
  - trigger on version tag `v*.*.*` and manual `workflow_dispatch`.
  - matrix for `macos-14` with `arm64` and `x64` outputs (or universal if chosen).
  - install, verify, test/typecheck, package, sign/notarize, checksum, upload artifacts.
- Keep report-only checks before mutate/publish.

**Done when**

- Workflow produces complete artifact set in draft release mode.

### BPF-03: Add release preflight gate

- Add a script to assert required env/secrets presence before signing/notarization.
- Fail fast with readable messages if secrets missing.

**Done when**

- Workflow stops early with clear errors when secrets are absent.

### BPF-04: Enforce release evidence bundle

- Persist machine-readable release outputs:
  - artifact manifest
  - checksums
  - notarization status
  - verify command results

**Done when**

- A release candidate has one evidence bundle attached to the CI run.

## 5. macOS Signing and Notarization Plan

### 5.1 Placeholder configuration tasks

### SIGN-01: Configure Forge for mac signing

- Extend `forge.config.ts` `packagerConfig` with `osxSign` placeholder:
  - `hardenedRuntime: true`
  - identity placeholder from env
  - entitlements file paths (main + inherit)

### SIGN-02: Configure notarization placeholders

- Add `osxNotarize` placeholder (App Store Connect API key flow recommended).
- Read from CI secrets/env:
  - `APPLE_API_KEY`
  - `APPLE_API_KEY_ID`
  - `APPLE_API_ISSUER`

### SIGN-03: Add entitlements files

- Create:
  - `electron/build/entitlements.mac.plist`
  - `electron/build/entitlements.mac.inherit.plist`
- Keep least privilege defaults and document exceptions.

### SIGN-04: Document certificate/bootstrap process

- Create operator runbook for:
  - generating/exporting Developer ID cert
  - storing cert in CI secret (base64 p12 or keychain import path)
  - rotating/revoking credentials

**Signing/Notarization gate checks (must pass)**

- `codesign --verify --deep --strict` passes.
- `spctl --assess --type exec -vv` passes.
- Notarization accepted and stapled.

## 6. Versioning, Changelog, and Release Notes

### VER-01: Version policy

- Use SemVer tags: `vMAJOR.MINOR.PATCH`.
- Patch = bug/security fix only.
- Minor = backward-compatible features.
- Major = breaking behavior or migration risk.

### VER-02: Single source of truth

- `package.json` version must match git tag and changelog header.
- Release workflow validates equality before publish.

### VER-03: Changelog automation

- Generate from Conventional Commits for each release.
- Required sections:
  - Added
  - Fixed
  - Security
  - Breaking changes
  - Upgrade notes

### VER-04: Release notes quality gate

- Include install steps for macOS and known issues.
- Include rollback instruction link.

## 7. Release Artifact Strategy (macOS Only)

### Artifact matrix

- `Nexus-<version>-mac-arm64.dmg`
- `Nexus-<version>-mac-x64.dmg`
- `Nexus-<version>-mac-arm64.zip`
- `Nexus-<version>-mac-x64.zip`
- `checksums.txt` (SHA-256 for all files)
- `release-manifest.json` (artifact names, sizes, hashes, notarization status)

### Distribution channel (phase 1)

- Publish on GitHub Releases as source of truth.
- Use `Draft` release for validation, then promote to `Latest` after go decision.
- Keep previous stable release pinned/available for rollback.

### Optional phase 2

- Add signed direct-download site mirror.
- Add auto-update feed after two stable manual releases.

## 8. Rollback Plan (Operational)

### Rollback triggers

- P0 crash-on-launch.
- Data loss/corruption risk.
- Critical auth/security regression.
- Install blocked by signing/notarization issue.

### Rollback actions (ordered)

1. Pause rollout: mark latest release non-current (or unlist download link).
2. Promote last known-good version as latest stable.
3. Publish rollback advisory with clear downgrade steps.
4. Open hotfix branch: `codex/hotfix/<issue-slug>`.
5. Build/sign/notarize hotfix using same gates.

### Data safety requirements

- Before production tag, verify DB migration behavior on downgrade scenario.
- If backward-unsafe migration exists, ship backup/export warning in release notes.

## 9. Post-Release Monitoring and Support Loop

### First 72 hours (mandatory)

- 0-4h: release owner active monitoring (install/signing/notarization feedback).
- 4-24h: on-call checks every 2 hours.
- Day 2-3: twice-daily review and triage.

### Signals to monitor

- Install failures (Gatekeeper/signature issues).
- Startup crash rate.
- Top 5 repeated error reports.
- Support ticket volume and severity trend.

### Support SLA (initial)

- P0: acknowledge in 30 minutes, mitigation in 4 hours.
- P1: acknowledge in 4 hours, mitigation in 1 business day.
- P2: acknowledge in 1 business day, schedule fix next patch/minor.

### Communication loop

- Maintain release status thread with timestamped updates.
- End-of-week release health summary with: issues, mitigations, follow-up actions.

## 10. Execution Backlog (Task Board)

### P0 (must complete before first production release)

- [ ] BPF-01 add explicit build scripts and dry-run target.
- [ ] BPF-02 add `release-macos.yml` workflow.
- [ ] BPF-03 add release preflight secret checks.
- [ ] SIGN-01 configure `osxSign` placeholders.
- [ ] SIGN-02 configure notarization placeholders.
- [ ] SIGN-03 add entitlements plist files.
- [ ] VER-01/02 enforce version-tag-changelog match.
- [ ] Artifact matrix + checksums + manifest generation.
- [ ] Rollback runbook + owner assignment.
- [ ] 72-hour support staffing and escalation contacts.

### P1 (recommended immediately after first stable release)

- [ ] Changelog automation polish and release note templates.
- [ ] Install lightweight crash/error telemetry for faster triage.
- [ ] Add release KPI dashboard for weekly trend review.

## 11. Final Go/No-Go Checklist

Use this at release cut time:

- [ ] G0 Pass
- [ ] G1 Pass
- [ ] G2 Pass
- [ ] G3 Pass
- [ ] G4 Pass
- [ ] G5 Pass
- [ ] G6 Pass
- [ ] Product/QA/Lane 3 sign-off recorded
- [ ] Release promoted from Draft to Latest

If any gate is `fail` or `not-run`: **No-Go** until resolved.
