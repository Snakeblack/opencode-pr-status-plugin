import { defineConfig } from "vitest/config";
import { resolveNodeSolidRuntimeImport, transformSolidSource } from "./node_modules/@opentui/solid/scripts/solid-transform.js";

export default defineConfig({
  plugins: [
    {
      name: "opentui-solid",
      enforce: "pre",
      async transform(code, id) {
        if (id.endsWith(".tsx")) {
          return await transformSolidSource(code, {
            filename: id,
            moduleName: "@opentui/solid",
            resolvePath: resolveNodeSolidRuntimeImport,
          });
        }
      },
    },
  ],
});
