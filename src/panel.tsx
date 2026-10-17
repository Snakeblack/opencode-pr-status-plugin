/** @jsxImportSource @opentui/solid */
// The sidebar panel: the current project's open pull requests, grouped by
// stack, each with its aggregated CI state. It reads through the local gh
// client on a timer while it is mounted, keeps the last good list when a
// refresh fails, and shows a clear message instead of breaking the TUI.

import { usePlugin } from "@opencode/plugin/tui";
import { For, Show, createSignal, onCleanup, onMount, type Accessor } from "solid-js";

import { ghClient, type GhErrorKind } from "./client/gh";
import { indentPrefix } from "./domain/stacks";
import type { CiState, PrView } from "./domain/types";
import type { PanelProps } from "./plugin";
import { createRefresher } from "./refresh";

const REFRESH_INTERVAL_MS = 30_000;

// Distinct shapes, so the state reads without relying on colour.
const STATE_MARK: Record<CiState, string> = {
  green: "\u25CF", // ●
  failed: "\u2716", // ✖
  running: "\u25D0", // ◐
  none: "\u25CB", // ○
};

const FAILURE_COPY: Record<GhErrorKind, string> = {
  missing: "GitHub CLI (gh) not found. Install it to read pull requests.",
  unauthenticated: "gh is not authenticated. Run `gh auth login`.",
  offline: "Cannot reach GitHub. Check your connection.",
  "rate-limited": "GitHub API rate limit reached. Retrying on the next refresh.",
  error: "Could not read pull requests.",
};

// Failures that pass on their own: shown as a warning, not as an error.
const TRANSIENT: ReadonlySet<GhErrorKind> = new Set(["offline", "rate-limited"]);

type PanelState =
  | { readonly status: "loading"; readonly prs: readonly PrView[] }
  | { readonly status: "ready"; readonly prs: readonly PrView[] }
  | { readonly status: "failed"; readonly prs: readonly PrView[]; readonly kind: GhErrorKind; readonly message: string };

type PanelFailure = Extract<PanelState, { readonly status: "failed" }>;

function failureText(failure: { kind: GhErrorKind; message: string }): string {
  const copy = FAILURE_COPY[failure.kind];
  if (failure.kind !== "error" || failure.message === "") return copy;
  return `${copy} (${failure.message})`;
}

function PullRequestRow(props: { readonly pr: PrView }) {
  const context = usePlugin();
  const theme = context.theme;
  const markColor = () => {
    switch (props.pr.ci) {
      case "green":
        return theme.text.feedback.success.base;
      case "failed":
        return theme.text.feedback.error.base;
      case "running":
        return theme.text.feedback.warning.base;
      default:
        return theme.text.faint;
    }
  };
  // The branch line sits under its row's mark: the child's one-line title is
  // clipped, so long text never pushes the stack shape apart.
  const branchAlign = () => " ".repeat(indentPrefix(props.pr.depth).length);

  return (
    <box flexDirection="column">
      <text wrapMode="none" truncate>
        <span style={{ fg: theme.text.faint }}>{indentPrefix(props.pr.depth)}</span>
        <span style={{ fg: markColor() }}>
          {STATE_MARK[props.pr.ci]}{" "}
        </span>
        <span style={{ fg: theme.text.muted }}>#{props.pr.number} </span>
        <span style={{ fg: theme.text.base }}>{props.pr.title}</span>
        <span style={{ fg: theme.text.faint }}>{props.pr.draft ? " (draft)" : ""}</span>
      </text>
      <Show when={props.pr.branch !== ""}>
        <text fg={theme.text.faint} wrapMode="word">
          {`${branchAlign()}${props.pr.branch}`}
        </text>
      </Show>
    </box>
  );
}

export function Panel(props: PanelProps) {
  const context = usePlugin();
  const [state, setState] = createSignal<PanelState>({ status: "loading", prs: [] });

  const read = async () => {
    const result = await ghClient.listOpenPrs(props.directory);
    setState((previous) =>
      result.ok
        ? { status: "ready", prs: result.prs }
        : { status: "failed", prs: previous.prs, kind: result.kind, message: result.message },
    );
  };

  onMount(() => {
    const refresher = createRefresher({
      intervalMs: REFRESH_INTERVAL_MS,
      task: read,
      onError: () =>
        setState((previous) => ({
          status: "failed",
          prs: previous.prs,
          kind: "error",
          message: "",
        })),
    });
    refresher.start();
    onCleanup(() => refresher.stop());
  });

  const failure = () => {
    const current = state();
    return current.status === "failed" ? current : undefined;
  };
  const empty = () => state().status === "ready" && state().prs.length === 0;

  return (
    <box flexDirection="column">
      <text fg={context.theme.text.faint}>Pull requests</text>
      <Show when={state().status === "loading"}>
        <text fg={context.theme.text.muted} wrapMode="word">
          Loading pull requests…
        </text>
      </Show>
      <Show when={failure()}>
        {(current: Accessor<PanelFailure>) => (
          <text
            fg={
              TRANSIENT.has(current().kind)
                ? context.theme.text.feedback.warning.base
                : context.theme.text.feedback.error.base
            }
            wrapMode="word"
          >
            {failureText(current())}
          </text>
        )}
      </Show>
      <Show when={empty()}>
        <text fg={context.theme.text.muted}>No open pull requests.</text>
      </Show>
      <For each={state().prs}>{(pr) => <PullRequestRow pr={pr} />}</For>
    </box>
  );
}
