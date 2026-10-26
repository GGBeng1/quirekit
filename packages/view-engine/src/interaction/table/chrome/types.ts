import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableSizing } from "@quirekit/layout/table";
import type { QuireLayoutNode } from "../../../layout";
import type { QuireSelectionGeometryContext } from "../../types";

/** Semantic affordances emitted by the headless Table chrome model. */
export type QuireTableChromeAnchorKind =
  | "row-bar"
  | "column-bar"
  | "table-corner"
  | "insert-row"
  | "insert-column"
  | "resize-row"
  | "resize-column"
  | "menu";

/** One page-local Table affordance in document-space coordinates. */
export interface QuireTableChromeAnchor {
  /** Stable identity within the owning table fragment. */
  readonly id: string;
  /** Semantic affordance represented by this anchor. */
  readonly kind: QuireTableChromeAnchorKind;
  /** Document-space geometry represented by the affordance. */
  readonly rect: QuireRect;
  /** Absolute ProseMirror position immediately before the table node. */
  readonly tablePos: number;
  /** Optional zero-based source row addressed by the affordance. */
  readonly rowIndex?: number | undefined;
  /** Optional zero-based grid column addressed by the affordance. */
  readonly columnIndex?: number | undefined;
  /** Optional zero-based insertion boundary before an axis item. */
  readonly boundaryIndex?: number | undefined;
  /** Semantic cells covered by this affordance in stable layout order. */
  readonly semanticCellIds: readonly string[];
}

/** One transient missing-border guide in document-space coordinates. */
export interface QuireTableChromeGuide {
  /** Stable identity within the owning Table fragment. */
  readonly id: string;
  /** Physical guide orientation used by the product overlay. */
  readonly orientation: "horizontal" | "vertical";
  /** Zero-thickness document-space line rectangle. */
  readonly rect: QuireRect;
}

/** Headless Table chrome for one page-local visual fragment. */
export interface QuireTableChromeFragment {
  /** Stable page-local fragment identity. */
  readonly fragmentId: string;
  /** Document-space table bounds for this visual occurrence. */
  readonly tableRect: QuireRect;
  /** Editor-only guides for cell edges without effective border paint. */
  readonly guides: readonly QuireTableChromeGuide[];
  /** Whole-table selection affordance. */
  readonly corner: QuireTableChromeAnchor;
  /** Source-row affordances in visual fragment order. */
  readonly rows: readonly QuireTableChromeAnchor[];
  /** Grid-column affordances in physical track order. */
  readonly columns: readonly QuireTableChromeAnchor[];
  /** Insertion affordances for every row and column boundary. */
  readonly insertions: readonly QuireTableChromeAnchor[];
  /** Trailing-edge row and column resize affordances. */
  readonly resizes: readonly QuireTableChromeAnchor[];
  /** Stable toolbar anchor for this fragment. */
  readonly menu: QuireTableChromeAnchor;
}

/** Structural Table selection facts optionally projected into chrome state. */
export interface QuireTableSelectionChrome {
  /** Structural selection mode. */
  readonly mode: "cell" | "row" | "column" | "table";
  /** Zero-based first selected row. */
  readonly startRow: number;
  /** Number of selected rows. */
  readonly rowSpan: number;
  /** Zero-based first selected grid column. */
  readonly startColumn: number;
  /** Number of selected grid columns. */
  readonly columnSpan: number;
}

/** In-progress resize facts reserved by the headless Table chrome contract. */
export interface QuireTableResizeSession {
  /** Axis controlled by the captured resize gesture. */
  readonly axis: "row" | "column";
  /** Zero-based source row or grid-column index being resized. */
  readonly index: number;
  /** Preview delta in document-space CSS pixels. */
  readonly delta: number;
}

/** Headless Table chrome shared by every visual fragment of one semantic table. */
export interface QuireTableChromeModel {
  /** Unscaled, complete source-flow sizing shared by all visual fragments. */
  readonly sizing?: QuireTableSizing | undefined;
  /** Stable semantic table identity retained by layout. */
  readonly tableId: string;
  /** Absolute ProseMirror position immediately before the table node. */
  readonly tablePos: number;
  /** Fragment selected by retained visual-instance context. */
  readonly activeFragmentId: string;
  /** Page-local visual occurrences in stable layout order. */
  readonly fragments: readonly QuireTableChromeFragment[];
  /** Optional structural selection projection. */
  readonly selection: QuireTableSelectionChrome | null;
  /** Optional captured resize projection. */
  readonly resizeSession: QuireTableResizeSession | null;
}

/** Inputs used to derive headless Table chrome from retained layout. */
export interface BuildQuireTableChromeModelOptions {
  /** Retained layout roots to search. */
  readonly nodes: readonly QuireLayoutNode[];
  /** Absolute ProseMirror position immediately before the target table node. */
  readonly tablePos: number;
  /** Canonical position used to select the active visual fragment. */
  readonly activePosition: number;
  /** Retained context used to disambiguate repeated visual occurrences. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
  /** Optional structural selection state supplied by the feature owner. */
  readonly selection?: QuireTableSelectionChrome | null | undefined;
  /** Optional captured resize state supplied by the interaction owner. */
  readonly resizeSession?: QuireTableResizeSession | null | undefined;
}
