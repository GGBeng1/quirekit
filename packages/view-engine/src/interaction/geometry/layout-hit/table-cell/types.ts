import type { QuirePoint } from "@quirekit/renderer";
import type {
  QuireLayoutNode,
  QuireTableHitTarget,
  QuireTableLayoutSnapshot
} from "../../../../layout";
import type { QuireLayoutSnapshot } from "../../../../editor-layout";
import type { QuireTableRowOffsetSlotHit } from "../../../types";

/** Options used to resolve a table-cell structural hit from layout geometry. */
export interface QuireTableCellLayoutHitOptions {
  /** Layout snapshot whose table hit targets should be tested. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to test against retained table-cell targets. */
  readonly point: QuirePoint;
  /** Deepest normal layout node found at the point before table-specific mapping. */
  readonly candidateNode: QuireLayoutNode | null;
  /** Optional table-cell target already resolved by exact or nearest geometry. */
  readonly tableTarget?: QuireTableHitTarget | undefined;
}

/** Options used to retain nearest-cell ownership inside table border geometry. */
export interface QuireNearestTableCellHitTargetOptions {
  /** Shallow retained-layout candidates covering the pointer point. */
  readonly candidateNodes: readonly QuireLayoutNode[];
  /** Document-space point crossing table-owned border or spacing geometry. */
  readonly point: QuirePoint;
}

/** Row-offset slot hit plus the table snapshot that owns it. */
export interface QuireTableRowOffsetSlotLayoutHit {
  /** Table snapshot that owns the row-offset slot. */
  readonly table: QuireTableLayoutSnapshot;
  /** Row-offset slot found in the table snapshot. */
  readonly slot: QuireTableRowOffsetSlotHit;
}

/** Options used to map a row-offset slot to an adjacent real cell. */
export interface QuireTableRowOffsetSlotCaretOptions {
  /** Layout snapshot whose indexed candidates can refine the caret position. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Table snapshot that owns the slot and target cell. */
  readonly table: QuireTableLayoutSnapshot;
  /** Row-offset slot being mapped. */
  readonly slot: QuireTableRowOffsetSlotHit;
  /** Original document-space pointer point. */
  readonly point: QuirePoint;
}
