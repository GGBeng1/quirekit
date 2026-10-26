import type { MsfeEditor } from "@quirekit/msfe-core";
import type { MdCommentsBridge } from "./types";

/** Editor storage name under which a comment plugin publishes its bridge. */
export const mdCommentsStorage = "mdComments";

/** Storage shape of the bridge extension. */
export interface MdCommentsBridgeStorage {
  /** Published bridge, present while the extension is mounted. */ bridge?: MdCommentsBridge;
}

/**
 * @param editor - Editor.
 * @returns The installed comment bridge, or null when comments are off.
 */
export function getMdCommentsBridge(editor: MsfeEditor): MdCommentsBridge | null {
  return (editor.storage[mdCommentsStorage] as MdCommentsBridgeStorage | undefined)?.bridge ?? null;
}
