# m3-package

## Intent and acceptance

M3 publishable package: README and LICENSE (MIT + Commons Clause v1.0), CI that runs the checks and publishes versioned releases, SemVer policy, declared supported host range, and a verified install of the packed artifact in the host

Acceptance: The repository carries README, LICENSE (MIT + Commons Clause v1.0), the SemVer policy and the declared supported OpenCode V2 range; installing the packed artifact into a clean OpenCode V2 setup (plugins entry) loads the panel in the host TUI; test/lint/typecheck stay green locally and the CI workflow runs them on the repository remote, with the publish path to the npm artifact configured for a versioned release.

## Plan

1. LICENSE (MIT + Commons Clause v1.0), README (English) with SemVer policy, supported OpenCode V2 range (`@opencode/plugin ^2.0.32`, tested with 2.0.32) and the accepted seroval advisory.
2. `scripts/build.mjs` precompiles `src/` into `dist/` via `@opentui/solid`'s Solid transform and binds `solid-js` and `@opentui/solid` imports to the host runtime (`opentui:runtime-module:*`); `package.json` publishes `dist/` (`exports` -> `./dist/index.js`, `./dist/tui.js`) and `test/package.test.ts` guards the built artifact and tarball.
3. CI (`.github/workflows/ci.yml`) runs lint, typecheck and test; `publish.yml` publishes on a GitHub release tag `vX.Y.Z` with `NPM_TOKEN` and provenance.
4. Create the public repo `Snakeblack/opencode-pr-status-plugin`, push main, and verify that installing the plugin in OpenCode V2 loads and updates the sidebar panel. No npm publish yet.

## Decisions

- Unscoped package name `opencode-pr-status-plugin`; start at 0.1.0.
- Precompile `src/` to `dist/` with host-bound `opentui:runtime-module:*` specifiers for `solid-js` and `@opentui/solid`: OpenCode's runtime plugin only runs the Solid JSX transform outside `node_modules`, and a private `solid-js` copy inside `node_modules` disconnects reactive signals from the host renderer.
- Publish trigger is a GitHub release; the workflow refuses a tag that differs from `package.json` version.
- The critical seroval advisory (via `@opencode/plugin` > `@opentui/solid` > `solid-js`) has no upstream fix: accepted and documented in the README.
- Secondary users (anyone installing the plugin) are in scope, as `docs/product/functional-scope.md` now says.

## Evidence

<!-- ospec:evidence:start -->
- ev-1: check-run for checks-pass (2026-10-17T19:37:09.668Z)
- ev-2: contract-spec-and-test for contract-spec-and-test (2026-10-17T19:37:09.668Z)
- ev-3: frozen-review for trust-review (2026-10-17T19:37:31.172Z)
- ev-4: check-run for checks-pass (2026-10-17T23:13:28.492Z)
- ev-5: migration-test for migration-compat-and-test (2026-10-17T23:14:20.253Z)
- ev-6: check-run for checks-pass (2026-10-17T23:14:23.121Z)
- ev-7: migration-test for migration-compat-and-test (2026-10-17T23:14:54.198Z)
- ev-8: check-run for checks-pass (2026-10-17T23:14:57.065Z)
- ev-9: contract-spec-and-test for contract-spec-and-test (2026-10-17T23:14:57.065Z)
- ev-10: frozen-review for trust-review (2026-10-17T23:17:11.284Z)
- ev-11: check-run for checks-pass (2026-10-17T23:45:42.932Z)
- ev-12: contract-spec-and-test for contract-spec-and-test (2026-10-17T23:45:42.932Z)
- ev-13: migration-test for migration-compat-and-test (2026-10-17T23:45:48.296Z)
- ev-14: living-doc-current for living-doc (2026-10-17T23:45:48.349Z)
<!-- ospec:evidence:end -->
