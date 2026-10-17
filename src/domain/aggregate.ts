// Turns the local client's JSON into what the panel renders: one aggregated
// CI state per pull request, and the pull request rows themselves. Pure and
// total: any shape outside the contract degrades instead of throwing.
// Platform text passes through the ADR 0003 boundary here, once.

import { normalizePlatformText } from "./safe-text";
import type { CiState, PrView } from "./types";

const OK_CONCLUSIONS = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);

type CheckSignal = "ok" | "running" | "failed";

// A completed check run is a pass only for the benign conclusions; anything
// else completed (including an empty or unknown conclusion) counts as failed.
function checkRunSignal(entry: Record<string, unknown>): CheckSignal | null {
  const { status, conclusion } = entry;
  const completed =
    status === "COMPLETED" || (typeof status !== "string" && typeof conclusion === "string" && conclusion !== "");
  if (!completed) {
    return typeof status === "string" || typeof conclusion === "string" ? "running" : null;
  }
  return typeof conclusion === "string" && OK_CONCLUSIONS.has(conclusion) ? "ok" : "failed";
}

// Legacy status contexts: only SUCCESS passes, only PENDING runs, everything
// else (FAILURE, ERROR, unknown) fails.
function contextSignal(entry: Record<string, unknown>): CheckSignal | null {
  const { state } = entry;
  if (typeof state !== "string") return null;
  if (state === "SUCCESS") return "ok";
  if (state === "PENDING") return "running";
  return "failed";
}

function entrySignal(entry: unknown): CheckSignal | null {
  if (entry === null || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  if (record.__typename === "StatusContext") return contextSignal(record);
  if (record.__typename === "CheckRun") return checkRunSignal(record);
  if (typeof record.state === "string" && !("status" in record)) return contextSignal(record);
  if ("status" in record || "conclusion" in record) return checkRunSignal(record);
  return null;
}

/** The whole rollup in one state: a failure wins over everything, then a
 * running check, then all-pass; an empty rollup is "none". */
export function aggregateCiState(rollup: unknown): CiState {
  if (!Array.isArray(rollup)) return "none";
  let running = false;
  let ok = false;
  for (const entry of rollup) {
    const signal = entrySignal(entry);
    if (signal === "failed") return "failed";
    if (signal === "running") running = true;
    if (signal === "ok") ok = true;
  }
  if (running) return "running";
  if (ok) return "green";
  return "none";
}

/** Maps raw `gh pr list` rows into renderable views, numbered ascending.
 * Rows without a usable positive integer number are dropped. */
export function toPrViews(rows: unknown): PrView[] {
  if (!Array.isArray(rows)) return [];
  const views: PrView[] = [];
  for (const row of rows) {
    if (row === null || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const { number } = record;
    if (typeof number !== "number" || !Number.isInteger(number) || number <= 0) continue;
    views.push({
      number,
      title: normalizePlatformText(record.title),
      branch: normalizePlatformText(record.headRefName),
      draft: record.isDraft === true,
      ci: aggregateCiState(record.statusCheckRollup),
    });
  }
  return views.sort((left, right) => left.number - right.number);
}
