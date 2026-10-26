import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireChildFlowRoot
} from "@quirekit/layout/child-flow";
import type {
  QuireSubLayoutProjection,
  QuireSubLayoutRootViewProducts
} from "../../sub-layout";
import type { QuireLayoutBox } from "../../types";
import type { QuireTableCellFragment } from "../types";

/** Stable identity shared by every table-cell sub-layout slice summary. */
export interface QuireTableCellSliceIdentity {
  /** Cell fragment id represented by this slice. */
  readonly cellId: string;
  /** Semantic cell id represented by this slice. */
  readonly semanticCellId: string;
  /** Explicit origin cell id represented by this slice. */
  readonly originExplicitCellId: string;
  /** Explicit source cell ids owned by this slice. */
  readonly explicitCellIds: QuireTableCellFragment["explicitCellIds"];
  /** Table-relative ProseMirror position of the origin explicit cell. */
  readonly originCellPos: QuireTableCellFragment["originCellPos"];
  /** Word table grid rectangle occupied by this slice. */
  readonly gridRect: QuireTableCellFragment["gridRect"];
}

/** Options for adapting one table-cell child flow into a sub-layout root. */
export interface CreateQuireTableCellSubLayoutRootOptions {
  /** Table-cell fragment that owns the nested child flow. */
  readonly cell: QuireTableCellFragment;
  /** Child layout box measured for the cell's editable content. */
  readonly childFlowBox: QuireLayoutBox;
  /** Canonical source root whose identity survives page projection. */
  readonly retainedRoot: QuireTableCellSubLayoutRoot;
  /** Stable dependency signature for cell width, style, and table policy inputs. */
  readonly dependencySignature: string;
  /** Parent table row or repeated-header fragment id that places this root. */
  readonly parentId: string;
  /** Optional local layout rectangle override. */
  readonly localRect?: QuireRect | undefined;
}

/** Geometry and View sidecar retained for one table-cell child-flow root. */
export interface QuireTableCellSubLayoutRoot {
  /** Consumer-neutral recursive child-flow root. */
  readonly geometry: QuireChildFlowRoot;
  /** View-owned ownership and source products attached to the root. */
  readonly view: QuireSubLayoutRootViewProducts;
}

/** Lookup table for table-cell sub-layout roots keyed by table-cell fragment id. */
export type QuireTableCellSubLayoutRootMap = ReadonlyMap<
  string,
  QuireTableCellSubLayoutRoot
>;

/** Lookup table for table-cell sub-layout projections keyed by cell fragment id. */
export type QuireTableCellSubLayoutProjectionMap = ReadonlyMap<
  string,
  QuireSubLayoutProjection
>;

/** Options for creating a source-flow table-cell sub-layout projection. */
export interface CreateQuireTableCellSourceSubLayoutProjectionOptions {
  /** Table-cell sub-layout root that owns the source child flow. */
  readonly root: QuireTableCellSubLayoutRoot;
}

/** Options for adapting table-cell sub-layout roots into source-flow projections. */
export interface CreateQuireTableCellSourceSubLayoutProjectionMapOptions {
  /** Table-cell sub-layout roots keyed by source cell id. */
  readonly subLayoutRootByCellId: QuireTableCellSubLayoutRootMap;
}

/** Options for adapting table-cell child flows into sub-layout roots. */
export interface CreateQuireTableCellSubLayoutRootMapOptions {
  /** Table cells that may own nested child flow roots. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Source layout boxes that may contain table-cell child flows. */
  readonly children: readonly QuireLayoutBox[];
  /** Parent table, row, or fragment id that owns the roots. */
  readonly parentId: string;
  /** Optional resolver for page-local or repeated cell ids back to source ids. */
  readonly resolveSourceCellId?: (
    cell: QuireTableCellFragment
  ) => string;
  /** Optional dependency signature factory for produced roots. */
  readonly createDependencySignature?: (
    request: QuireTableCellSubLayoutRootMapDependencySignatureRequest
  ) => string;
  /** Optional dependency signature namespace for the produced roots. */
  readonly dependencySignaturePrefix?: string | undefined;
}

/** Inputs for creating a table-cell sub-layout root map dependency signature. */
export interface QuireTableCellSubLayoutRootMapDependencySignatureRequest {
  /** Table-cell fragment represented by the root. */
  readonly cell: QuireTableCellFragment;
  /** Source cell id used to find the child flow box. */
  readonly sourceCellId: string;
  /** Source child flow box represented by the root. */
  readonly childFlowBox: QuireLayoutBox;
  /** Parent table, row, or fragment id that owns the root. */
  readonly parentId: string;
  /** Optional dependency signature namespace supplied by the caller. */
  readonly dependencySignaturePrefix?: string | undefined;
}
