# 0003. Platform-sourced text is untrusted at the render boundary

- Status: accepted
- Date: 2026-10-17

## Context and drivers

Strings shown by the panel (PR titles, branch names, labels, logins) can be
influenced by other accounts and are not under this project's control.
Rendering happens in a terminal UI where control sequences and markup can
corrupt the layout (`constraint:architecture.trust`,
`scenario:visual-ci-state-legible`).

## Options considered

1. Escape and normalise every platform string at a single render boundary;
   costs discipline on every new field, keeps malformed input harmless.
2. Render raw and trust the source; costs nothing today, risks garbled or
   spoofed panels tomorrow.
3. Reject/filter abnormal strings at parse time; costs a validation policy and
   silently drops legitimate Unicode.

## Decision

All text that originates from the remote platform is treated as untrusted
input and is escaped or normalised at one render boundary before it reaches UI
components; control and markup-bearing sequences never pass through.

## Consequences

Easier: adversarial titles cannot corrupt or spoof the panel; the boundary is
testable in one place. Harder: every new field must flow through the boundary;
some legitimate Unicode needs care. Forbidden: passing raw platform strings
into UI components or logs that interpret sequences.

## Fitness function

Review item (no scaffold yet): a fixture with adversarial titles (ANSI escape
sequences, control characters, wide Unicode) renders escaped output. Once the
scaffold exists, this becomes a `- Check:` unit test.

## Review trigger

Rendering gains a path that interprets markup or terminal sequences, or a new
data source bypasses the boundary.
