import type { Editor } from "@quirekit/core";
import type { BlockListFeature } from "./types";
/** @param editor - Canonical session. @returns Optional schema-neutral list facts. */
export function readBlockListFeature(editor: Editor): BlockListFeature | null {
  const feature = editor.storage.blockLists as BlockListFeature | undefined;
  return feature && typeof editor.commands.toggleBlockList === "function" ? feature : null;
}
