import type { Editor } from "@quirekit/core";
import type { BlockParagraphFeature } from "./types";
/** @param editor - Command owner. @returns Installed schema-neutral paragraph facts. */
export function readBlockParagraphFeature(editor: Editor): BlockParagraphFeature | null {
  return typeof editor.commands.setBlockParagraph === "function" ? editor.storage.blockParagraph as BlockParagraphFeature : null;
}
