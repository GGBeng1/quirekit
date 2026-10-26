import type { Editor } from "@quirekit/core";
import type { EditorState, Node } from "@quirekit/pm";

/** List families understood by the continuous document product. */
export type BlockListKind = "bullet" | "ordered" | "task";
/** One product-neutral contextual list action. */
export interface BlockListMarkerAction {
  /** Stable action identity. */
  readonly id: string;
  /** Accessible menu label. */
  readonly label: string;
  /** Whether the captured canonical target can accept this action. */
  readonly disabled: boolean;
  /** @returns Whether the exact captured target changed. */
  readonly execute: () => boolean;
}
/** Mapped marker identity emitted by an optional list renderer. */
export interface BlockListMarkerMenuDetail {
  /** Current paragraph position before its opening token. */
  readonly position: number;
}
/** Schema-neutral installed preset projection. */
export interface BlockListPreset {
  /** Canonical preset identifier. */
  readonly value: string;
  /** Accessible preset name. */
  readonly label: string;
  /** Single-level or multilevel gallery. */
  readonly scope: string;
  /** Gallery family; tasks have a direct toggle. */
  readonly kind: "bullet" | "ordered";
  /** Three resolved marker samples. */
  readonly lines: readonly { readonly marker: string; readonly depth: number }[];
}
/** Pure facts supplied by optional list semantics. Commands own all mutations. */
export interface BlockListFeature {
  /** @param node - Selected textblock. @param doc - Canonical document. @returns Its effective list family. */
  readonly kind: (node: Node, doc: Node) => BlockListKind | null;
  /** @param editor - Installed extensions. @returns Semantic preset projections. */
  readonly presets: (editor: Editor) => readonly BlockListPreset[];
  /** @param editor - Current selection. @param preset - Canonical identity. @returns Whether it is applied. */
  readonly isPresetActive: (editor: Editor, preset: string) => boolean;
  /** @param state - Current caret/range. @returns Whether a preceding compatible sequence is available. */
  readonly canContinue: (state: EditorState) => boolean;
  /** @param editor - Canonical document. @returns Static HTML preserving resolved list markers. */
  readonly exportHTML: (editor: Editor) => string;
  /** @param editor - Canonical session. @param position - Clicked paragraph. @returns Contextual actions for that exact target. */
  readonly markerActions?: (editor: Editor, position: number) => readonly BlockListMarkerAction[];
}

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Optional typed adapters to the installed list owner. */
    readonly blockLists: {
      /** @param kind - Requested family. @returns Whether the selection can change. */
      toggleBlockList(kind: BlockListKind): ReturnType;
      /** @param preset - Installed preset identity. @returns Whether it can be applied. */
      applyBlockListPreset(preset: string): ReturnType;
      /** @returns Whether list formatting can be removed. */
      clearBlockList(): ReturnType;
      /** @param delta - One nesting level. @returns Whether a level can change. */
      changeBlockListLevel(delta: -1 | 1): ReturnType;
      /** @param start - Positive start number. @returns Whether numbering can restart. */
      restartBlockList(start: number): ReturnType;
      /** @returns Whether numbering can continue a compatible sequence. */
      continueBlockList(): ReturnType;
    };
  }
}
