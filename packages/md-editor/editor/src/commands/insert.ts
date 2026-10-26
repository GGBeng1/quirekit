import { insertSourceBlockAtSelection, type MsfeCommand } from "@quirekit/msfe-core";

/** @param markdown - A complete source fragment chosen by the user. @returns One atomic source insertion at the captured selection. */
export function insertMarkdownBlock(markdown: string): MsfeCommand {
  return insertSourceBlockAtSelection(markdown);
}
