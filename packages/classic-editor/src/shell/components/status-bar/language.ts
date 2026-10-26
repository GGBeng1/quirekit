import { BlockSelection, isTextSelection } from "@quirekit/core";
import type { ClassicEditorRenderContext, ClassicEditorUiSemanticSnapshot } from "../../../types";
import {
  classicEditorStatusTargetKey,
  type ResolvedClassicEditorTargetStatus
} from "./types";
import { formatClassicEditorSemanticStatus, resolveClassicEditorStatusMessage } from "./format";
import { readClassicEditorStatusTarget } from "./parse";

export { readClassicEditorStatusTarget } from "./parse";

/**
 * Resolves one honest target-aware status from controller facts or a proven text selection.
 *
 * @param context - Mounted product context.
 * @returns Localized target status and its semantic source.
 */
export function resolveClassicEditorTargetStatus(
  context: ClassicEditorRenderContext
): ResolvedClassicEditorTargetStatus {
  const selection = context.editor.state.pm.selection;
  if (selection instanceof BlockSelection) {
    return { kind: "blocks", source: "block-selection", text: resolveClassicEditorStatusMessage(context, "selectedBlocks", {
      count: selection.$to.index() - selection.$from.index()
    }) };
  }
  const semantic = context.ui.state.semantic;
  const target = readClassicEditorStatusTarget(
    semantic.values[classicEditorStatusTargetKey]
  );
  if (target !== null) {
    return {
      kind: target.kind,
      text: formatClassicEditorSemanticStatus(context, target),
      source: "semantic"
    };
  }

  // Character counts are safe only when Core proves the selection is textual.
  if (isTextSelection(selection)) {
    const range = resolveTextRange(semantic, selection.from, selection.to, selection.empty);
    return {
      kind: range.empty ? "caret" : "text",
      text: range.empty
        ? resolveClassicEditorStatusMessage(context, "caret")
        : resolveClassicEditorStatusMessage(
            context,
            "selectedCharacters",
            { count: range.to - range.from }
          ),
      source: "text-selection"
    };
  }

  return {
    kind: "unavailable",
    text: resolveClassicEditorStatusMessage(context, "selectionDetailsUnavailable"),
    source: "fallback"
  };
}

/**
 * Uses a semantic range only while its shape agrees with a proven TextSelection.
 *
 * @param semantic - Controller snapshot preferred by product surfaces.
 * @param from - Current Core selection start.
 * @param to - Current Core selection end.
 * @param empty - Current Core selection emptiness.
 * @returns Safe text range used for status language.
 */
function resolveTextRange(
  semantic: ClassicEditorUiSemanticSnapshot,
  from: number,
  to: number,
  empty: boolean
): Readonly<{ from: number; to: number; empty: boolean }> {
  const range = semantic.selection;
  return range !== null && range.empty === (range.from === range.to)
    ? range
    : { from, to, empty };
}
