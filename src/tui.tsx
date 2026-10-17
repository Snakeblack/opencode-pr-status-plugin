// The CLI entry point OpenCode loads through the package's `./tui` export.

import { Panel } from "./panel";
import { createTuiPlugin } from "./plugin";

export default createTuiPlugin(Panel);
