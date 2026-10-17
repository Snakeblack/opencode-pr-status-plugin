// The package's server entry point. This plugin has no server-side behaviour:
// the CLI entry in ./tui owns everything. OpenCode loads both entries when the
// package is configured, so this one stays an explicit, empty contract.

import { Plugin } from "@opencode/plugin";

export default Plugin.define({
  id: "opencode-pr-status.server",
  setup() {},
});
