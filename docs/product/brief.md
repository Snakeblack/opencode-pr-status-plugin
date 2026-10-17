# Product brief — opencode-pr-status-plugin (working name)

> Foundation in progress. Confirmed answers are recorded in
> `docs/architecture/knowledge-map.yaml`; this brief is their narrative form.

## Problem (confirmed 2026-10-17)

Developers who work inside the OpenCode TUI with an active GitHub project cannot
see the state of the project's pull requests or their CI without leaving the
terminal (browser, `gh` in another pane). Keeping focus matters most when
several PRs are in flight — e.g. chained/stacked PRs — where "is CI still
running, which passed" changes often.

## Users

- Primary: the maintainer — a solo developer working inside OpenCode on GitHub
  projects, often with chained PRs.
- Secondary: any OpenCode user who installs the plugin to watch their project's
  PRs while working.

## Goals (confirmed 2026-10-17)

- Show, at a glance and inside the TUI, the project's pull requests and each
  one's CI status (running, green, failed) — no context switch out of the TUI.
- Fit OpenCode's visual style; pleasant UX (organised, e.g. tabs); visually
  clear when CI turns green.
- Useful when several PRs (e.g. chained) are in flight.

## Success measures (confirmed 2026-10-17)

Qualitative: the maintainer stops leaving the TUI to check PR/CI state during
daily work. No numeric target — do not invent one.

## Constraints (confirmed 2026-10-17)

- License: MIT plus the Commons Clause License Condition v1.0 (no right to
  "Sell" the software as defined by that condition).
- Requires `gh` installed and authenticated by the user; the plugin handles no
  GitHub tokens; all GitHub access goes through `gh` (API limits respected
  there).
- Published as a package on npm; SemVer; supported OpenCode V2 range declared.

## Non-goals (tentative, to confirm in `functional.exclusions`)

- Replacing GitHub's web UI or `gh` itself.
- Managing reviews/merges from the panel (informative scope for now).
- Owning its own GitHub authentication.

## Team (confirmed 2026-10-17)

- Solo maintainer with TypeScript/Node experience, works with coding agents.
- Production owner: the author publishes to npm and handles issues/support.

## Open questions

- Which PRs are shown and how stacks are organised (functional round).
- Refresh strategy details; multi-host (github.com only?) support.
