import type { QuireRect } from "@quirekit/renderer";

/** Source-backed block occurrence independent of DOM hit priority. */
export interface QuireBlockGeometryFragment {
  /** Complete source node start. */
  readonly from: number;
  /** Complete source node end. */
  readonly to: number;
  /** Exact retained occurrence. */
  readonly occurrenceId: string;
  /** Document-space rectangle. */
  readonly rect: QuireRect;
  /** Logical start boundary is present. */
  readonly first: boolean;
  /** Logical end boundary is present. */
  readonly last: boolean;
}
