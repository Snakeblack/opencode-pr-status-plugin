import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) return tsxFiles(path)
    return entry.name.endsWith(".tsx") ? [path] : []
  })
}

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

describe("host transpilation", () => {
  // The host transpiles the shipped .tsx sources itself. Outside this
  // repository there is no tsconfig to carry `jsxImportSource`, so every
  // TSX file must declare the Solid runtime with a per-file pragma or the
  // host falls back to React and the load fails.
  it("declares the Solid JSX runtime in every shipped TSX file", () => {
    const files = tsxFiles(resolve(root, "src"))

    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const head = readFileSync(file, "utf8").slice(0, 200)
      expect(head, `${file} is missing the @jsxImportSource pragma`).toContain(
        "@jsxImportSource @opentui/solid",
      )
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
    "ships the plugin source and the documents users read",
    () => {
      const paths = packedPaths()
      for (const expected of ["src/index.ts", "src/tui.tsx", "README.md", "LICENSE"]) {
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
