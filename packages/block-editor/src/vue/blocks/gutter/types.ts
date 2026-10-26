/** Current gutter geometry, measured without modifying document content. */
export interface BlockRailGeometry {
  /** Handle's right edge in client CSS pixels. */
  readonly x: number;
  /** First-line or atomic-block control center in client CSS pixels. */
  readonly y: number;
  /** Unique mounted heading control ID, used by the chrome-owned hover rule. */
  readonly disclosure?: string;
  /** Original content edge for traversing controls reserved by a table or column. */
  readonly contentEdge?: number;
}
