# 0002. The plugin owns no persisted state

- Status: accepted
- Date: 2026-10-17

## Context and drivers

The remote platform is the source of truth for the data the panel shows
(`constraint:architecture.data`). The maintainer is solo and favours a low
operational surface (`constraint:business.constraints`). Failures must degrade
to messages rather than stale local state (`scenario:panel-resilience`).

## Options considered

1. Memory-only: fetched data lives for the session and is re-fetched on open;
   costs a network round-trip at every start, owns nothing on disk.
2. On-disk cache for fast startup: gives instant first paint; costs cache
   invalidation, file-format versioning and corruption recovery.
3. Local database: gives query flexibility; costs a dependency, migrations and
   backup questions.

## Decision

The plugin persists no state of its own; any fetched data lives in memory for
the session only. Durable UI preferences, if ever needed, are delegated to the
host's plugin storage and remain host-owned.

## Consequences

Easier: no migrations, no recovery, no backup, no data-ownership questions.
Harder: every start re-fetches; the panel needs a network path (through the
local client) before showing state. Forbidden: writing cache or settings files
under the plugin's own paths without a superseding decision.

## Fitness function

Review item (no scaffold yet): the plugin performs no filesystem writes and
stores nothing host-side (with the optional exception of host-owned UI
preferences). A unit test with a mocked host will assert no storage calls once
the scaffold exists.

## Review trigger

A quality scenario requires state to survive restarts (e.g. offline start must
show last-known CI state).
