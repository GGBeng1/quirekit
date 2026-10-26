import type {
  WordDocumentTopologyRevisionKind,
  WordRevisionCompoundMembership,
  WordNodePropertyRevisionKind,
  WordNodeRevisionKind,
  WordRevisionIdentity,
  WordStructuralRevisionKind
} from "./identity";

/** Shared insertion/deletion identity stored on one complete node owner. */
export interface WordNodeRevisionAttrs extends WordRevisionIdentity {
  /** Exact whole-node operation pending review. */
  readonly kind: WordNodeRevisionKind;
  /** Ordered member index inside one atomic root operation. */
  readonly memberIndex: number;
  /** Complete member count inside one atomic root operation. */
  readonly memberCount: number;
  /** Exact schema node type expected at the carrier position. */
  readonly nodeType: string;
  /** Optional durable membership when this node belongs to a compound side. */
  readonly compound?: WordRevisionCompoundMembership | null | undefined;
}

/** Reversible feature-owned property history stored on one structural node. */
export interface WordNodePropertyRevisionAttrs extends WordRevisionIdentity {
  /** Feature property family whose current endpoint owns layout. */
  readonly kind: WordNodePropertyRevisionKind;
  /** Complete canonical direct properties before the first tracked mutation. */
  readonly before: Readonly<Record<string, unknown>>;
  /** Complete canonical direct properties after the latest tracked mutation. */
  readonly after: Readonly<Record<string, unknown>>;
  /** Stable sorted leaf paths whose endpoint values differ. */
  readonly changedFields: readonly string[];
}

/** Reversible feature-owned topology history stored on the document owner. */
export interface WordDocumentTopologyRevisionAttrs extends WordRevisionIdentity {
  /** Shared carrier category understood by the revision core. */
  readonly kind: WordDocumentTopologyRevisionKind;
  /** Exact installed contribution that owns topology semantics. */
  readonly ownerId: string;
  /** Owner-defined topology family. */
  readonly topologyKind: string;
  /** Positive version of the owner topology contract. */
  readonly topologyVersion: number;
  /** Complete canonical topology endpoint before the tracked mutation. */
  readonly before: Readonly<Record<string, unknown>>;
  /** Complete canonical current topology endpoint. */
  readonly after: Readonly<Record<string, unknown>>;
  /** Stable sorted leaf paths whose endpoint values differ. */
  readonly changedFields: readonly string[];
}

/** Shared identity and membership for one reversible structural owner. */
interface WordStructuralRevisionAttrsBase extends WordRevisionIdentity {
  /** Exact structural operation whose pending owner remains in All Markup. */
  readonly kind: WordStructuralRevisionKind;
  /** Number of explicit structural members validated for this atomic owner. */
  readonly memberCount: number;
}

/** Reversible row insertion/deletion stored on one complete row. */
export interface WordRowStructuralRevisionAttrs
  extends WordStructuralRevisionAttrsBase {
  /** Exact row structural operation. */
  readonly kind: "table-row-insertion" | "table-row-deletion";
}

/** Proven row-edge gap route for one interior isolated-cell action. */
export type WordCellInsertDeleteRoute = "shift-leading" | "shift-trailing";

/** Reversible isolated-cell or column action stored on each affected cell. */
export interface WordCellInsertDeleteStructuralRevisionAttrs
  extends WordStructuralRevisionAttrsBase {
  /** Exact cell marker direction emitted by OOXML. */
  readonly kind: "table-cell-insertion" | "table-cell-deletion";
  /** Whether the member is an isolated cell or one complete column action. */
  readonly structuralScope: "cell" | "column";
  /** First affected grid column in the prior/current table authority. */
  readonly gridFrom: number;
  /** Positive affected grid-column count. */
  readonly gridSpan: number;
  /** Table row count used to prove complete rectangular membership. */
  readonly tableRowCount: number;
  /** Grid widths before the authored action, in canonical dxa units. */
  readonly beforeColumns: readonly number[];
  /** Grid widths after the authored action, in canonical dxa units. */
  readonly afterColumns: readonly number[];
  /** Optional proven row-local route for one interior isolated cell. */
  readonly cellRoute?: WordCellInsertDeleteRoute | undefined;
}

