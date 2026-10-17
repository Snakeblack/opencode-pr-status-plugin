import { describe, expect, it } from "vitest";

import { indentPrefix, orderStacks } from "../src/domain/stacks";

type RawEntry = [number, string, string];

const entries = (list: RawEntry[]) => list.map(([number, head, base]) => ({ number, head, base }));
const shape = (result: ReturnType<typeof orderStacks>) => result.map((row) => [row.entry.number, row.depth]);

describe("orderStacks", () => {
  it("keeps unrelated pull requests flat, by number", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [30, "c", "main"],
            [10, "a", "main"],
            [20, "b", "main"],
          ]),
        ),
      ),
    ).toEqual([
      [10, 0],
      [20, 0],
      [30, 0],
    ]);
  });

  it("nests a chain under its root, base to tip", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [3, "feat/c", "feat/b"],
            [1, "feat/a", "main"],
            [2, "feat/b", "feat/a"],
          ]),
        ),
      ),
    ).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
  });

  it("keeps every child of one head together, by number", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [1, "feat/a", "main"],
            [9, "feat/c", "feat/a"],
            [4, "feat/b", "feat/a"],
          ]),
        ),
      ),
    ).toEqual([
      [1, 0],
      [4, 1],
      [9, 1],
    ]);
  });

  it("places a group at its root's number and pulls in lower-numbered children", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [10, "feat/a", "main"],
            [4, "feat/child", "feat/a"],
            [3, "fix/x", "main"],
          ]),
        ),
      ),
    ).toEqual([
      [3, 0],
      [10, 0],
      [4, 1],
    ]);
  });

  it("attaches a child to the lowest-numbered pull request with its base head", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [3, "feat/a", "main"],
            [2, "feat/a", "other"],
            [7, "feat/c", "feat/a"],
          ]),
        ),
      ),
    ).toEqual([
      [2, 0],
      [7, 1],
      [3, 0],
    ]);
  });

  it("leaves a pull request alone when no open head matches its base", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [1, "feat/a", "gone"],
            [2, "feat/b", "main"],
          ]),
        ),
      ),
    ).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  it("never uses an empty head as a parent nor an empty base as a child", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [3, "y", ""],
            [2, "", "x"],
            [1, "", ""],
          ]),
        ),
      ),
    ).toEqual([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it("matches branch names exactly, before normalisation", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [1, "feat/a", "main"],
            [2, "feat/b", " feat/a "],
          ]),
        ),
      ),
    ).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  it("shows a looping chain flat instead of nesting it", () => {
    expect(
      shape(
        orderStacks(
          entries([
            [1, "dev", "feat"],
            [2, "feat", "dev"],
          ]),
        ),
      ),
    ).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  it("ignores a pull request that claims its own head as base", () => {
    expect(shape(orderStacks(entries([[5, "x", "x"]])))).toEqual([[5, 0]]);
  });
});

describe("indentPrefix", () => {
  it("marks children with an indent and a connector, roots without", () => {
    expect(indentPrefix(0)).toBe("");
    expect(indentPrefix(1)).toBe("\u2514\u2500 ");
    expect(indentPrefix(2)).toBe("  \u2514\u2500 ");
    expect(indentPrefix(3)).toBe("    \u2514\u2500 ");
    expect(indentPrefix(-1)).toBe("");
  });
});
