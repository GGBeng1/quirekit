import type { Node } from "@quirekit/pm";
/** Paragraph fields offered by the continuous document product. */
export type BlockParagraphField = "alignment" | "start" | "end" | "firstLine" | "line" | "before" | "after";
/** One explicit field edit; other paragraph properties are retained independently. */
export interface BlockParagraphChange {
  /** Product field; numeric lengths use points and line uses a multiplier. */ readonly field: BlockParagraphField;
  /** Explicit supported value. */ readonly value: number | "start" | "center" | "end" | "justify";
}
/** Bounded product projection; null represents mixed or an uneditable source unit. */
export type BlockParagraphValues = Readonly<Record<BlockParagraphField, string | number | null>>;
/** Optional owner adapter; the product never interprets Word attributes. */
export interface BlockParagraphFeature {
  /** @param node - One selected node. @returns Its editable fields, or null outside paragraph scope. */
  read(node: Node): BlockParagraphValues | null;
}
declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Optional paragraph authoring adapter. */ readonly blockParagraph: {
      /** @param change - One explicit field edit. @returns Owner acceptance. */ setBlockParagraph(change: BlockParagraphChange): ReturnType;
      /** @param direction - One indentation step. @returns Owner acceptance. */ indentBlockParagraph(direction: -1 | 1): ReturnType;
    };
  }
}
