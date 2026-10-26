import type {
  Decoration,
  DecorationSet,
  DecorationSource,
  EditorState
} from "@quirekit/pm";
import { isQuireDomOnlyDecorations, type QuireDecorationSpec } from "@quirekit/core";
import type {
  QuireDecorationProvider,
  QuireDecorationSourceView
} from "./types";

/** Name of the ProseMirror-style prop that supplies view decorations. */
const decorationsPropName = "decorations";

/**
 * Collects all direct and plugin decorations exposed by a mounted view.
 *
 * @param view - Mounted view whose props should be inspected.
 * @param state - PM state whose document positions own the current layout pass.
 * @returns Flattened decorations in document order.
 */
export function collectQuireDecorations(
  view: QuireDecorationSourceView | undefined,
  state: EditorState
): readonly Decoration[] {
  const decorations: Decoration[] = [];

  if (!view) {
    return decorations;
  }

  view.someProp(decorationsPropName, (provider) => {
    if (typeof provider !== "function" || isQuireDomOnlyDecorations(provider)) {
      return false;
    }

    collectDecorationSource(
      (provider as QuireDecorationProvider)(state),
      decorations
    );
    return false;
  });

  return decorations;
}

/**
 * Appends decorations from one DecorationSource into a mutable result array,
 * skipping decorations reserved for DOM-rendered views.
 *
 * @param source - Decoration source returned by a view prop.
 * @param decorations - Mutable output array.
 */
function collectDecorationSource(
  source: DecorationSource | null | undefined,
  decorations: Decoration[]
): void {
  source?.forEachSet((set: DecorationSet) => {
    for (const decoration of set.find()) {
      if ((decoration.spec as QuireDecorationSpec | undefined)?.quireRenderTarget !== "dom") {
        decorations.push(decoration);
      }
    }
  });
}
