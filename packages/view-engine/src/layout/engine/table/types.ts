import type {
  QuireTableCellBlockFlowContent,
  QuireTableCellBlockFlowLayout,
  QuireTableCellGeometry,
  QuireTableCellInlineMetrics,
  QuireTableGeometrySnapshot,
  QuireTableLayoutInput,
  QuireTableRowGeometry,
  QuireTableSourceCell,
  QuireTableSource
} from "@quirekit/layout/table";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireBlockLayoutInput } from "../block-types";

/** Identity shared by recursive content inputs for one semantic table cell. */
interface QuireTableCellContentInputBase {
  /** Semantic table cell id represented by the content inputs. */
  readonly semanticCellId: string;
  /** Exact source identity required for retained cell measurement reuse. */
  readonly sourceIdentity?: object | undefined;
  /** Retained intrinsic inline metrics used by auto-fit grid dependencies. */
  readonly inlineMetrics?: QuireTableCellInlineMetrics | undefined;
}

/** Recursive block input authority owned by one semantic table cell. */
export type QuireTableCellContentInput = QuireTableCellContentInputBase
  & QuireTableCellBlockFlowContent<QuireBlockLayoutInput>;

/** Feature-owned table source and recursive cell content. */
export interface QuireTableBlockInput {
  /** Normalized source consumed by the neutral table geometry kernel. */
  readonly source: QuireTableSource;
  /** Recursive cell content keyed by semantic cell id. */
  readonly cellContent: readonly QuireTableCellContentInput[];
}

/** View adapter input that measures recursive block content for neutral geometry. */
export interface QuireTableViewLayoutInput extends Omit<
  QuireTableLayoutInput,
  "measureContent"
> {
  /**
   * Measures recursive View block content for one resolved cell content box.
   *
   * @param cell - Normalized semantic cell whose content is being measured.
   * @param contentRect - Final cell content rectangle in document coordinates.
   * @returns Measured height and recursive View block inputs.
   */
  readonly measureContent: (
    cell: QuireTableSourceCell,
    contentRect: QuireRect
  ) => QuireTableCellBlockFlowLayout<QuireBlockLayoutInput>;
}

/** Page-projected row fragment extending neutral row geometry. */
export interface QuireTableRowFragment extends QuireTableRowGeometry {
  /** Whether this row is a visual repeated header on a continuation page. */
  readonly isRepeatedHeader?: boolean | undefined;
}

/** Page-projected cell fragment extending neutral cell geometry. */
export interface QuireTableCellFragment extends QuireTableCellGeometry {
  /** Cell-local content-flow top accepted by this fragment. */
  readonly cellSourceFlowY?: number | undefined;
  /** Cell-local content-flow height accepted by this fragment. */
  readonly cellSourceFlowHeight?: number | undefined;
  /** Recursive child blocks measured inside the content rectangle. */
  readonly contentChildren: readonly QuireBlockLayoutInput[];
  /** Whether this cell is a visual repeated header on a continuation page. */
  readonly isRepeatedHeader?: boolean | undefined;
}

/** Table-specific hit target emitted by the View table adapter. */
export interface QuireTableHitTarget {
  /** Stable hit-target id. */
  readonly id: string;
  /** Hit-target kind. */
  readonly kind: "cell";
  /** Stable table id. */
  readonly tableId: string;
  /** Semantic cell id represented by the target. */
  readonly semanticCellId: string;
  /** Explicit origin cell id represented by the target. */
  readonly originExplicitCellId: string;
  /** Explicit source cell ids owned by the target. */
  readonly explicitCellIds: readonly string[];
  /** Source-relative position of the origin explicit cell. */
  readonly originCellPos: number;
  /** Document range represented by the target. */
  readonly range: QuireDocumentRange;
  /** Hit rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Whether the hit target belongs to a repeated header fragment. */
  readonly isRepeatedHeader?: boolean | undefined;
}

/** View-owned table snapshot with recursive content and interaction products. */
export interface QuireTableLayoutSnapshot extends QuireTableGeometrySnapshot {
  /** Stable page-local fragment id used for View product identity. */
  readonly fragmentId: string;
  /** Page-projected rows in visual order. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Page-projected cells in source order. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Table hit targets generated for editor interaction. */
  readonly hitTargets: readonly QuireTableHitTarget[];
  /** Optional out-of-flow placement retained for page projection. */
  readonly floating?: QuireTableSource["floating"];
}
