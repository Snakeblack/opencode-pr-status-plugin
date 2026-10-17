import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { aggregateCiState, toPrViews } from "../src/domain/aggregate";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const run = (status: string, conclusion: string) => ({ __typename: "CheckRun", name: "check", status, conclusion });

describe("aggregateCiState", () => {
  it("reads an absent or empty rollup as no checks", () => {
    expect(aggregateCiState([])).toBe("none");
    expect(aggregateCiState(null)).toBe("none");
    expect(aggregateCiState(undefined)).toBe("none");
    expect(aggregateCiState("junk")).toBe("none");
  });

  it("is green when every check completed successfully", () => {
    expect(aggregateCiState([
      run("COMPLETED", "SUCCESS"),
      run("COMPLETED", "SKIPPED"),
      run("COMPLETED", "NEUTRAL"),
      { __typename: "StatusContext", context: "ci/verify", state: "SUCCESS" },
    ])).toBe("green");
  });

  it("is failed on any completed failure", () => {
    for (const conclusion of ["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STALE", ""]) {
      expect(aggregateCiState([run("COMPLETED", conclusion)])).toBe("failed");
      expect(aggregateCiState([run("COMPLETED", "SUCCESS"), run("COMPLETED", conclusion)])).toBe("failed");
    }
  });

  it("is failed when a status context reports a failure or an unknown state", () => {
    expect(aggregateCiState([{ __typename: "StatusContext", context: "ci", state: "FAILURE" }])).toBe("failed");
    expect(aggregateCiState([{ __typename: "StatusContext", context: "ci", state: "ERROR" }])).toBe("failed");
    expect(aggregateCiState([{ __typename: "StatusContext", context: "ci", state: "WHATEVER" }])).toBe("failed");
  });

  it("is running while any check or context is unfinished", () => {
    expect(aggregateCiState([run("IN_PROGRESS", "")])).toBe("running");
    expect(aggregateCiState([run("QUEUED", "")])).toBe("running");
    expect(aggregateCiState([run("COMPLETED", "SUCCESS"), { __typename: "StatusContext", context: "ci", state: "PENDING" }])).toBe("running");
  });

  it("lets a failure win over a still-running check", () => {
    expect(aggregateCiState([run("COMPLETED", "FAILURE"), run("IN_PROGRESS", "")])).toBe("failed");
  });

  it("reads a failure without a status as failed", () => {
    expect(aggregateCiState([{ __typename: "CheckRun", name: "x", conclusion: "FAILURE" }])).toBe("failed");
    expect(aggregateCiState([{ status: "COMPLETED", conclusion: "FAILURE" }])).toBe("failed");
  });

  it("ignores entries that carry no usable signal", () => {
    expect(aggregateCiState([{}, null, "x", 7])).toBe("none");
    expect(aggregateCiState([{}, run("COMPLETED", "SUCCESS")])).toBe("green");
  });
});

describe("toPrViews", () => {
  it("maps a recorded real gh response", () => {
    const views = toPrViews(JSON.parse(fixture("pr-list.json")));
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ number: 356, branch: "fix/docs-dx-corrections", draft: false, ci: "running" });
    expect(views[0]?.title.length).toBeGreaterThan(0);
  });

  it("maps the constructed edge cases and sorts by number", () => {
    const views = toPrViews(JSON.parse(fixture("rollup-edge-cases.json")));
    expect(views.map((view) => [view.number, view.ci, view.draft])).toEqual([
      [101, "green", false],
      [102, "failed", false],
      [103, "running", true],
      [104, "running", false],
      [105, "none", false],
      [106, "failed", false],
      [107, "failed", false],
      [108, "failed", false],
      [109, "failed", false],
    ]);
  });

  it("groups a chained capture under its root with depths", () => {
    const views = toPrViews(JSON.parse(fixture("chained-prs.json")));
    expect(views.map((view) => [view.number, view.depth, view.ci])).toEqual([
      [199, 0, "green"],
      [201, 0, "green"],
      [202, 1, "running"],
      [203, 2, "failed"],
      [205, 1, "none"],
    ]);
  });

  it("sorts rows by pull request number ascending", () => {
    const rows = [
      { number: 30, title: "c", headRefName: "c", isDraft: false, statusCheckRollup: [] },
      { number: 10, title: "a", headRefName: "a", isDraft: false, statusCheckRollup: [] },
      { number: 20, title: "b", headRefName: "b", isDraft: false, statusCheckRollup: [] },
    ];
    expect(toPrViews(rows).map((view) => view.number)).toEqual([10, 20, 30]);
  });

  it("drops rows without a usable number and keeps the rest", () => {
    const views = toPrViews([
      {},
      "junk",
      null,
      { number: 0 },
      { number: -3 },
      { number: 1.5 },
      { number: Number.NaN },
      { number: "42" },
      { number: 7, title: "kept", headRefName: "kept" },
    ]);
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ number: 7, title: "kept", branch: "kept", draft: false, ci: "none" });
  });

  it("normalises platform text and coerces missing fields", () => {
    const views = toPrViews([
      { number: 5, title: "fix:\n\u001b[31mred\u202E", headRefName: " feat/x ", isDraft: "yes" },
      { number: 6 },
    ]);
    expect(views[0]).toMatchObject({ number: 5, title: "fix: red", branch: "feat/x", draft: false, ci: "none" });
    expect(views[1]).toMatchObject({ number: 6, title: "", branch: "", draft: false, ci: "none" });
  });

  it("returns no views for a value that is not an array", () => {
    expect(toPrViews(null)).toEqual([]);
    expect(toPrViews(undefined)).toEqual([]);
    expect(toPrViews({ number: 1 })).toEqual([]);
    expect(toPrViews("[]")).toEqual([]);
  });
});
