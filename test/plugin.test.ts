import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { createTuiPlugin } from "../src/plugin";

function panelRecorder() {
  const calls: Array<{ directory: string }> = [];
  const Panel = (props: { directory: string }) => {
    calls.push(props);
    return null;
  };
  return { Panel, calls };
}

function fakeHost({
  location,
  defaultLocation,
}: {
  location: { directory: string } | null | undefined;
  defaultLocation: { directory: string };
}) {
  const unregister = vi.fn();
  const slot = vi.fn((_options: { append?: string; render: (input: { sessionID: string }) => unknown }) => unregister);
  const context = {
    location,
    data: { location: { default: () => defaultLocation } },
    ui: { slot },
  };
  return { context, slot, unregister };
}

type HostContext = Parameters<ReturnType<typeof createTuiPlugin>["setup"]>[0];
const asHostContext = (context: object) => context as unknown as HostContext;

// The host contract types `setup` as possibly async; this plugin's setup is
// synchronous, so the safe drive is wrapped once here.
function setupHost(plugin: ReturnType<typeof createTuiPlugin>, context: object): () => void {
  const cleanup = plugin.setup(asHostContext(context)) as unknown as (() => void | Promise<void>) | undefined;
  return () => {
    void cleanup?.();
  };
}

function renderPanel(slot: ReturnType<typeof fakeHost>["slot"], recorder: ReturnType<typeof panelRecorder>) {
  const options = slot.mock.calls[0]?.[0];
  createRoot((dispose) => {
    options?.render({ sessionID: "ses_probe" });
    dispose();
  });
  return recorder.calls;
}

describe("createTuiPlugin", () => {
  it("registers the sidebar panel slot and returns its unregistration", () => {
    const { Panel } = panelRecorder();
    const plugin = createTuiPlugin(Panel);
    expect(plugin.id).toBe("opencode-pr-status");

    const host = fakeHost({ location: { directory: "/repo" }, defaultLocation: { directory: "/fallback" } });
    const stop = setupHost(plugin, host.context);

    expect(host.slot).toHaveBeenCalledTimes(1);
    expect(host.slot.mock.calls[0]?.[0]).toMatchObject({ append: "sidebar.content", render: expect.any(Function) });

    stop();
    expect(host.unregister).toHaveBeenCalledTimes(1);
  });

  it("renders the panel with the directory of the current location", () => {
    const recorder = panelRecorder();
    const host = fakeHost({ location: { directory: "/repo" }, defaultLocation: { directory: "/fallback" } });
    setupHost(createTuiPlugin(recorder.Panel), host.context);

    expect(renderPanel(host.slot, recorder)).toEqual([{ directory: "/repo" }]);
  });

  it("falls back to the default location when none is current", () => {
    const recorder = panelRecorder();
    const host = fakeHost({ location: null, defaultLocation: { directory: "/default-repo" } });
    setupHost(createTuiPlugin(recorder.Panel), host.context);

    expect(renderPanel(host.slot, recorder)).toEqual([{ directory: "/default-repo" }]);
  });
});
