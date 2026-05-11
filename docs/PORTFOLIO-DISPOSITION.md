# Nexus — Portfolio Disposition

**Status:** Release Frozen — macOS Electron release pipeline with G0–G6
hard-gate plan documented, awaiting operator-only Apple signing +
notarization credentials. Joins the signing-frozen cluster (DesktopPEt
/ ContentEngine / AIGCCore / Relay / FreeLanceInvoice / Nexus — now 6
repos).

> Disposition uses strict `origin/main` verification (lessons learned
> from earlier session corrections — see "Verification posture" below).

---

## Verification posture

This disposition was written against the **canonical**
`origin/main` (saagpatel) only, not against `legacy-origin/main` or
feature branches. Specifically verified:

- `origin/main` tip: `f018608` chore: add pull request template
- Last substantive feature commit on `origin/main`:
  `6c19bdd feat(desktop): ship advanced API workflows and release gates (#5)`
- `docs/release/lane-3-macos-release-readiness.md` confirmed present
  via `git show origin/main:docs/release/lane-3-macos-release-readiness.md`
- Source tree on `origin/main` includes collection/environment/
  discovery backends, IPC layer, Pinia stores, history panel,
  Monaco editor integration

`legacy-origin` exists (`saagar210/Nexus`) but was not consulted for
this disposition's claims. Any operator audit should verify whether
`legacy-origin/main` has work that should be brought forward —
that's the same migration-orphan risk discussed in the
FreeLanceInvoice and PersonalKBDrafter correction docs.

---

## Current state in one paragraph

Nexus is an Electron + TypeScript + Vue/Pinia desktop API workbench:
HTTP, GraphQL, and WebSocket request flows, Monaco-powered editor,
assertions engine, collection runner, code export (cURL / fetch /
Axios), SQLite-backed persistent workspace. The repo has a published
Lane 3 release readiness plan with hard gates G0–G6 covering branch
hygiene, conventional commits, PR template completeness, signing,
notarization, rollback safety, and post-release monitoring. The
macOS release pipeline is ready end-to-end on paper; what is gated
is the Apple credentials portion.

For full detail (in priority order):

- `docs/release/lane-3-macos-release-readiness.md`
- `docs/execution/phase4-execution-brief.md`
- `docs/execution/implementation-status-2026-03-01.md`
- `README.md`

---

## Portfolio operating system instructions

| Aspect               | Posture                                                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio status     | `Release Frozen`                                                                                                                                                                                                                                                            |
| Review cadence       | Suspend overdue counting                                                                                                                                                                                                                                                    |
| Resurface conditions | (a) Apple signing credentials wired in CI, (b) operator decides to run a `legacy-origin` audit and bring forward any orphaned work, or (c) operator opens a v0.2 scope packet (Windows/Linux production, full auto-update implementation — both explicitly out of v1 scope) |
| Co-batch with        | Signing cluster: DesktopPEt, ContentEngine, AIGCCore, Relay, FreeLanceInvoice, **Nexus** — now 6 repos. The operator's signing session value compounds: each repo added drops the per-repo amortized cost.                                                                  |

---

## Why "Release Frozen" instead of other dispositions

- **Active** — wrong. v1 product surface is complete; G0–G6 gates
  define the only path to ship and Apple credentials are the
  blocker.
- **Cold Storage** — wrong. The release readiness plan exists, the
  source tree is functional, the gates are documented.
- **Archived / Wind-down** — wrong. The author has explicitly scoped
  v0.2 work (cross-platform + auto-update); nothing has been
  abandoned.
- **Release Frozen** — correct, same shape as the rest of the
  signing cluster.

---

## Unblock trigger (operator)

When ready to ship:

1. Wire Apple Developer ID + notarization credentials per Lane 3
   plan (Section 5 of the release readiness doc).
2. Run the canonical release pipeline through G0–G6.
3. Capture rollback drill evidence (G5 hard gate).
4. Publish v1 macOS release.
5. Decide v0.2 scope: cross-platform OR full auto-update — both are
   in the doc as future work, neither blocks v1.

Estimated operator time once credentials are in hand: ~4 hours for
the full G0–G6 run including notarization round-trip.

---

## Reactivation procedure (for the next code session)

When portfolio operating system flips this row to `Active`:

1. **Fix local clone tracking** if `git branch -vv` shows `main`
   tracking `legacy-origin/main`. This was the trap that produced
   wrong dispositions for FreeLanceInvoice and PersonalKBDrafter
   earlier in the session.
2. Delete stale `codex/*` branches (most are merged-history
   artifacts from the saagar210-era).
3. Re-run `pnpm install && pnpm verify` to confirm the toolchain
   still works after the freeze.
4. **Optional but recommended:** before signing, run a one-time
   `legacy-origin` audit:
   `git log --oneline origin/main..legacy-origin/main | head -20`
   If non-trivial commits appear, decide whether to bring them
   forward.
5. Then proceed to G0–G6 release pipeline.

---

## Last known reference

| Field                                    | Value                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `origin/main` tip                        | `f018608` chore: add pull request template                                                                                       |
| Last substantive commit on `origin/main` | `6c19bdd` feat(desktop): ship advanced API workflows and release gates (#5)                                                      |
| Release plan                             | `docs/release/lane-3-macos-release-readiness.md` (on `origin/main`)                                                              |
| Implementation status                    | `docs/execution/implementation-status-2026-03-01.md` (on `origin/main`)                                                          |
| Hard gates defined                       | G0 (Hygiene) through G6 (post-release monitoring)                                                                                |
| Build verification status                | green                                                                                                                            |
| Blocker                                  | Apple signing + notarization (operator-only)                                                                                     |
| Migration note                           | `legacy-origin` points at frozen `saagar210/Nexus`. Operator-side audit recommended before shipping to confirm no orphaned work. |
