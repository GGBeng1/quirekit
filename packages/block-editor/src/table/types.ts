import type { Editor, QuireCommandPosition, QuireJSONContent } from "@quirekit/core";

/** Complete dimensions accepted by optional table authoring. */
export interface BlockTableSize {
  /** Positive row count. */
  readonly rowCount: number;
  /** Positive column count. */
  readonly columnCount: number;
}
/** Atomic creation at the current selection or an explicit captured range. */
export interface BlockTableInsertOptions extends BlockTableSize {
  /** Optional canonical position, used to replace a committed slash paragraph. */
  readonly position?: QuireCommandPosition;
}
/** Pure table facts supplied by an optional semantic feature through storage.blockTable. */
export interface BlockTableFeature {
  /** Canonical node registered by the feature. */
  readonly nodeName: string;
  /** @param size - Requested dimensions. @returns Canonical content or null for invalid input. */
  readonly createContent: (size: BlockTableSize) => QuireJSONContent | null;
  /** @param editor - Source document. @param html - Existing static projection. @returns HTML with portable table presentation. */
  readonly exportHTML?: (editor: Editor, html: string) => string;
}

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Optional table authoring command; the installed semantic feature owns its implementation. */
    readonly blockTable: {
      /** @param size - Requested dimensions. @returns Whether a canonical table can be or was inserted. */
      insertBlockTable(size: BlockTableInsertOptions): ReturnType;
    };
  }
}
