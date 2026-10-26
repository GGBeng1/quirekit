import type { WordParagraphBorder, WordParagraphBorders, WordParagraphFormatting } from "../types";
import type { WordParagraphBorderPen, WordParagraphDecorationOperation } from "./types";

/** Logical visible edges; between/bar remain source-preserved outside presets. */
export const wordParagraphBorderSides = ["top", "start", "bottom", "end"] as const;
/** Supported atomic paragraph topologies. */
export const wordParagraphBorderPresets = ["none", "bottom", "top", "box", "start", "end"] as const;
/** Product-independent starting pen for explicitly creating a new edge. */
export const defaultWordParagraphBorderPen: WordParagraphBorderPen = Object.freeze({
  style: "single", color: "#000000", sizeEighthPoints: 6, spacePoints: 3
});

/** @param edge - Canonical edge. @returns Whether the edge has a visible pattern. */
export function isWordParagraphBorderEnabled(edge: WordParagraphBorder | null | undefined): boolean {
  return edge != null && edge.style !== "nil" && edge.style !== "none";
}

/** @param pen - Explicit authoring pen. @returns Fresh edge with no hidden effects. */
function createEdge(pen: WordParagraphBorderPen): WordParagraphBorder {
  return { ...pen, themeColor: null, themeTint: null, themeShade: null, shadow: null, frame: null };
}

/** @returns An explicit absent edge, distinct from inheritance. */
function absentEdge(): WordParagraphBorder {
  return { style: "nil", color: null, sizeEighthPoints: null, spacePoints: null,
    themeColor: null, themeTint: null, themeShade: null, shadow: null, frame: null };
}

/** @returns A topology that explicitly disables all six Word edges. */
function absentBorders(): WordParagraphBorders {
  return { top: absentEdge(), start: absentEdge(), bottom: absentEdge(), end: absentEdge(),
    between: absentEdge(), bar: absentEdge() };
}

/**
 * Applies one validated operation without copying another paragraph's formatting.
 * @param direct - Current paragraph-local values and preservation envelope.
 * @param effective - This paragraph's resolved style plus direct formatting.
 * @param operation - Validated authoring intent.
 * @returns Updated direct formatting, or the original object for an inactive pen edit.
 */
export function applyWordParagraphDecoration(
  direct: WordParagraphFormatting,
  effective: WordParagraphFormatting,
  operation: WordParagraphDecorationOperation
): WordParagraphFormatting {
  if (operation.kind === "restore") return { ...direct, borders: null, shading: null };
  if (operation.kind === "fill") return { ...direct, shading: {
    pattern: "clear", color: "auto", fill: operation.color === null || operation.color === "auto" ? "auto" : operation.color.toUpperCase(),
    themeColor: null, themeFill: null, themeFillTint: null, themeFillShade: null
  } };

  // Topology presets are complete replacements. All other operations derive
  // from this target's effective edges, preserving unedited fields and sides.
  const borders = { ...(effective.borders ?? absentBorders()) };
  if (operation.kind === "preset") {
    Object.assign(borders, absentBorders());
    for (const side of wordParagraphBorderSides) {
      if (operation.preset === "box" || operation.preset === side) borders[side] = createEdge(operation.pen);
    }
  } else if (operation.kind === "side") {
    borders[operation.side] = operation.enabled
      ? (isWordParagraphBorderEnabled(borders[operation.side]) ? borders[operation.side] : createEdge(operation.pen))
      : absentEdge();
  } else {
    let changed = false;
    for (const side of wordParagraphBorderSides) {
      const edge = borders[side];
      if (!isWordParagraphBorderEnabled(edge) || edge == null) continue;
      borders[side] = { ...edge, ...operation.patch,
        ...(operation.patch.color !== undefined ? {
          color: operation.patch.color === "auto" ? "auto" : operation.patch.color.toUpperCase(),
          themeColor: null, themeTint: null, themeShade: null
        } : {}) };
      changed = true;
    }
    if (!changed) return direct;
  }
  return { ...direct, borders };
}
