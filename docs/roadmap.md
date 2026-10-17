# Roadmap

## First slice — walking skeleton

The thinnest end-to-end path that proves the idea:

- The plugin loads in the host TUI and registers the sidebar panel.
- It reads the project's open PRs and each PR's aggregated check state through
  the local client.
- It refreshes while the panel is open (no manual reload).
- It renders a plain list with the host's theme tokens and shows clear messages
  when the client is missing, unauthenticated, offline or rate-limited.

No tabs or stack grouping in this slice — organisation is M2.

Evidence that the slice works: the three quality scenarios checked by hand
against a real repository; unit tests for parsing/aggregation/escaping; fixture
driven tests for the client adapter; a host-contract smoke test with a mocked
host context.

Deliverable: a runnable plugin loaded locally from this repository.

## Milestones

1. **M1 — walking skeleton** (above).
2. **M2 — organisation and polish**: tabs and/or stack grouping, scanning
   quality, host-style details (`visual-ci-state-legible`).
3. **M3 — publishable package**: README, LICENSE (MIT + Commons Clause
   Condition v1.0), CI publishing with checks, SemVer policy and declared
   supported host range.

## Deferred decisions

Owner of all: the maintainer (solo).

| Deferred decision | Last responsible moment |
| --- | --- |
| Notifications/sounds (undecided, not excluded) | M2 planning |
| "Open PR in browser" action | M2 planning |
| Revisit the `functional.actors` assumption (solo author) | before the npm publish (M3) |
| Support for hosts beyond the default platform | first external user request |
| Own log file for debugging (beyond panel + host logs) | only if a support case needs it |
