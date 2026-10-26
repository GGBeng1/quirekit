import type { EditorState } from "@quirekit/cm-state";
import type { MsfeSourceRange } from "../../views/types";

/**
 * Maps a projected fragment to its source reveal owner without mutating selection.
 * @param state - Current canonical source and syntax.
 * @param range - Projected source fragment.
 * @returns An in-document range containing the complete fragment.
 */
export type SourceRevealResolver = (
  state: EditorState,
  range: MsfeSourceRange,
) => MsfeSourceRange;
