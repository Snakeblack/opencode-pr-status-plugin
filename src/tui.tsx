// The CLI entry point OpenCode loads through the package's `./tui` export
// (compiled to `./dist/tui.js` with host-bound Solid runtime imports).

import { Panel } from "./panel";
import { createTuiPlugin } from "./plugin";

export default createTuiPlugin(Panel);
