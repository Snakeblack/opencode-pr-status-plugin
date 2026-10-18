import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PluginContextProvider, type usePlugin } from "@opencode/plugin/tui";
import type { Renderable } from "@opentui/core";
import { testRender } from "@opentui/solid";
import { createComponent } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { ghClient } from "../src/client/gh";
import { Panel } from "../src/panel";

const root = resolve(import.meta.dirname, "..");

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
const hasNativeFfi = nodeMajor >= 26;

type HostContext = ReturnType<typeof usePlugin>;

const fakeTheme = {
  text: {
    faint: "#888888",
    muted: "#666666",
    base: "#ffffff",
    feedback: {
      success: { base: "#00ff00" },
      error: { base: "#ff0000" },
      warning: { base: "#ffaa00" },
    },
  },
};

const fakeContext = { theme: fakeTheme } as unknown as HostContext;

describe("Panel scrollbox and height constraint", () => {
  it("wraps the pull request list in a scrollbox with maxHeight 11", () => {
    const source = readFileSync(resolve(root, "src/panel.tsx"), "utf8");
    expect(source).toMatch(/<scrollbox\s+maxHeight=\{11\}>\s*<For\s+each=\{state\(\)\.prs\}>/);
  });

  it("keeps the header outside the scrollbox so it remains visible while scrolling", () => {
    const source = readFileSync(resolve(root, "src/panel.tsx"), "utf8");
    const headerIndex = source.indexOf("Pull requests");
    const scrollboxIndex = source.indexOf("<scrollbox");
    expect(headerIndex).toBeGreaterThan(-1);
    expect(scrollboxIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeLessThan(scrollboxIndex);
  });

  it.runIf(hasNativeFfi)("renders PR items inside a scrollbox with maxHeight 11 while keeping header outside", async () => {
    vi.spyOn(ghClient, "listOpenPrs").mockResolvedValue({
      ok: true,
      prs: [
        { number: 1, title: "pr 1", branch: "feat/1", draft: false, ci: "green", depth: 0 },
        { number: 2, title: "pr 2", branch: "feat/2", draft: false, ci: "green", depth: 0 },
        { number: 3, title: "pr 3", branch: "feat/3", draft: false, ci: "green", depth: 0 },
        { number: 4, title: "pr 4", branch: "feat/4", draft: false, ci: "green", depth: 0 },
        { number: 5, title: "pr 5", branch: "feat/5", draft: false, ci: "green", depth: 0 },
        { number: 6, title: "pr 6", branch: "feat/6", draft: false, ci: "green", depth: 0 },
      ],
    });

    const setup = await testRender(
      () =>
        createComponent(PluginContextProvider, {
          value: fakeContext,
          get children() {
            return createComponent(Panel, { directory: "/repo" });
          },
        }),
      { width: 40, height: 20 },
    );

    // Allow onMount and promise microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 50));

    const rootChildren = setup.renderer.root.getChildren();
    const panelBox = rootChildren[0];
    expect(panelBox).toBeDefined();

    // The panel root contains the header and other elements
    const panelChildren = panelBox.getChildren();

    // Find the scrollbox child inside the panel
    const scrollBox = panelChildren.find((child: Renderable) => child.constructor.name === "ScrollBoxRenderable");
    expect(scrollBox, "PR rows should be wrapped in a ScrollBoxRenderable").toBeDefined();
    expect(scrollBox?.getMaxHeight()?.value, "scrollbox maxHeight should be 11").toBe(11);

    // The header 'Pull requests' should be outside the scrollbox
    const headerNode = panelChildren.find(
      (child: Renderable) =>
        child.constructor.name !== "ScrollBoxRenderable" &&
        (child as Renderable & { plainText?: string }).plainText?.includes("Pull requests"),
    );
    expect(headerNode, "Header 'Pull requests' should stay outside the scrollbox").toBeDefined();

    setup.renderer.destroy();
  });
});
