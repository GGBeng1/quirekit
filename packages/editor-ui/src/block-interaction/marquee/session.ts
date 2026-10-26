import { BlockSelection, type QuireEditor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import { canStartEditorBlockMarquee } from "./admission";
import { createEditorBlockMarqueeRect, resolveEditorBlockMarqueeRange } from "./geometry";
import type { EditorBlockMarqueePreview } from "./types";

/**
 * Adapts exterior block selection to the mounted pointer/frame/autoscroll owner.
 * @param editor - Canonical document and commands.
 * @param viewport - Product document scrollport.
 * @param event - Exterior primary press.
 * @param preview - Temporary rectangle presentation; never a second content-selection store.
 * @returns Idempotent cancellation, or null when another owner or backend owns this gesture.
 */
export function startEditorBlockMarquee(editor: QuireEditor, viewport: HTMLElement, event: PointerEvent,
  preview: (value: EditorBlockMarqueePreview | null) => void): (() => void) | null {
  const view = editor.mountedView, catalog = readBlockCatalog(editor);
  if (!view?.queryBlockFragmentsInRect || !view.beginBlockDrag || !catalog || !catalog.blocks.length) return null;
  const surface = view.dom;
  if (!canStartEditorBlockMarquee(event, viewport, surface)) return null;
  const origin = surface.getBoundingClientRect();
  const anchor = { x: event.clientX - origin.left, y: event.clientY - origin.top };
  let active = false;
  return view.beginBlockDrag(event, {
    selectionOnly: true,
    update(point) {
      if (editor.isDestroyed || editor.mountedView !== view || editor.state.doc !== catalog.doc) return null;
      if (!active) {
        if (Math.hypot(point.clientX - event.clientX, point.clientY - event.clientY) < 5) return false;
        active = true;
        view.focus();
      }
      // Geometry is read once per accepted pointer frame. The document anchor
      // stays fixed while scrolling changes only its client projection.
      const current = surface.getBoundingClientRect(), boundary = viewport.getBoundingClientRect();
      const rect = createEditorBlockMarqueeRect(anchor, { x: point.clientX, y: point.clientY }, current, boundary);
      const range = resolveEditorBlockMarqueeRange(catalog, view.queryBlockFragmentsInRect!(rect));
      const first = range && catalog.byId.get(range.anchor.blockId), last = range && catalog.byId.get(range.focus.blockId);
      const selection = editor.state.pm.selection;
      if (first && last) {
        if (!(selection instanceof BlockSelection) || selection.from !== first.from || selection.to !== last.to) {
          if (!editor.commands.selectBlockRange(range)) return null;
        }
        const accepted = editor.state.pm.selection;
        if (!(accepted instanceof BlockSelection) || accepted.from !== first.from || accepted.to !== last.to) return null;
      } else if (!selection.empty) {
        editor.commands.selectBlockRange(null);
        if (!editor.state.pm.selection.empty) return null;
      }
      preview({ rect, count: first && last ? last.order - first.order + 1 : 0 });
      return true;
    },
    finish() { preview(null); },
    cancel() { preview(null); }
  }) ?? null;
}