/** One canonical role in a tracked vertical-merge chain. */
export type WordTableVerticalMergeRevisionRole = "restart" | "continue" | null;

/** Reversible vertical merge or split stored on every direct chain cell. */
export interface WordVerticalCellMergeStructuralRevisionAttrs
  extends WordStructuralRevisionAttrsBase {
  /** Fixed vertical merge/split discriminator. */
  readonly kind: "table-cell-merge";
  /** Fixed vertical-chain scope. */
  readonly structuralScope: "vertical-merge";
  /** Zero-based member index in direct row order. */
  readonly memberIndex: number;
  /** First grid column shared by the complete chain. */
  readonly gridFrom: number;
  /** Positive grid-column count shared by the complete chain. */
  readonly gridSpan: number;
  /** Owning table row count used for stale-state validation. */
  readonly tableRowCount: number;
  /** Complete merge-role vector before the tracked operation. */
  readonly beforeMergeRoles: readonly WordTableVerticalMergeRevisionRole[];
  /** Complete current merge-role vector after the tracked operation. */
  readonly afterMergeRoles: readonly WordTableVerticalMergeRevisionRole[];
  /** Exact prior direct-cell snapshots for locally authored routing changes. */
  readonly beforeCellSnapshots?: readonly Readonly<Record<string, unknown>>[] | undefined;
  /** Exact current direct-cell snapshots paired with the prior snapshots. */
  readonly afterCellSnapshots?: readonly Readonly<Record<string, unknown>>[] | undefined;
}

/** Reversible horizontal merge or split stored on every current row member. */
export interface WordHorizontalCellMergeStructuralRevisionAttrs
  extends WordStructuralRevisionAttrsBase {
  /** Fixed horizontal merge/split discriminator. */
  readonly kind: "table-cell-merge";
  /** Fixed row-fragment scope. */
  readonly structuralScope: "horizontal-merge";
  /** Whether the pending command merges or splits the row fragment. */
  readonly direction: "merge" | "split";
  /** Zero-based member index in the current All Markup row fragment. */
  readonly memberIndex: number;
  /** Direct row index used for stale-owner validation. */
  readonly rowIndex: number;
  /** First grid column covered by the complete fragment. */
  readonly gridFrom: number;
  /** Positive grid-column count covered by the complete fragment. */
  readonly gridSpan: number;
  /** Owning table row count used for stale-owner validation. */
  readonly tableRowCount: number;
  /** Exact carrier-free cells before a locally authored operation. */
  readonly beforeCellSnapshots?: readonly Readonly<Record<string, unknown>>[] | undefined;
  /** Exact local after cells paired with the prior snapshots. */
  readonly afterCellSnapshots?: readonly Readonly<Record<string, unknown>>[] | undefined;
}

/** Reversible vertical or horizontal cell merge/split carrier. */
export type WordCellMergeStructuralRevisionAttrs =
  | WordVerticalCellMergeStructuralRevisionAttrs
  | WordHorizontalCellMergeStructuralRevisionAttrs;

/** Reversible cell, column, or vertical-merge action. */
export type WordCellStructuralRevisionAttrs =
  | WordCellInsertDeleteStructuralRevisionAttrs
  | WordCellMergeStructuralRevisionAttrs;

/** Reversible feature-owned structure action stored on one structural owner. */
export type WordStructuralRevisionAttrs =
  | WordRowStructuralRevisionAttrs
  | WordCellStructuralRevisionAttrs;

/** Strict result for a nullable array of structural node-property carriers. */
export interface WordNodePropertyRevisionListResult {
  /** Valid immutable carriers in source order. */
  readonly revisions: readonly WordNodePropertyRevisionAttrs[];
  /** Number of rejected array members, or one for a malformed non-array value. */
  readonly invalidCount: number;
}

/** Strict result for the shared nullable document-topology carrier array. */
export interface WordDocumentTopologyRevisionListResult {
  /** Valid immutable carriers in source order. */
  readonly revisions: readonly WordDocumentTopologyRevisionAttrs[];
  /** Number of rejected array members, or one for a malformed non-array value. */
  readonly invalidCount: number;
}
