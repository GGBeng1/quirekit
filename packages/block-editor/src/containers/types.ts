import type { Node as PMNode, Decoration } from "@quirekit/pm";
import type { QuireViewMutationRecord } from "@quirekit/core";

/** Semantic roles shared with the source editor's named containers. */
export type BlockContainerKind = "highlight" | "info" | "note" | "tip" | "important" | "warning" | "danger" | "caution" | "details" | "decision";
/** Theme-aware palette names; document data never stores computed theme colors. */
export type BlockContainerColor = "orange" | "red" | "green" | "blue" | "purple" | "gray";
/** Persistent container presentation, independent of transient disclosure state. */
export interface BlockContainerAttributes {
  /** Content role. */ readonly kind: BlockContainerKind;
  /** Literal title, edited as one explicit command. */ readonly title: string;
  /** Highlight icon; empty means no icon. */ readonly emoji: string;
  /** Highlight surface palette. */ readonly color: BlockContainerColor;
  /** Optional body text palette; null inherits normal document text. */ readonly textColor: BlockContainerColor | null;
}
/** Guarded change to one existing container, preserving its children. */
export interface BlockContainerChange {
  /** Canonical boundary. */ readonly position: number;
  /** Immutable source node captured before opening a control. */ readonly expected: PMNode;
  /** Explicitly changed attributes only. */ readonly attrs: Partial<BlockContainerAttributes>;
}
/** Header projection; body content remains owned by the mounted View. */
export interface BlockContainerState extends BlockContainerAttributes {
  /** Current permission. */ readonly editable: boolean;
  /** Local disclosure state. */ readonly expanded: boolean;
}
/** Stable container NodeView and its provider-preserving header destination. */
export interface BlockContainerSurface {
  /** Shared Prose frame. */ readonly dom: HTMLElement;
  /** Only retained document content. */ readonly contentDOM: HTMLElement;
  /** Framework controls, excluded from document input. */ readonly header: HTMLElement;
  /** @returns Last projected header state. */ snapshot(): BlockContainerState;
  /** @returns Current canonical boundary, or undefined after disposal. */ position(): number | undefined;
  /** Toggles local disclosure without document history. */ toggle(): void;
  /** @param node - Next source. @param decorations - Ancestor selection facts. @returns Whether the view can be retained. */
  update(node: PMNode, decorations: readonly Decoration[]): boolean;
  /** Synchronizes permission without rereading every document node. */ syncEditable(): void;
  /** @param event - Native event. @returns Header input ownership. */ stopEvent(event: Event): boolean;
  /** @param mutation - Native observation. @returns Whether framework or local view state owns it. */ ignoreMutation(mutation: QuireViewMutationRecord): boolean;
  /** Releases the header and invalidates actions. */ destroy(): void;
}
