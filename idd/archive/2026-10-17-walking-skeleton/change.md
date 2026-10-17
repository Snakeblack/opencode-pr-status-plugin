# walking-skeleton

## Intent and acceptance

M1 walking skeleton: TUI plugin registering a sidebar panel showing the project's open PRs and each PR's aggregated CI state, read through the local gh client, refreshing while the panel is open.

Acceptance: Loaded from this repository into the host TUI, the panel lists the current project's open PRs (number, title, branch) with each one's aggregated CI state (running/green/red) from gh, updates without manual reload, and shows a clear message when the client is missing, unauthenticated, offline or rate-limited, without breaking the TUI.

## Plan

Walking skeleton for M1 (docs/roadmap.md), built with strict TDD: one red→green cycle per unit through the ospec loop (units `safe-text` runs 1–2, `aggregate` 3–4, `refresh` 5–6, `gh-client` 7–8, `plugin` 9–11 — the plugin pair re-recorded after the contract refinement).

1. `safe-text` — single normalization boundary for untrusted platform text: strip ANSI escapes, C0/C1 control characters, zero-width and bidi direction controls; collapse whitespace; clamp at 120 code points without splitting surrogate pairs.
2. `aggregate` — per-PR CI aggregation and `toPrViews` mapping: `failed` > `running` > `green` (empty rollup → `none`); number/title/branch/draft from raw `gh` JSON; normalized at the boundary; sorted by number ascending.
3. `gh-client` — one `gh pr list --state open --limit 50 --json number,title,headRefName,isDraft,statusCheckRollup` call per refresh; failures classified `missing | unauthenticated | offline | rate-limited | error`.
4. `refresh` — injectable-timer loop: immediate first read, then every 30 s; overlapping ticks skipped; `stop()` cancels; sync/async failures go to `onError` and the loop continues.
5. `plugin` + `panel` — TUI plugin factory registering the panel on `sidebar.content`; Solid panel with loading/empty/failure states and per-PR rows.

Fixtures: `pr-list.json` and `gh-unauth.txt`/`gh-not-a-repo.txt` are real `gh` captures; `gh-rate-limit.txt`, `gh-offline.txt`, `rollup-edge-cases.json` and `pr-list-empty.json` are constructed edge cases.

Verification: `npm test` (44 tests / 5 files), `npm run lint`, `npm run typecheck` all clean; every ospec gate got its evidence (checks, contract, impacts, fitness, trust review — ev-12 approved, no findings). Host smoke in the real TUI (opencode v2.0.32, tmux):

- project with open PRs (impostor-game remote): the sidebar lists the open PRs with state mark, number, title and branch; stable across a >30 s refresh tick; PR #88 renders green ● and its raw rollup is StatusContext SUCCESS + CheckRun COMPLETED/SUCCESS — the aggregation matches.
- project without a git remote: `Could not read pull requests. (no git remotes found)`.
- project with no open PRs: `No open pull requests.`
- the plugin manager lists `opencode-pr-status` (TUI) and `opencode-pr-status.server` (server); the TUI kept working in every scenario.
- captures: /tmp/opencode/prstatus-smoke/{sidebar-capture-1.txt,sidebar-capture-2.txt,noremote-capture.txt,nopr-capture.txt,plugins-dialog.txt}.

## Decisions

