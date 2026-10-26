import type { DecorationSet } from "@quirekit/cm-view";
import type { MsfeNodeViewSpec, MsfeSourceRange } from "../types";

/** Measured source-node dimensions retain codec identity, without mounted DOM, resources or another document model. */
export interface NodeHeight extends MsfeSourceRange {
  /** Confirmed native node kind. */
  readonly name: string;
  /** Codec used to invalidate semantic dependencies such as reference destinations. */
  readonly spec: MsfeNodeViewSpec;
  /** Exact semantic fingerprint at measurement time. */
  readonly source: string;
  /** Wrapper height in client CSS pixels, or zero to remove a previous reservation. */
  readonly height: number;
  /** Wrapper's computed inline alignment. */
  readonly alignment: string;
}

/** One accepted content-width generation and its measured node dimensions. */
export interface NodeGeometry {
  /** Content width in client CSS pixels. */
  readonly width: number;
  /** Only nodes actually measured during this document lifetime. */
  readonly entries: readonly NodeHeight[];
  /** Direct layout reservations, suppressed while their source is exposed. */
  readonly decorations: DecorationSet;
}

/** Coalesced measurements from a single DOM read phase. */
export interface NodeGeometryUpdate {
  /** Current content width; a change invalidates older dimensions. */
  readonly width: number;
  /** New or changed measurements, never all document nodes. */
  readonly entries: readonly NodeHeight[];
}
