# 0001. External reads go through a user-authenticated local client

- Status: accepted
- Date: 2026-10-17

## Context and drivers

The panel needs remote development-platform data (pull requests, checks).
Credentials already exist on the developer's machine, managed by a
command-line client the developer installed and authenticated. The plugin runs
inside the host TUI with user-level privileges and must keep a small
operational surface, and failures must degrade to clear messages
(`constraint:architecture.trust`, `scenario:panel-resilience`). It must show
fresh CI state (`scenario:fresh-ci-state`).

## Options considered

1. Invoke the user's already-authenticated local command-line client as a child
   process: gives credential reuse and zero secret storage; costs a process
   spawn per read and depends on the client being installed.
2. Call the platform's HTTP API directly with a token the plugin stores: gives
   lower latency and no extra dependency; costs credential handling, storage
   and rotation inside the plugin, plus its own auth flow.
3. Run a small companion service that owns access: gives a single connection
   and a caching point; costs an extra process, its lifecycle and its own
   update channel.

## Decision

External reads are delegated to a user-installed, locally authenticated
command-line client invoked as a child process; the plugin holds no
credentials, signs nothing, and performs no direct network calls.

## Consequences

Easier: credential handling (none), auth flows (none), onboarding (the
developer's client is already logged in). Harder: latency and throughput are
bounded by process spawn; the plugin depends on the client's JSON output shape,
which can change between client versions. Forbidden: reading token files,
storing secrets, calling the platform API directly.

## Fitness function

Review item (no scaffold yet): the plugin source contains no HTTP client to
the platform and no credential read; every platform read execs the local
client. Once the scaffold exists, this becomes a `- Check:` command (source
scan + dependency check).

## Review trigger

A required capability is not available through the local client, or spawn
latency breaks `scenario:fresh-ci-state`.
