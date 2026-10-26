import type { QuireEditor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import type { EditorBlockOccurrence } from "./types";

/** @param editor - Current editor. @param clientY - Pointer height. @returns Nearby semantic blocks with exact geometry. */
export function queryEditorBlockOccurrences(editor: QuireEditor, clientY: number): readonly EditorBlockOccurrence[] {
  const catalog = readBlockCatalog(editor);
  if (!catalog || !editor.isEditable) return [];
  const result: EditorBlockOccurrence[] = [];
  for (const fragment of editor.view.queryBlockFragments?.(clientY) ?? []) {
    if (fragment.sourceDocument !== catalog.doc) continue;
    const block = catalog.byFrom.get(fragment.from);
    if (block && block.to === fragment.to) result.push({ block, fragment });
  }
  return result;
}

/** @param editor - Current editor. @param x - Client x. @param y - Client y. @returns Closest hovered block in the rail corridor. */
export function resolveEditorBlockHover(editor: QuireEditor, x: number, y: number): EditorBlockOccurrence | null {
  let best: EditorBlockOccurrence | null = null, distance = Infinity;
  for (const candidate of queryEditorBlockOccurrences(editor, y)) {
    const rect = candidate.fragment.rect;
    if (x < rect.x - 68 || x > rect.x + rect.width + 8) continue;
    const dy = Math.max(rect.y - y, y - rect.y - rect.height, 0);
    const nested = best && candidate.block.from > best.block.from && candidate.block.to < best.block.to;
    if (dy <= 12 && (dy < distance || dy === distance && nested)) { best = candidate; distance = dy; }
  }
  return best;
}
