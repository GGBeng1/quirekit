import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableMap, WordTableSemanticCellRef } from "../../../map";
import type { WordTableBorder, WordTableBorders } from "../../../types";
import type { OrthogonalBorderName } from "./topology";

/** One canonical grid-unit edge, independent of viewport or pagination. */
export interface BorderGridSegment {
  /** Orientation of the physical line. */
  readonly axis: "horizontal" | "vertical";
  /** Grid boundary on the perpendicular axis. */
  readonly line: number;
  /** Unit offset along the line. */
  readonly offset: number;
}

/** Highest source authority on one semantic cell side of a unit edge. */
export interface BorderFormatCandidate {
  /** Semantic owner whose direct border can receive the patch. */
  readonly cell: WordTableSemanticCellRef;
  /** Physical edge of that owner. */
  readonly edge: OrthogonalBorderName;
  /** Complete original border; unedited properties must survive. */
  readonly border: WordTableBorder;
  /** Existing cell, row, outer-table or inside authority tier. */
  readonly priority: number;
}

/** Immutable, once-per-command source indexes used by existing-edge planning. */
export interface BorderFormatSource {
  /** Repaired source table. */
  readonly table: PMNode;
  /** Canonical semantic map. */
  readonly map: WordTableMap;
  /** Origin-cell direct borders indexed by semantic owner. */
  readonly direct: ReadonlyMap<string, WordTableBorders | null>;
  /** Whether a metadata-free legacy table uses the grid fallback. */
  readonly legacy: boolean;
}

/** Complete-edge contributions collected before any source node is changed. */
export interface BorderFormatPatch {
  /** One representative source candidate. */
  readonly candidate: BorderFormatCandidate;
  /** Complete tuple after applying the requested properties. */
  readonly border: WordTableBorder;
  /** Unit offsets covered by the selected physical edges. */
  readonly offsets: Set<number>;
  /** Whether every covered unit has the same resulting tuple. */
  uniform: boolean;
  /** Whether at least one unit needs the requested property patch. */
  changed: boolean;
}