- **Aggregation precedence**: completed failure → `failed` (wins over running); unfinished → `running`; all ok → `green`; nothing usable → `none`. `CheckRun`: non-`COMPLETED` → running; `COMPLETED` + `SUCCESS|NEUTRAL|SKIPPED` → ok; anything else (including `""`) → failed. `StatusContext`: `SUCCESS` → ok; `PENDING` → running; anything else (unknown states included) → failed. Unrecognised input fails safe.
- **gh client**: fixed argv, no shell (`execFile`), `cwd` = project directory, `LC_ALL/LANG=C`, 20 s timeout, 4 MiB max buffer; classification order rate-limit → unauthenticated → offline → error; message = first non-empty stderr line, else `gh exited with code N`; malformed JSON → `error`. The production `execFile` binding is wiring; its numeric-code branch is not unit-tested.
- **Refresh**: 30 s, immediate first read, overlap skipped, `stop()` cancels, `start()` idempotent; failures never stop the loop.
- **Panel**: per-kind failure copy with transient kinds (offline, rate-limited) in the warning colour; `error` appends the gh message; the last good list survives failed refreshes; state marks ● ✖ ◐ ○ stay legible without colour; text uses `wrapMode="word"`.
- **Contract refinement**: `PanelProps.directory: string` (no optional case; `context.data.location.default()` always returns a `LocationRef`), location read once in `setup`; the planned "missing location" test was dropped as unreachable (plugin tests = 3). `idd/config.yaml` now declares the contract documents (`src/index.ts`, `src/tui.tsx`) and the impact paths.
- **Packaging**: no build step; exports `.` → `src/index.ts` and `./tui` → `src/tui.tsx`; runtime dependency `@opencode/plugin`; `@opentui/core`, `@opentui/solid` and `solid-js` are peer dependencies (the host provides them).
- **Text boundary**: normalization runs exactly once inside `toPrViews`; the boundary strips and clamps rather than escapes, so nothing raw ever reaches the renderer. `safe-text.ts` carries `biome-ignore-all noControlCharactersInRegex` because matching control characters is the module's purpose.
- **OpenTUI nuances** found while building: text nodes accept only `style={{ fg }}` (a raw `fg` prop is silently ignored) and `<Show>` callback children need an explicit `Accessor<T>` annotation.
- **Host loading (smoke)**: a project `.opencode/plugins/pr-status/` directory with `index.ts` (server) and `tui.ts` (TUI) entries that import this repository loaded both halves in opencode v2.0.32. The `opencode.json` `"plugins": ["<absolute path>"]` form did not load in the smoke; the published-package install path is M3 scope.
- **ADRs untouched**: the review items still say "(no scaffold yet)"; converting them to executable `- Check:` commands is a docs follow-up (fitness for this change is read from the base commit anyway).
- **Trust review**: approved, no findings (ev-12), run on `opencode/glm-5.3-flash-free` because `zai-coding-plan/glm-5.3-flash` was unavailable (user-approved fallback). Notes confirm no credential reads, one no-shell fixed-arg `gh` spawn, no HTTP client, and platform text normalized before rendering; the gh stderr detail in failure copy is local diagnostics, not platform-sourced text.
- **npm audit**: critical advisories in `seroval` (via `@opentui/solid` → `solid-js`), "no fix available" — recorded for M3.
- **Engram**: context checkpoints saved during the change (topic `changes/walking-skeleton`) at the user's request because of the small context window.

## Evidence

<!-- ospec:evidence:start -->
- ev-1: tdd-red-green for tdd-red-green (2026-10-17T17:12:43.082Z)
- ev-2: tdd-red-green for tdd-red-green (2026-10-17T17:14:12.929Z)
- ev-3: tdd-red-green for tdd-red-green (2026-10-17T17:14:49.980Z)
- ev-4: tdd-red-green for tdd-red-green (2026-10-17T17:15:36.045Z)
- ev-5: tdd-red-green for tdd-red-green (2026-10-17T17:16:46.110Z)
- ev-6: tdd-red-green for tdd-red-green (2026-10-17T17:24:41.442Z)
- ev-7: check-run for checks-pass (2026-10-17T17:41:03.707Z)
- ev-8: contract-spec-and-test for contract-spec-and-test (2026-10-17T17:41:03.707Z)
- ev-9: adr-impact-declaration for adr-impact-declaration (2026-10-17T17:41:03.707Z)
- ev-10: check-run for checks-pass (2026-10-17T17:41:06.033Z)
- ev-11: contract-spec-and-test for contract-spec-and-test (2026-10-17T17:41:06.033Z)
- ev-12: frozen-review for trust-review (2026-10-17T17:46:34.058Z)
- ev-13: living-doc-current for living-doc (2026-10-17T17:48:16.700Z)
<!-- ospec:evidence:end -->
