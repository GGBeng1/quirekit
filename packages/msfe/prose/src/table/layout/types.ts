import type { Text } from "@quirekit/cm-state";
import type { Tree } from "@lezer/common";

/** Explicit bounded layout work for one mounted editor. */
export interface TableLayoutWork {
  /** Actual table width computations, excluding cache hits and scrolling. */
  measurements: number;
  /** Sampled source cells, bounded to 2,048 per table computation. */
  cells: number;
}

/** Immutable width cache; scroll offsets remain a separate mounted concern. */
export interface TableLayoutCache {
  /** Current table start, mapped across edits outside its source. */
  readonly from: number;
  /** Current exclusive table end, used to verify the accepted parse owner. */
  readonly to: number;
  /** Source or font changes require fresh sampling after composition ends. */
  readonly dirty: boolean;
  /** Canonical immutable text identity. */
  readonly doc: Text;
  /** Accepted parse tree identity. */
  readonly tree: Tree;
  /** Font, available width and padding signature. */
  readonly metrics: string;
  /** CSS column properties consumed by native cell marks. */
  readonly style: Readonly<Record<string, string>>;
}

/** Read-phase result; the write phase performs no geometry reads. */
export interface MeasuredTable {
  /** Current source start, local to this mounted document. */
  readonly key: string;
  /** Visible native row elements; never cloned or reparented. */
  readonly rows: readonly HTMLElement[];
  /** Cached width properties. */
  readonly style: Readonly<Record<string, string>>;
}

/** A horizontal offset correction decided before column styles change layout. */
export interface TableScrollCorrection {
  /** Unique physical owner, shared by all rows inside a table wrapper. */
  readonly element: HTMLElement;
  /** Accepted horizontal offset in the owner's native scroll coordinates. */
  readonly left: number;
}

/** One native measurement checkpoint with all layout reads completed. */
export interface TableLayoutMeasurement {
  /** Visible tables and their accepted column widths. */
  readonly tables: readonly MeasuredTable[];
  /** Only owners whose read-phase offset differs from the retained position. */
  readonly scroll: readonly TableScrollCorrection[];
}
