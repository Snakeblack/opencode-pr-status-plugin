import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")

function jsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) return jsFiles(path)
    return entry.name.endsWith(".js") ? [path] : []
  })
}

// The published entrypoints live in dist/, which is generated. Every test in
// this file reads the real build, so build it once up front.
beforeAll(() => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root, stdio: "pipe" })
}, 60_000)

function readManifest(): {
  version: string
  exports: Record<string, string | Record<string, string>>
} {
  return JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
}

function entrypaths(value: string | Record<string, string>): string[] {
  if (typeof value === "string") return [value]
  return Object.values(value)
}

describe("package metadata", () => {
  it("keeps every published entrypoint present", () => {
    const manifest = readManifest()
    const entries = Object.values(manifest.exports).flatMap(entrypaths)

    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(existsSync(resolve(root, entry)), `${entry} is missing`).toBe(true)
    }
  })

  it("has a release version", () => {
    const manifest = readManifest()
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe("host runtime binding", () => {
  // The host applies its reactive Solid transform only outside node_modules,
  // and a package plugin runs from node_modules. So the package ships JS
  // already compiled for Solid, with solid-js and @opentui/solid bound to the
  // host's own runtime modules. A private copy of either would leave the
  // panel's signals disconnected from the host renderer: it loads, then never
  // repaints.
  const files = () => jsFiles(resolve(root, "dist"))

  it("builds one JS file per source module", () => {
    const names = files().map((file) => file.slice(resolve(root, "dist").length + 1))
    for (const expected of ["index.js", "tui.js", "panel.js", "plugin.js"]) {
      expect(names, `dist/${expected} is missing`).toContain(expected)
    }
  })

  it("leaves no JSX or TypeScript syntax in the build", () => {
    for (const file of files()) {
      const code = readFileSync(file, "utf8")
      expect(code, `${file} still has TypeScript type annotations`).not.toMatch(/:\s*(string|number|boolean)\b[,)=]/)
      expect(code, `${file} still has JSX`).not.toMatch(/<(box|text)[\s>]/)
    }
  })

  it("binds solid-js and @opentui/solid to the host runtime, never to a bare import", () => {
    const panel = readFileSync(resolve(root, "dist/panel.js"), "utf8")

    expect(panel).toMatch(/from "opentui:runtime-/)
    for (const file of files()) {
      const code = readFileSync(file, "utf8")
      expect(code, `${file} imports solid-js directly`).not.toMatch(/from "solid-js(\/[a-z]+)?"/)
      expect(code, `${file} imports @opentui/solid directly`).not.toMatch(/from "@opentui\/solid(\/[a-z-]+)?"/)
    }
  })
})

describe("npm tarball", () => {
  function packedPaths(): string[] {
    const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: root,
      encoding: "utf8",
    })
    const [report] = JSON.parse(output) as [{ files: { path: string }[] }]
    return report.files.map((file) => file.path)
  }

  it(
    "ships the build and the documents users read",
    () => {
      const paths = packedPaths()
      for (const expected of ["dist/index.js", "dist/tui.js", "dist/panel.js", "README.md", "LICENSE"]) {
        expect(paths, `${expected} is not in the tarball`).toContain(expected)
      }
    },
    20_000,
  )

  it(
    "keeps development-only files out of the tarball",
    () => {
      const paths = packedPaths()
      const leaked = paths.filter(
        (path) =>
          path.startsWith("src/") ||
          path.startsWith("scripts/") ||
          path.startsWith("test/") ||
          path.startsWith("docs/") ||
          path.startsWith("idd/") ||
          path.startsWith(".github/") ||
          path === "tsconfig.json",
      )
      expect(leaked, `development files leaked into the tarball: ${leaked.join(", ")}`).toEqual([])
    },
    20_000,
  )
})
