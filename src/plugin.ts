// The plugin's host wiring: register the sidebar panel and unregister it when
// the plugin is disposed. The panel component is injected so this module stays
// JSX-free and the host contract is smoke-tested without rendering.

import { Plugin } from "@opencode/plugin/tui";
import { createComponent, type Component } from "solid-js";

export interface PanelProps {
  directory: string;
}

export type PanelComponent = Component<PanelProps>;

export function createTuiPlugin(Panel: PanelComponent) {
  return Plugin.define({
    id: "opencode-pr-status",
    setup(context) {
      // The docs' pattern: the current location, or the default one. Reads
      // stay pinned to it for the lifetime of the plugin instance.
      const location = context.location ?? context.data.location.default();
      const unregister = context.ui.slot({
        append: "sidebar.content",
        render: () => createComponent(Panel, { directory: location.directory }),
      });
      return () => unregister();
    },
  });
}
