/** Stable semantic-value key reserved for target-aware status facts. */
export const classicEditorStatusTargetKey = "classic.statusTarget";

/** Status modes that have product-owned Chinese and English language. */
export type ClassicEditorStatusMode =
  | "edit"
  | "read-only"
  | "template"
  | "fill";

/** Facts shared by every target-aware status kind. */
interface ClassicEditorStatusTargetBase {
  /** Current semantic target kind. */
  readonly kind: "caret" | "text" | "node" | "table" | "image" | "control" | "story";
  /** Feature-owned localized target label, when the feature can name it. */
  readonly label?: string | undefined;
  /** Product-owned interaction mode, when explicitly known. */
  readonly mode?: ClassicEditorStatusMode | undefined;
  /** Whether an explicit protection or collaboration fact reports a lock. */
  readonly locked?: boolean | undefined;
  /** Feature-owned localized disabled or protection explanation. */
  readonly reason?: string | undefined;
}

/** Explicit insertion-point status. */
export interface ClassicEditorCaretStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "caret";
}

/** Explicit text-range status. */
export interface ClassicEditorTextStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "text";
  /** Unicode character count published by the selection owner. */
  readonly count: number;
}

/** Explicit non-table object status. */
export interface ClassicEditorNodeStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "node";
}

/** Explicit image-object status. */
export interface ClassicEditorImageStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "image";
}

/** Explicit table, cell, row, or column status. */
export interface ClassicEditorTableStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "table";
  /** Logical table row count. */
  readonly rows?: number | undefined;
  /** Logical table column count. */
  readonly columns?: number | undefined;
  /** One-based active row index. */
  readonly row?: number | undefined;
  /** One-based active column index. */
  readonly column?: number | undefined;
  /** Number of explicitly selected logical cells. */
  readonly selectedCells?: number | undefined;
}

/** Explicit content-control status. */
export interface ClassicEditorControlStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "control";
}

/** Explicit document-story status. */
export interface ClassicEditorStoryStatusTarget extends ClassicEditorStatusTargetBase {
  /** Target discriminator. */
  readonly kind: "story";
}

/** One structured target fact published through the UI semantic snapshot. */
export type ClassicEditorStatusTarget =
  | ClassicEditorCaretStatusTarget
  | ClassicEditorTextStatusTarget
  | ClassicEditorNodeStatusTarget
  | ClassicEditorTableStatusTarget
  | ClassicEditorImageStatusTarget
  | ClassicEditorControlStatusTarget
  | ClassicEditorStoryStatusTarget;

/** Final localized status projected into the shell. */
export interface ResolvedClassicEditorTargetStatus {
  /** Semantic kind used by automation and responsive projections. */
  readonly kind: ClassicEditorStatusTarget["kind"] | "blocks" | "unavailable";
  /** Localized visible status sentence. */
  readonly text: string;
  /** Whether a feature controller supplied structured facts. */
  readonly source: "semantic" | "text-selection" | "block-selection" | "fallback";
}
