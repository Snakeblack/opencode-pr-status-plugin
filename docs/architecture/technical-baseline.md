# Technical baseline — opencode-pr-status-plugin (working name)

> Foundation in progress; sections fill as rounds settle. Unknowns stay marked.
> Confirmed answers recorded in `docs/architecture/knowledge-map.yaml`.

## Context and boundaries

- Runs inside the OpenCode V2 TUI as a local CLI/TUI plugin (no server of its
  own). See the OpenCode V2 CLI-plugin documentation as the external contract.
  (confirmed 2026-10-17)
- Reads GitHub data through the local `gh` CLI (assumed credentials holder);
  no own authentication, no backend. (confirmed 2026-10-17)
- Boundary: one project (the OpenCode location/directory) at a time.
- Out of scope: GitHub web features beyond read (reviews, merges, reruns),
  multi-org dashboards.

## Components and data

- Data ownership (confirmed 2026-10-17): GitHub owns PRs and checks; the plugin
  caches only in memory and persists nothing of its own. Preferences, if any,
  would live in OpenCode's plugin storage (host-owned).
- Components: pending — the split (data access / refresh / panel UI) is settled
  in the first-slice design.

## Integrations (confirmed 2026-10-17: local process style)

| Dependency | Owner | Protocol | Failure mode |
| --- | --- | --- | --- |
| `gh` CLI | user's machine (installed/logged in by the developer) | local process (JSON output) | absent/unauth → panel shows a clear message; plugin keeps working |
| GitHub API (via `gh`) | GitHub | HTTPS through `gh` | offline/rate limit → explicit state in the panel, retry |
| OpenCode host | OpenCode | plugin API (`@opencode/plugin/tui`) | host reload/dispose → plugin cleans up (unsubscribe, cancel timers) |

No direct GitHub API calls and no token handling inside the plugin.

## Quality scenarios

| id | attribute | origin & stimulus | environment | artifact | response | measure | priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `visual-ci-state-legible` | usability / clarity | developer keeps the panel open while working | normal TUI session | sidebar panel | PRs and CI state (running/green/failed) readable at a glance, matching OpenCode's visual style | none confirmed — manual judgement (do not invent) | 1 |
| `fresh-ci-state` | freshness | a CI run changes state while the panel is open | `gh` available, network up | panel content | panel reflects the new state without manual refresh | none confirmed — kept as reviewable assumption | 2 |
| `panel-resilience` | reliability | `gh` missing/unauthenticated, offline, rate-limited, or no PRs | any | panel (+ TUI) | explicit message for the condition; TUI unaffected; no crash | none confirmed — manual tests | 3 |

Out of focus for now (not drivers): raw performance budget, local privacy beyond
"data only flows through `gh`".

## Constraints

- Must load as an OpenCode V2 TUI plugin (`@opencode/plugin/tui`, `./tui`
  export); compatibility with V1 is not required unless decided otherwise.
- Integration is local-process only (`gh`); the plugin ships no service.
  (confirmed 2026-10-17)
- Distribution as a publishable npm package installed by the user; no own
  deployment surface. (confirmed 2026-10-17)
- Versioning: SemVer on npm; the supported OpenCode V2 range is declared; a
  breaking plugin-contract change is a major. (confirmed 2026-10-17)
- Environments: only users' machines (installed from npm); GitHub CI runs tests
  and the publish; no staging. (confirmed 2026-10-17)
- License: MIT plus the Commons Clause License Condition v1.0 — the package is
  published, but not sellable under the condition's definition.
  (confirmed 2026-10-17)
- Assumes `gh` installed and authenticated; the plugin stores and handles no
  GitHub credentials of its own. (confirmed 2026-10-17)
- Solo maintainer: decisions favour low operational surface.

## Test strategy

Risk-based layers (no coverage percentage):

- **Unit**: parsing and aggregation of the local client's JSON output; refresh
  scheduling; escaping at the render boundary (ADR 0003).
- **Integration/contract**: the local-client adapter against recorded real
  outputs (fixtures), including error cases — client missing, unauthenticated,
  offline, rate limit. No live platform calls in tests.
- **Host contract**: a smoke test that the plugin's `setup` registers and
  cleans up against a mocked host context (ADR 0001: no credential reads;
  ADR 0002: no persistence).
- **Measurement**: none — no numeric quality driver was confirmed; the three
  quality scenarios are checked by hand against a real repository.

The suite runs locally and offline in CI (acceptance scenario "CLI local
without a service").

## Technology record

Choices confirmed 2026-10-17 (formal technology-record rows, each implementing
an ADR, are written together with the ADRs):

- TypeScript on the host Node runtime; OpenTUI + Solid for the panel UI; tests
  with the Node-ecosystem runner (vitest as working assumption).
- Dependency policy: permissive licenses only (MIT/ISC/Apache-2.0); no strong
  copyleft.
- Source (dated): OpenCode V2 docs, <https://opencode.ai/v2/docs/build/plugins/cli>
  (consulted 2026-10-17) — `@opencode/plugin/tui` resolved at runtime; OpenTUI
  peers `@opentui/core`, `@opentui/solid` (>=0.5.8), `solid-js` (>=1.9.0).
