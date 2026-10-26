import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireKitTreeNode } from "@quirekit/ui";
import type { ClassicEditorRenderContext } from "@classic/types";

/** Flat heading fact collected from the canonical document. */
export interface ClassicEditorOutlineEntry {
  /** Product occurrence identity, independent of its current position. */
  readonly id: string;
  /** Visible heading text. */
  readonly label: string;
  /** One-based document outline level. */
  readonly level: number;
  /** Absolute position immediately before the source node. */
  readonly position: number;
}

/** One heading found under a summarized node. */
export interface ClassicEditorOutlineHeadingSummary {
  /** Heading node, used for occurrence identity. */
  readonly node: ProseMirrorNode;
  /** Position relative to the summarized node's content start. */
  readonly offset: number;
  /** One-based document outline level. */
  readonly level: number;
  /** Heading text, possibly empty. */
  readonly label: string;
}

/** Hierarchical presentation and its separately updated navigation lookup. */
export interface ClassicEditorOutlineTree {
  /** Structurally shared root nodes in document order. */
  readonly nodes: readonly QuireKitTreeNode[];
  /** Current source positions indexed by occurrence id. */
  readonly positions: ReadonlyMap<string, number>;
  /** Branch ids that default to expanded when first introduced. */
  readonly defaultExpandedValue: readonly string[];
}

/** A heading occurrence mapped through accepted PM transactions. */
export interface ClassicEditorOutlineOccurrence {
  /** Unique identity within the mounted outline lifecycle. */
  readonly id: string;
  /** Position before the node's opening token. */
  readonly from: number;
  /** Position after the node's closing token. */
  readonly to: number;
}

/** Reactive product input retained by the outline mount. */
export interface ClassicEditorOutlinePanelState {
  /** Current editor, localization and extension-owned style context. */
  context: ClassicEditorRenderContext;
}

/** Assigns identity to one classified node occurrence.
 * @param node - Current canonical node at the occurrence.
 * @param position - Absolute position before that node.
 * @returns Product-owned stable occurrence id.
 */
export type ClassicEditorOutlineIdentityResolver = (node: ProseMirrorNode, position: number) => string;
