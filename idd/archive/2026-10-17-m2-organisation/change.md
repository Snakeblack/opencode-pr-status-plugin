# m2-organisation

## Intent and acceptance

M2 organisation and polish: group chained open pull requests (a PR base equal to another PR head) under their root in the sidebar panel, children indented base to tip, with the agreed scanning presentation; no notifications, no new actions

Acceptance: Loaded in the host TUI with open PRs that form chains, the panel shows each chain under its root PR, its children indented base-to-tip, and every row keeps its state mark and CI state; with no chains the list keeps the current number order and look; panel resilience (per-kind failure copy, last good list) is unchanged.

## Plan

M2 organisation and polish (docs/roadmap.md), built with strict TDD through the ospec loop: unit `stacks` red→green with official evidence; the `gh-author` and `panel` pairs ran test-first locally (the argument assertion failed before the client change, the `indentPrefix` test failed before the renderer change) and are covered by the final check run.

1. `stacks` — new pure module: chain matching on the raw branch names (`base` equals another open PR's `head`, lowest-numbered parent wins), ordering (each group at its root's number, children base→tip by number, depth-first; unrelated rows flat by number), per-row `depth`, and `indentPrefix(depth)` for the panel.
2. `gh-author` — still one `gh pr list` call per refresh, now `--author @me` (the authenticated user's own open PRs) and `--json ...,baseRefName,...`. The real capture was regenerated (`pr-list.json`, PR #356 of Snakeblack/ospec-workflow).
3. `panel` — children render `indentPrefix` plus the state mark; the branch line aligns under its row's mark; titles clip to one line (`wrapMode="none"` + `truncate`); theme tokens only; failure handling untouched.

Fixtures: `pr-list.json` is a fresh real `gh` capture; `chained-prs.json` is constructed (a 3-PR chain with two siblings, a draft inside the chain and mixed rollups).

Verification: `npm test` (56 tests / 6 files), `npm run lint` and `npm run typecheck` clean; every ospec gate recorded (impacts conform on ADRs 0001–0003 and the 3 scenarios; fitness verified per ADR; trust review approved, no findings). Host smoke in the real TUI (opencode v2.0.32, tmux) against a temporary private repository (`Snakeblack/pr-status-smoke-m2`, PRs #1 root, #2 and #3 children):

- the panel grouped the chain: root flat, both children with the `└─` connector, branches aligned and the long child title clipped to one line with an ellipsis; content stable across a refresh tick.
- project without chains (impostor-game, 50 own PRs): flat number order and look unchanged.
- project without a git remote: `Could not read pull requests. (no git remotes found)` unchanged.
- captures: /tmp/opencode/prstatus-smoke/m2-{sidebar-1,sidebar-2,nostack-capture,noremote-capture}.txt.

## Decisions

- **Own pull requests only (open-facts gate answers)**: the panel reads the authenticated user's open PRs (`gh pr list --author @me`), limit still 50. A child whose base is another author's branch therefore shows ungrouped. This also answers M1's open question "which PRs exactly".
- **Stack matching**: exact raw branch equality (`base === head`) before any normalisation; ADR 0003's boundary keeps handling display text. An empty `head` is never a parent and an empty `base` never a child; with duplicate heads the child attaches to the lowest-numbered PR; a base equal to its own head is ignored; a looping chain (impossible with real branch ancestry) renders flat.
- **Ordering**: each chain sits at its root's number position, children base→tip by number, depth-first; unrelated rows stay flat, numbered ascending — with no chains the order matches M1.
- **Presentation (gate answers)**: indent per depth plus a `└─` connector on children (legible without colour); the branch line aligns under its row's mark; long titles clip to one line (host `truncate`); no blank line between stacks; header copy (`Pull requests`) unchanged; every colour stays a host theme token.
- **Defensive shape**: `PrView` gains `depth` (0 root/standalone); duplicate PR numbers keep their first row; `orderStacks`/`indentPrefix` never throw.
- **Trust review**: approved, no findings, on `opencode/glm-5.3-flash-free` (the configured `zai-coding-plan/glm-5.3-flash` is unavailable; the M1-approved fallback was reused). Notes confirm no credential reads, one no-shell fixed-arg `gh` spawn, no HTTP client, and raw branch names never rendered.
- **Product docs follow-up**: `docs/product/functional-scope.md` still lists "which PRs exactly" and stack grouping as open questions; recording their settled answers there is a docs follow-up alongside M1's ADR-check follow-up.
- **Smoke fixture**: verified against a temporary private repository created for the smoke (`Snakeblack/pr-status-smoke-m2`), deleted after the capture.

## Evidence

<!-- ospec:evidence:start -->
- ev-1: tdd-red-green for tdd-red-green (2026-10-17T18:27:37.351Z)
- ev-2: check-run for checks-pass (2026-10-17T18:36:49.143Z)
- ev-3: adr-impact-declaration for adr-impact-declaration (2026-10-17T18:36:49.143Z)
- ev-4: frozen-review for trust-review (2026-10-17T18:40:51.205Z)
- ev-5: living-doc-current for living-doc (2026-10-17T18:42:59.369Z)
<!-- ospec:evidence:end -->
