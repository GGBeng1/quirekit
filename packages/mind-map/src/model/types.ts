import type { MindMapNodeStyle } from "../formatting/types";
import type { MindMapTopicDetails } from "../details/types";
import type { MindMapAnnotation } from "../annotations/types";

/** Layouts admitted by the renderer-independent schema. */
export type MindMapLayout = "mind-map" | "logical-right" | "logical-left" | "organization" | "timeline";

/** A persistent node; transient selection and measured geometry are excluded. */
export interface MindMapNode {
  /** Unique, stable document-local identity. */
  readonly id: string;
  /** Literal Unicode text, including line breaks. */
  readonly text: string;
  /** Whether descendants are hidden without deleting them. The root stays expanded. */
  readonly collapsed: boolean;
  /** Ordered descendants, including collapsed content. */
  readonly children: readonly MindMapNode[];
  /** Optional direction of a direct child of the root. */
  readonly side?: "left" | "right";
  /** Explicit formatting, admitted from document version 3. */
  readonly style?: MindMapNodeStyle;
  /** Optional node content, admitted from document version 5. */
  readonly details?: MindMapTopicDetails;
}

/** The portable source of truth shared by every editor host. */
export interface MindMapDocument {
  /** QuireKit format version, independent of the rendering library version. */
  readonly version: 1 | 2 | 3 | 4 | 5 | 6;
  /** Host revision, incremented only by a successful atomic save. */
  readonly revision: number;
  /** Arrangement of the tree. */
  readonly layout: MindMapLayout;
  /** Single root with stable identities throughout its ordered subtree. */
  readonly root: MindMapNode;
  /** Independent trees, required from version 2 and absent in version 1. */
  readonly floatingTopics?: readonly MindMapFloatingTopic[];
  /** Semantic objects, required from version 4 and absent in earlier versions. */
  readonly annotations?: readonly MindMapAnnotation[];
}

/** Unscaled coordinates relative to the main root's top-left corner. */
export interface MindMapPoint {
  /** Horizontal coordinate in CSS pixels. */ readonly x: number;
  /** Vertical coordinate in CSS pixels. */ readonly y: number;
}

/** A separately positioned tree with no canonical parent. */
export interface MindMapFloatingTopic {
  /** Root and all retained descendants. */ readonly root: MindMapNode;
  /** Position independent of the current viewport. */ readonly position: MindMapPoint;
  /** Common growth direction for this tree. */ readonly side: "left" | "right";
}

/** A derived SVG preview; never a replacement for the editable document. */
export interface MindMapSnapshot {
  /** Exact canonical source captured with the vector image, before host revision changes. */
  readonly source: string;
  /** Complete SVG markup generated from the admitted plain-text model. */
  readonly svg: string;
  /** Natural width in CSS pixels, independent of host zoom. */
  readonly width: number;
  /** Natural height in CSS pixels, independent of host zoom. */
  readonly height: number;
  /** Source host revision; unsaved drafts may share this revision. */
  readonly revision: number;
}
