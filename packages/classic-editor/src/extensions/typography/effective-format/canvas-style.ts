import type { QuireEditor, QuireMarkCanvasStyle } from "@quirekit/core";
import type { ClassicSelectedTextSegment } from "./types";
import { resolveClassicNodeTextStyle } from "./selection";

/**
 * Resolves selected style deltas once for all effective appearance controls.
 * @param editor - Editor containing the public style contributions.
 * @param segments - Already collected selection ranges or caret stored marks.
 * @returns Per-segment deltas ordered from semantic inheritance to direct marks.
 */
export function collectClassicSelectedCanvasStyles(
  editor: QuireEditor,
  segments: readonly ClassicSelectedTextSegment[]
): readonly (readonly QuireMarkCanvasStyle[])[] {
  return segments.map(segment => {
    const base = resolveClassicNodeTextStyle(editor, segment.textblock);
    let inherited = base;
    let hasSemanticStyle = false;
    const direct: QuireMarkCanvasStyle[] = [];
    for (const mark of segment.marks) {
      const resolve = editor.extensions.find(extension => extension.canvasStyle?.[mark.type.name])?.canvasStyle?.[mark.type.name];
      const style = resolve?.(mark, { node: segment.textblock, contentStart: segment.contentStart,
        document: editor.state.doc, inheritedStyle: base });
      if (style?.cascade === "inherited") {
        inherited = { ...inherited, ...style };
        hasSemanticStyle = true;
      } else if (style) direct.push(style);
    }
    if (!hasSemanticStyle && base?.defaultInlineStyle) inherited = { ...inherited, ...base.defaultInlineStyle };
    // Semantic styles resolve before direct marks, matching the mounted paint contract.
    return [...(inherited ? [inherited] : []), ...direct];
  });
}
