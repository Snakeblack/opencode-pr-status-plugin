import { describe, expect, it } from "vitest";

import { normalizePlatformText } from "../src/domain/safe-text";

describe("normalizePlatformText", () => {
  it("keeps ordinary text and trims around it", () => {
    expect(normalizePlatformText("  fix: handle empty input  ")).toBe("fix: handle empty input");
  });

  it("collapses newlines, tabs and repeated spaces into single spaces", () => {
    expect(normalizePlatformText("feat(ui):\n\tsidebar\t panel")).toBe("feat(ui): sidebar panel");
  });

  it("drops ANSI escape sequences", () => {
    expect(normalizePlatformText("\u001b[31mred\u001b[0m title")).toBe("red title");
  });

  it("drops remaining control characters", () => {
    expect(normalizePlatformText("a\u0000b\u0007c\u009fd")).toBe("a b c d");
  });

  it("drops invisible direction and zero-width controls", () => {
    expect(normalizePlatformText("abc\u202Edef\u200Bghi\u2066jkl\uFEFF")).toBe("abcdefghijkl");
  });

  it("keeps emoji sequences intact", () => {
    expect(normalizePlatformText("ship \u{1F469}\u200D\u{1F4BB} now")).toBe("ship \u{1F469}\u200D\u{1F4BB} now");
  });

  it("returns an empty string for values that are not strings", () => {
    expect(normalizePlatformText(undefined)).toBe("");
    expect(normalizePlatformText(null)).toBe("");
    expect(normalizePlatformText(42)).toBe("");
  });

  it("keeps text at exactly the limit unchanged", () => {
    const exact = "b".repeat(120);
    expect(normalizePlatformText(exact)).toBe(exact);
  });

  it("truncates long text at a character boundary with an ellipsis", () => {
    expect(normalizePlatformText(`${"a".repeat(120)}tail`)).toBe(`${"a".repeat(120)}\u2026`);
  });

  it("never splits a surrogate pair when truncating", () => {
    const result = normalizePlatformText("\u{1F600}".repeat(121));
    expect(Array.from(result).slice(0, -1).join("")).toBe("\u{1F600}".repeat(120));
    expect(result.endsWith("\u2026")).toBe(true);
  });
});
