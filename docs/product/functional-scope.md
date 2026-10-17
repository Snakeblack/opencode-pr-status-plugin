# Functional scope — opencode-pr-status-plugin (working name)

> Confirmed answers live in `docs/architecture/knowledge-map.yaml`.

## Actors

- **Developer (TUI user)** — primary actor; works in OpenCode and reads the
  panel. The author is the primary user; since the npm publish (confirmed
  2026-10-17) any OpenCode user who installs the plugin is a secondary user in
  scope.
- External systems at the boundary: **`gh` CLI** (credential holder, local
  process) and **GitHub** (source of truth for PRs and checks).

## Capabilities — first slice (confirmed 2026-10-17)

1. List the authenticated user's own open PRs (number, title, branch).
2. CI status per PR: running / green / red (aggregated checks).
3. Auto-refresh while the panel is open (no manual reload).
4. Visual organisation: chained (stacked) PRs grouped under their root (no
   tabs).

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

- Notifications: decide later (not excluded).

Settled by the first slice's design (2026-10-17): only the authenticated user's
own open PRs are listed (drafts included and marked); a chain is detected by an
exact `base` = `head` branch match and grouped under its root, children indented
base to tip.
