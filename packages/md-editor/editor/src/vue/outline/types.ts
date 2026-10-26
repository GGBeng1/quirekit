import type { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";

/** Reactive inputs of the document outline controller. */
export interface MdOutlineOptions {
  /** @returns Current mounted editor, absent before mount. */
  readonly editor: () => MsfeEditor | undefined;
  /** @returns Latest accepted state, replaced on every transaction. */
  readonly state: () => EditorState | undefined;
  /** @returns Whether the outline is currently presented; hidden outlines read nothing. */
  readonly presented: () => boolean;
  /** @returns Label for a heading without visible text. */
  readonly untitled: () => string;
  /** @returns Client-space y of the reading line, below sticky chrome. */
  readonly readingLine: () => number;
}
