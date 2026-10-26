import type { Editor } from "@quirekit/core";
import type { BlockTableFeature } from "./types";

/** @param editor - Host session. @returns Installed table facts without depending on a particular schema package. */
export function readBlockTableFeature(editor: Editor): BlockTableFeature | null {
  const feature = editor.storage.blockTable as BlockTableFeature | undefined;
  return feature && typeof editor.commands.insertBlockTable === "function" && editor.state.schema.nodes[feature.nodeName] ? feature : null;
}
