import type { QuireTableSource } from "@quirekit/layout/table";
import type { Node, Selection } from "@quirekit/pm";
import type { WordTableMap, WordTableSemanticCellRef } from "../map/types";
import type { WordTableStyleRegistry } from "../style/types";

/** Options used to adapt a Word table map into Quire table layout input. */
export interface QuireTableWordMapSourceOptions {
  /** Stable table id within the owning layout snapshot. */
  readonly tableId: string;
  /** Document range represented by the source table node. */
  readonly tableRange: QuireTableSource["tableRange"];
  /** Source `wordTable` ProseMirror node. */
  readonly tableNode: Node;
  /** Derived Word table map for the source table node. */
  readonly tableMap: WordTableMap;
  /** Document table-style registry, when the schema declares one. */
  readonly tableStyleRegistry?: WordTableStyleRegistry | undefined;
  /** Whether the owning imported document uses legacy floating text-edge anchors. */
  readonly legacyFloatingOrigin?: boolean | undefined;
}

/** Word-owned context carried opaquely through the table facet. */
export interface WordTableLayoutContextToken {
  /** Source document used only for bounded ancestor lookup. */
  readonly document: Node;
  /** Effective table-style registry. */
  readonly registry: WordTableStyleRegistry | undefined;
  /** Whether imported legacy table reference semantics apply. */
  readonly legacyOrigin: boolean;
}

/** Document-wide Word table-style authority shaped for a layout engine. */
export interface WordTableLayoutStyleContext {
  /** Opaque Word-owned styles, compatibility policy and document ancestry context. */
  readonly token: unknown;
  /** Registry identity, or null when the document declares none. */
  readonly signature: string | null;
  /** Identity for block caches, or null when no table style can affect layout. */
  readonly blockSignature: string | null;
}

/** Inputs for normalizing one Word table node into layout input. */
export interface WordTableLayoutSourceRequest {
  /** Stable table id within the layout snapshot. */
  readonly tableId: string;
  /** Document range of the table node. */
  readonly tableRange: QuireTableSource["tableRange"];
  /** Source `wordTable` node. */
  readonly tableNode: Node;
  /** Grid map built by `map`. */
  readonly map: unknown;
  /** Document table-style context. */
  readonly styleContext: WordTableLayoutStyleContext;
}

/**
 * Word table semantics shaped for a layout engine's table model.
 *
 * The shape is structural so this package stays independent of any engine;
 * `@quirekit/classic-layout` registers it with the canvas engine.
 */
export interface WordTableLayoutModel {
  /** Node type laid out as a grid table. */
  readonly tableNodeType: string;
  /** Node type of a table cell. */
  readonly cellNodeType: string;
  /** Resolves the document table-style authority. */
  readonly styleContext: (doc: Node) => WordTableLayoutStyleContext;
  /** Derives the Word grid map of a table node. */
  readonly map: (table: Node) => WordTableMap;
  /** Normalizes a table node into renderer-neutral table layout input in CSS pixels. */
  readonly source: (request: WordTableLayoutSourceRequest) => QuireTableSource;
  /** Resolves the paragraph style layer a styled table contributes to the cell at `childPath`. */
  readonly cellStyleLayer: (doc: Node, table: Node, childPath: readonly number[]) => unknown;
  /** Classifies the earliest layout product a changed table, row or cell attribute affects. */
  readonly attributeImpact: (attribute: string) => WordTableAttributeImpact;
  /** Finds the semantic cell whose origin or continuation cell starts at a table-relative position. */
  readonly semanticCellAt: (map: unknown, relativeCellPos: number) => WordTableSemanticCellRef | null;
  /** Reports whether a cell node is a `w:vMerge="continue"` continuation. */
  readonly isContinuationCell: (cell: Node) => boolean;
  /** Creates a `WordTableSelection` over the cells between an anchor and a head cell. */
  readonly createCellSelection: (doc: Node,
    cells: { readonly tablePos: number; readonly anchorCellPos: number; readonly headCellPos: number }) => Selection;
}

/** Earliest layout product affected by a Word table attribute change. */
export type WordTableAttributeImpact = "structure" | "border-style" | "row-layout" | "cell-layout" | "style";
