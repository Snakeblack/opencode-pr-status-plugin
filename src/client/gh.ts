// ADR 0001: everything GitHub-related goes through the user's local `gh`
// client, invoked as a child process. The plugin holds no credentials and
// makes no direct network calls. This module is the one place that talks to
// that process, and the one that turns its failures into panel states.

import { execFile } from "node:child_process";

import { toPrViews } from "../domain/aggregate";
import type { PrView } from "../domain/types";

export type GhErrorKind = "missing" | "unauthenticated" | "offline" | "rate-limited" | "error";

export type GhResult =
  | { ok: true; prs: PrView[] }
  | { ok: false; kind: GhErrorKind; message: string };

export interface GhExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type GhExec = (command: string, args: string[], options: { cwd: string }) => Promise<GhExecResult>;

export interface GhClient {
  listOpenPrs(directory: string): Promise<GhResult>;
}

const PR_LIST_ARGS = [
  "pr",
  "list",
  "--state",
  "open",
  "--limit",
  "50",
  "--json",
  "number,title,headRefName,isDraft,statusCheckRollup",
];

const RATE_LIMIT = /rate limit/i;
const UNAUTHENTICATED = /bad credentials|gh auth login|authentication|401/i;
const OFFLINE = /error connecting|dial tcp|no such host|network|connection refused|timeout/i;

function firstLine(text: string): string {
  const line = text
    .split("\n")
    .map((row) => row.trim())
    .find((row) => row !== "");
  return line ?? "";
}

function classifyFailure(stderr: string, exitCode: number): { kind: GhErrorKind; message: string } {
  const message = firstLine(stderr) || `gh exited with code ${exitCode}`;
  if (RATE_LIMIT.test(stderr)) return { kind: "rate-limited", message };
  if (UNAUTHENTICATED.test(stderr)) return { kind: "unauthenticated", message };
  if (OFFLINE.test(stderr)) return { kind: "offline", message };
  return { kind: "error", message };
}

function classifyRejection(error: unknown): { kind: GhErrorKind; message: string } {
  const record = (error ?? {}) as { code?: unknown; killed?: unknown; message?: unknown };
  const message = typeof record.message === "string" && record.message !== "" ? record.message : "gh could not be started";
  if (record.code === "ENOENT") return { kind: "missing", message };
  if (record.killed === true) return { kind: "offline", message };
  return { kind: "error", message };
}

export function createGhClient(exec: GhExec): GhClient {
  return {
    async listOpenPrs(directory) {
      let outcome: GhExecResult;
      try {
        outcome = await exec("gh", PR_LIST_ARGS, { cwd: directory });
      } catch (error) {
        return { ok: false, ...classifyRejection(error) };
      }
      if (outcome.exitCode !== 0) {
        return { ok: false, ...classifyFailure(outcome.stderr, outcome.exitCode) };
      }
      let raw: unknown;
      try {
        raw = JSON.parse(outcome.stdout);
      } catch {
        return { ok: false, kind: "error", message: "gh returned output that is not JSON" };
      }
      if (!Array.isArray(raw)) {
        return { ok: false, kind: "error", message: "gh returned a JSON document that is not a pull request list" };
      }
      return { ok: true, prs: toPrViews(raw) };
    },
  };
}

// --- the production binding: the one place a child process is spawned ------

function childEnvironment(): NodeJS.ProcessEnv {
  // git's own messages follow the user's locale; gh's do not. Pinning the
  // child environment keeps every diagnostic readable and stable.
  return { ...process.env, LC_ALL: "C", LANG: "C" };
}

function defaultExec(command: string, args: string[], { cwd }: { cwd: string }): Promise<GhExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { cwd, env: childEnvironment(), timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && typeof (error as { code?: unknown }).code === "number") {
          resolve({ stdout, stderr, exitCode: (error as { code: number }).code });
        } else if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr, exitCode: 0 });
        }
      },
    );
  });
}

/** The client the panel uses: reads through the user's authenticated gh. */
export const ghClient: GhClient = createGhClient(defaultExec);
