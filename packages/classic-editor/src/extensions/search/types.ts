import type { SearchRange } from "@quirekit/extension-search";
import type { ClassicEditorRenderContext } from "@classic/types";

/** Find-only or find-and-replace panel mode. */
export type ClassicSearchMode = "find" | "replace";

/** Panel-visible state retained across panel remounts. */
export interface ClassicSearchSessionState {
  /** Whether the floating panel is shown. */
  open: boolean;
  /** Active panel mode. */
  mode: ClassicSearchMode;
  /** Draft find text; committed only on Enter or an explicit search action. */
  findText: string;
  /** Draft replacement text. */
  replaceText: string;
  /** Whether matching respects letter case. */
  caseSensitive: boolean;
  /** Whether matches must be whole words; ignored for East Asian queries. */
  wholeWord: boolean;
  /** Whether full-width and half-width forms match each other. */
  ignoreWidth: boolean;
  /** Whether the search is limited to `scopeRange`. */
  inSelection: boolean;
  /** Selection captured when the card opened, unless it became the query; mapped through edits. */
  scopeRange: SearchRange | null;
  /** Incremented whenever a trigger asks the panel to focus its query input. */
  focusRequest: number;
}

/** Live product facts the floating panel host follows across shell updates. */
export interface ClassicSearchHostState {
  /** Latest mounted product context. */
  context: ClassicEditorRenderContext;
}
