import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from "vue";
import type { Editor, QuireMountedTableChromeModel } from "@quirekit/core";
import { projectEditorUITableChromeModelToScrollSpace, translateEditorUITableChromeModel } from "@quirekit/editor-ui/vue";
import { captureTableTarget } from "../ui/actions";
import { measureBlockTable } from "../chrome/geometry";
import type { BlockTableTarget } from "../ui/types";
import { createTableHover } from "./hover";

/** @param editor - Canonical session. @param viewport - Positioned scroll owner. @returns Cached geometry and current semantic selection. */
export function useTableContext(editor: Editor, viewport: Ref<HTMLElement | undefined>) {
  const target = shallowRef<BlockTableTarget | null>(null), model = shallowRef<QuireMountedTableChromeModel | null>(null);
  const scrollModel = shallowRef<QuireMountedTableChromeModel | null>(null);
  const anchor = shallowRef<{ left: string; top: string } | null>(null);
  const identity = ref(0), selectionOwned = ref(false);
  let frame: number | undefined, observer: ResizeObserver | undefined, measuredElement: Element | null = null;
  let scrollLeft = 0, scrollTop = 0, needsMeasure = true;
  let remainingProjectionRetries = 0;
  let selectionMode: unknown;
  const hover = createTableHover(editor, () => viewport.value, () => model.value, sync);
  /** Projects cached client rectangles into the exact scroll owner. */
  function project(): void {
    frame = undefined;
    const host = viewport.value, current = target.value;
    if (!host || !current) { model.value = scrollModel.value = null; anchor.value = null; hover.refresh(); return; }
    const refreshElement = needsMeasure;
    if (needsMeasure) {
      model.value = measureBlockTable(editor, current); needsMeasure = !model.value;
      // Transactions precede the retained HTML write. A structural undo can keep
      // the same outer dimensions, so ResizeObserver alone cannot signal readiness.
      if (!model.value && remainingProjectionRetries-- > 0) schedule();
    }
    else if (model.value && (scrollTop !== host.scrollTop || scrollLeft !== host.scrollLeft)) {
      model.value = translateEditorUITableChromeModel(model.value, scrollLeft - host.scrollLeft, scrollTop - host.scrollTop);
    }
    scrollLeft = host.scrollLeft; scrollTop = host.scrollTop;
    const clip = host.getBoundingClientRect(), rect = model.value?.fragments[0]?.tableRect;
    scrollModel.value = model.value ? projectEditorUITableChromeModelToScrollSpace(model.value, clip, scrollLeft, scrollTop, host.clientLeft, host.clientTop) : null;
    anchor.value = !rect || rect.bottom < clip.top + 48 || rect.top > clip.bottom ? null : {
      left: `${Math.max(clip.left + 8, Math.min(rect.left, clip.right - 440))}px`, top: `${Math.max(clip.top + 8, rect.top - 56)}px`
    };
    const element = refreshElement ? editor.view.nodeDOM?.(current.tablePos) : measuredElement;
    if (element instanceof Element && element !== measuredElement) { observer?.disconnect(); measuredElement = element; observer?.observe(element); }
    hover.refresh();
  }
  /** Coalesces changes after the retained HTML tree updates. */
  function schedule(): void { if (frame === undefined) frame = requestAnimationFrame(project); }
  /** Re-measures only the active table after document or layout changes. */
  function invalidate(): void { needsMeasure = true; remainingProjectionRetries = 2; identity.value++; schedule(); }
  /** Updates semantic state without measuring on ordinary caret movement. */
  function sync(): void {
    const selected = editor.isEditable ? captureTableTarget(editor) : null;
    selectionOwned.value = selected !== null;
    const next = selected ?? hover.current, old = target.value;
    const selection = editor.state.pm.selection, mode = "mode" in selection ? selection.mode : undefined;
    if (next?.doc !== old?.doc || next?.tablePos !== old?.tablePos) invalidate();
    if (mode !== selectionMode || next?.doc !== old?.doc || next?.tablePos !== old?.tablePos || next?.rect.startRow !== old?.rect.startRow || next?.rect.startColumn !== old?.rect.startColumn || next?.rect.rowSpan !== old?.rect.rowSpan || next?.rect.columnSpan !== old?.rect.columnSpan) target.value = next;
    selectionMode = mode;
    if (!next) { model.value = scrollModel.value = null; anchor.value = null; observer?.disconnect(); measuredElement = null; }
    else if (!model.value) schedule();
  }
  /** @param event - Captured release must finish the table command before hover is re-hit. */
  function release(event: PointerEvent): void { if (hover.release(event)) schedule(); }
  /** @param event - Context request preserves an existing matrix selection. */
  function context(event: MouseEvent): void {
    if (!editor.isEditable || !(event.target instanceof Element) || !event.target.closest("td, th")) return;
    const hit = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!hit) return;
    const selected = captureTableTarget(editor), clicked = captureTableTarget(editor, hit.pos);
    const inside = selected && clicked && selected.tablePos === clicked.tablePos
      && clicked.rect.startRow >= selected.rect.startRow && clicked.rect.startRow < selected.rect.startRow + selected.rect.rowSpan
      && clicked.rect.startColumn >= selected.rect.startColumn && clicked.rect.startColumn < selected.rect.startColumn + selected.rect.columnSpan;
    event.preventDefault(); if (!inside) editor.commands.setTextSelection(hit.pos); sync();
  }
  /** Native scrolling composites positioned controls and revokes any old captured gesture. */
  function scroll(): void { identity.value++; schedule(); }
  onMounted(() => {
    observer = new ResizeObserver(invalidate);
    editor.on("transaction", sync); editor.on("update", sync);
    viewport.value?.addEventListener("scroll", scroll, { passive: true }); viewport.value?.addEventListener("contextmenu", context);
    viewport.value?.addEventListener("pointermove", hover.move, { passive: true, capture: true });
    viewport.value?.addEventListener("pointerleave", hover.leave, { passive: true });
    viewport.value?.ownerDocument.addEventListener("pointerup", release, true);
    viewport.value?.ownerDocument.addEventListener("pointercancel", release, true);
    window.addEventListener("resize", invalidate); sync();
  });
  onBeforeUnmount(() => {
    editor.off("transaction", sync); editor.off("update", sync); observer?.disconnect();
    viewport.value?.removeEventListener("scroll", scroll); viewport.value?.removeEventListener("contextmenu", context);
    viewport.value?.removeEventListener("pointermove", hover.move, true);
    viewport.value?.removeEventListener("pointerleave", hover.leave);
    viewport.value?.ownerDocument.removeEventListener("pointerup", release, true);
    viewport.value?.ownerDocument.removeEventListener("pointercancel", release, true);
    window.removeEventListener("resize", invalidate);
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return { target, anchor, model, scrollModel, identity, selectionOwned };
}
