// The stack view behind the panel: which open pull requests chain onto another's
// head branch, the order the panel lists them in, and how deep each row sits.
// Chains are matched on the raw branch names exactly as gh reports them; the
// display normalisation stays in aggregate.ts (ADR 0003). Pure and total: any
// shape outside the contract degrades to flat rows instead of throwing.

export interface StackEntry {
  number: number;
  head: string;
  base: string;
}

export interface StackRow {
  entry: StackEntry;
  depth: number;
}

/** Orders pull requests for the panel: every chain under its root (root
 * number position, children base to tip as reported), unrelated rows flat by
 * number. A child attaches to the lowest-numbered head match; empty branch
 * names never match; a looping chain (impossible with real branch ancestry)
 * renders flat rather than nesting. */
export function orderStacks(entries: readonly StackEntry[]): StackRow[] {
  const byNumber = new Map<number, StackEntry>();
  for (const entry of entries) {
    if (!byNumber.has(entry.number)) byNumber.set(entry.number, entry);
  }
  const ordered = [...byNumber.values()].sort((left, right) => left.number - right.number);

  const firstHead = new Map<string, StackEntry>();
  for (const entry of ordered) {
    if (entry.head === "" || firstHead.has(entry.head)) continue;
    firstHead.set(entry.head, entry);
  }

  const parent = new Map<number, StackEntry>();
  for (const entry of ordered) {
    if (entry.base === "") continue;
    const candidate = firstHead.get(entry.base);
    if (candidate !== undefined && candidate.number !== entry.number) parent.set(entry.number, candidate);
  }

  const children = new Map<number, StackEntry[]>();
  for (const entry of ordered) {
    const holder = parent.get(entry.number);
    if (holder === undefined) continue;
    const list = children.get(holder.number);
    if (list === undefined) children.set(holder.number, [entry]);
    else list.push(entry);
  }

  const rows: StackRow[] = [];
  const placed = new Set<number>();
  const emit = (entry: StackEntry, depth: number) => {
    if (placed.has(entry.number)) return;
    placed.add(entry.number);
    rows.push({ entry, depth });
    for (const child of children.get(entry.number) ?? []) emit(child, depth + 1);
  };
  for (const entry of ordered) {
    if (!parent.has(entry.number)) emit(entry, 0);
  }
  // Defensive: rows whose parent chain loops are unreachable from any root.
  // Their relationships are not trustworthy, so they render flat.
  for (const entry of ordered) {
    if (!placed.has(entry.number)) rows.push({ entry, depth: 0 });
  }
  return rows;
}

/** The prefix a stack child's row carries: two columns of indent per level
 * beyond the first and a connector that reads without colour. Roots and
 * standalone rows carry none. */
export function indentPrefix(depth: number): string {
  if (!Number.isInteger(depth) || depth < 1) return "";
  return `${"  ".repeat(depth - 1)}\u2514\u2500 `;
}
