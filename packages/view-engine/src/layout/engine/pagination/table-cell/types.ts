import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireTableCellSliceIdentity,
  QuireTableCellSubLayoutProjectionMap
} from "../../table/sub-layout";
import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../table";

/** Text fragments owned by one table cell while measuring one table row. */
export interface QuireTableCellRowTextSlice
  extends QuireTableCellSliceIdentity {
  /** Editable source range represented by the cell content. */
  readonly range: QuireTableCellFragment["range"];
  /** Cell content rectangle used as the nested text ownership band. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
  /** Text fragments whose baselines belong to both the row and the cell. */
  readonly fragments: readonly QuireTextFragment[];
}

/** One visual text line owned by a table cell while measuring one table row. */
export interface QuireTableCellRowLineSlice
  extends QuireTableCellSliceIdentity {
  /** Editable source range represented by the owning cell content. */
  readonly cellRange: QuireTableCellFragment["range"];
  /** Cell content rectangle used as the nested text ownership band. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
  /** Document position at the start of the visual line. */
  readonly from: number;
  /** Document position at the end of the visual line. */
  readonly to: number;
  /** Top coordinate in infinite-flow view space. */
  readonly top: number;
  /** Bottom coordinate in infinite-flow view space. */
  readonly bottom: number;
}

/** Inputs used to derive row-owned text from table-cell sub-layout projections. */
export interface QuireTableCellRowSubLayoutProjectionInput {
  /** Source row whose visual band is being measured. */
  readonly row: QuireTableRowFragment;
  /** Table cells that may visually cover the row. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Table-cell sub-layout projections keyed by source cell id. */
  readonly subLayoutProjectionByCellId: QuireTableCellSubLayoutProjectionMap;
}
