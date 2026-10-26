import type {} from "@quirekit/msfe-core";

/** GFM delimiter spelling; default removes explicit alignment colons. */
export type TableAlignment = "left" | "center" | "right" | "default";

/** Typed commands contributed by independently installed prose extensions. */
declare module "@quirekit/msfe-core" {
  /** Prose command families share the caller's chain/query return type. */
  interface Commands<ReturnType> {
    /** Source table actions installed by Table. */
    table: {
      /** @param alignment - GFM column alignment. @returns The caller's result or pending chain. */
      setTableColumnAlignment(alignment: TableAlignment): ReturnType;
      /** @param side - Relative row insertion. @returns The caller's result or pending chain. */
      insertTableRow(side?: "before" | "after"): ReturnType;
      /** @returns The caller's result or pending chain. */
      deleteTableRow(): ReturnType;
      /** @param side - Relative column insertion. @returns The caller's result or pending chain. */
      insertTableColumn(side?: "before" | "after"): ReturnType;
      /** @returns The caller's result or pending chain. */
      deleteTableColumn(): ReturnType;
      /** @param direction - Next or previous cell. @returns The caller's result or pending chain. */
      moveTableCell(direction?: 1 | -1): ReturnType;
    };
    /** Source list actions installed by ListMarkers. */
    list: {
      /** @returns The caller's result or pending chain. */
      indentList(): ReturnType;
      /** @returns The caller's result or pending chain. */
      outdentList(): ReturnType;
      /** @returns The caller's result or pending chain. */
      continueList(): ReturnType;
    };
    /** Commands installed by Emphasis. */
    emphasis: {
      /** @returns The caller's result or pending chain. */
      toggleEmphasis(): ReturnType;
    };
    /** Commands installed by Strikethrough. */
    strikethrough: {
      /** @returns The caller's result or pending chain. */
      toggleStrikethrough(): ReturnType;
    };
  }
}

/** Constant-size structural toolbar facts; no generated document content. */
export interface ProseStructure {
  /** Current selection belongs to one table cell. */
  readonly table: boolean;
  /** Selected body row can be deleted. */
  readonly deleteRow: boolean;
  /** Table retains a column after deletion. */
  readonly deleteColumn: boolean;
  /** Selection belongs to a list. */
  readonly list: boolean;
  /** A previous sibling can own the selected items. */
  readonly indentList: boolean;
}

/** Options of the data URL fold; the source text is never changed. */
export interface DataUrlFoldOptions {
  /** Shortest base64 payload, in characters, that is folded; shorter inline icons stay readable. */
  readonly minLength: number;
  /** Accessible hint on each fold, telling readers how to reveal the source. */
  readonly hint: string;
}

/** One long base64 data URL found in source text. */
export interface DataUrlMatch {
  /** Absolute start offset of `data:`. */
  readonly from: number;
  /** Absolute end offset after the payload. */
  readonly to: number;
  /** Declared media type, such as image/png. */
  readonly type: string;
  /** Decoded payload size in bytes. */
  readonly bytes: number;
}
