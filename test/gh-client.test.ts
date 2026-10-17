import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { createGhClient, type GhExec } from "../src/client/gh";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const succeed = (stdout: string): GhExec => async () => ({ stdout, stderr: "", exitCode: 0 });
const fail = (stderr: string, exitCode = 1): GhExec => async () => ({ stdout: "", stderr, exitCode });

const GH_ARGS = [
  "pr",
  "list",
  "--state",
  "open",
  "--limit",
  "50",
  "--author",
  "@me",
  "--json",
  "number,title,headRefName,baseRefName,isDraft,statusCheckRollup",
];

describe("createGhClient", () => {
  it("reads the user's own open pull requests with a single gh call", async () => {
    const exec = vi.fn(succeed(fixture("pr-list.json")));
    const result = await createGhClient(exec).listOpenPrs("/repo");

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith("gh", GH_ARGS, { cwd: "/repo" });
    expect(result).toEqual({
      ok: true,
      prs: [expect.objectContaining({ number: 356, ci: "running" })],
    });
  });

  it("reads an empty list as success, not as a failure", async () => {
    const result = await createGhClient(succeed(fixture("pr-list-empty.json"))).listOpenPrs("/repo");
    expect(result).toEqual({ ok: true, prs: [] });
  });

  it("classifies a missing client", async () => {
    const exec: GhExec = async () => {
      throw Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" });
    };
    const result = await createGhClient(exec).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "missing" });
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });

  it("classifies an unauthenticated client from the recorded output", async () => {
    const result = await createGhClient(fail(fixture("gh-unauth.txt"))).listOpenPrs("/repo");
    expect(result).toEqual({
      ok: false,
      kind: "unauthenticated",
      message: "HTTP 401: Bad credentials (https://api.github.com/graphql)",
    });
  });

  it("classifies a rate limit", async () => {
    const result = await createGhClient(fail(fixture("gh-rate-limit.txt"))).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "rate-limited" });
    if (!result.ok) expect(result.message).toContain("rate limit");
  });

  it("classifies an offline failure", async () => {
    const result = await createGhClient(fail(fixture("gh-offline.txt"))).listOpenPrs("/repo");
    expect(result).toEqual({ ok: false, kind: "offline", message: "error connecting to api.github.com" });
  });

  it("classifies a killed client as offline", async () => {
    const exec: GhExec = async () => {
      throw Object.assign(new Error("gh timed out"), { killed: true, signal: "SIGTERM" });
    };
    const result = await createGhClient(exec).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "offline" });
  });

  it("keeps an unknown failure as a generic error with its first line", async () => {
    const result = await createGhClient(fail(fixture("gh-not-a-repo.txt"))).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "error" });
    if (!result.ok) expect(result.message).toContain("failed to run git");
  });

  it("treats unreadable JSON as a generic error", async () => {
    const result = await createGhClient(succeed("{not json")).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "error" });
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });

  it("treats a JSON document that is not a list as a generic error", async () => {
    const result = await createGhClient(succeed("{}")).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "error" });
  });

  it("reports a failure with an empty stderr by its exit code", async () => {
    const result = await createGhClient(fail("", 9)).listOpenPrs("/repo");
    expect(result).toMatchObject({ ok: false, kind: "error" });
    if (!result.ok) expect(result.message).toContain("9");
  });
});
