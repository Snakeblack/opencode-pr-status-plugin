// Compiles src/ to dist/ for publishing.
//
// OpenCode applies its reactive Solid transform only to files outside
// node_modules, and an installed package plugin runs from node_modules. So the
// package ships JS that is already compiled for Solid, with solid-js and the
// @opentui/solid modules bound to the host's own runtime modules. A private
// copy of either would leave this plugin's signals disconnected from the host
// renderer: the panel would load, then never repaint.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = join(root, "src")
const outDir = join(root, "dist")

// The host registers these modules under ids of this form; importing one binds
// to the host's instance. test/package.test.ts guards the shape of the result.
const RUNTIME_MODULE_PREFIX = "opentui:runtime-module:"
const HOST_BOUND_MODULES = new Set([
  "@opentui/solid",
  "@opentui/solid/components",
  "@opentui/solid/jsx-runtime",
  "@opentui/solid/jsx-dev-runtime",
  "solid-js",
  "solid-js/store",
])

const runtimeModuleId = (specifier) => `${RUNTIME_MODULE_PREFIX}${encodeURIComponent(specifier)}`

const { transformSolidSource } = await import(
  pathToFileURL(join(root, "node_modules/@opentui/solid/scripts/solid-transform.js")).href
)

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : []
  })
}

rmSync(outDir, { recursive: true, force: true })

for (const file of sourceFiles(srcDir)) {
  const code = await transformSolidSource(readFileSync(file, "utf8"), {
    filename: file,
    moduleName: runtimeModuleId("@opentui/solid"),
    resolvePath: (specifier) => (HOST_BOUND_MODULES.has(specifier) ? runtimeModuleId(specifier) : null),
  })
  const target = join(outDir, relative(srcDir, file)).replace(/\.tsx?$/, ".js")
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, code)
}
