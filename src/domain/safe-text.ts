// ADR 0003: every string that originates from the remote platform is
// normalised at this single render boundary before it reaches a UI component.
// Titles and branch names arrive from the platform, so control characters,
// invisible direction overrides and runaway length are handled here, once.

// biome-ignore-all lint/suspicious/noControlCharactersInRegex: matching control characters is this boundary's purpose

const ANSI_ESCAPE = /\u001b\[[0-9;?]*[A-Za-z]/g;
const INVISIBLE_DIRECTION = /[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const WHITESPACE_RUN = /\s+/g;

// Matches the panel's readable width; the UI does not truncate on its own.
const MAX_LENGTH = 120;

export function normalizePlatformText(value: unknown): string {
  if (typeof value !== "string") return "";
  const stripped = value
    .replace(ANSI_ESCAPE, "")
    .replace(INVISIBLE_DIRECTION, "")
    .replace(CONTROL, " ");
  const collapsed = stripped.replace(WHITESPACE_RUN, " ").trim();
  const characters = Array.from(collapsed);
  if (characters.length <= MAX_LENGTH) return collapsed;
  return `${characters.slice(0, MAX_LENGTH).join("")}\u2026`;
}
