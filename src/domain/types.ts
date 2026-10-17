/** The aggregated CI state of one pull request, as the panel shows it. */
export type CiState = "green" | "failed" | "running" | "none";

/** One pull request as the panel renders it, after normalisation. */
export interface PrView {
  number: number;
  title: string;
  branch: string;
  draft: boolean;
  ci: CiState;
  /** Position in its stack: 0 for a root or standalone row, 1+ for a child. */
  depth: number;
}
