# Functional scope — opencode-pr-status-plugin (working name)

> Confirmed answers live in `docs/architecture/knowledge-map.yaml`.

## Actors

- **Developer (TUI user)** — primary actor; works in OpenCode and reads the
  panel. Assumed (2026-10-17, reviewable): only the author matters for the
  first slice; revisit when publishing to npm.
- External systems at the boundary: **`gh` CLI** (credential holder, local
  process) and **GitHub** (source of truth for PRs and checks).

## Capabilities — first slice (confirmed 2026-10-17)

1. List the project's open PRs (number, title, branch).
2. CI status per PR: running / green / red (aggregated checks).
3. Auto-refresh while the panel is open (no manual reload).
4. Visual organisation: tabs and/or grouping of chained (stacked) PRs.

Not in this slice: opening the PR in the browser (mentioned, not selected).

## Exclusions (confirmed 2026-10-17)

- No actions on PRs (merge / close / rerun / review): informative only.
- No own authentication or token handling (`gh` only).
- No multi-repo / multi-org dashboards: the current project only.

Undecided (not excluded): notifications/sounds.

## Journey

1. Developer opens the panel (or it stays open) while working in a session of a
   GitHub project.
2. The panel lists open PRs; each shows its CI state.
3. State changes appear without manual refresh (running → green/red).
4. With chained PRs, the developer sees the whole stack's CI state in the TUI.

## Open questions

- Which PRs exactly (drafts? only mine? all open?) — first-slice design.
- Stack grouping: how a chain is detected/visualised — first-slice design.
- Notifications: decide later (not excluded).
