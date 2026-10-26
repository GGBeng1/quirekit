import { onBeforeUnmount, onMounted, shallowRef, type Ref } from "vue";
import type { Editor } from "@quirekit/core";
import type { QuireDrawingFrame } from "@quirekit/view-engine";
import { captureBlockMedia } from "../../media/commands";
import type { BlockMediaTarget } from "../../media/types";
/** @param editor - Canonical owner. @param viewport - Clipping owner. @returns One selected-object projection without whole-document layout reads. */
export function useBlockMediaContext(editor: Editor, viewport: Ref<HTMLElement>) {
 const target = shallowRef<BlockMediaTarget | null>(null), frame = shallowRef<QuireDrawingFrame | null>(null), maximumWidth = shallowRef(800);
 let scrollLeft = 0, scrollTop = 0;
 let editable = editor.isEditable;
 let request: number | undefined, observer: ResizeObserver | undefined, observed: Element | null = null;
 /** Reads only the selected atom after the HTML projection has settled. */
 function measure(): void {
  request = undefined;
  const current = target.value, root = current && editor.view.nodeDOM?.(current.pos);
  if (!(root instanceof HTMLElement)) { frame.value = null; return; }
  const stage = root.querySelector<HTMLElement>("[data-block-media-stage]");
  if (!stage) { frame.value = null; return; }
  const rect = stage.getBoundingClientRect(), clip = viewport.value.getBoundingClientRect();
  scrollLeft = viewport.value.scrollLeft; scrollTop = viewport.value.scrollTop;
  frame.value = { rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }, rotation: 0 };
  maximumWidth.value = root.parentElement?.clientWidth ?? clip.width;
  if (observed !== stage) { observer?.disconnect(); observer?.observe(stage); observed = stage; }
 }
 /** Coalesces layout reads; ordinary editing outside media does not schedule work. */
 function schedule(): void { if (target.value && request === undefined) request = requestAnimationFrame(measure); }
 /** Scroll only translates the retained client frame; the atom is not measured again. */
 function scroll(): void {
  const host = viewport.value, current = frame.value;
  if (current) frame.value = { ...current, rect: { ...current.rect, x: current.rect.x + scrollLeft - host.scrollLeft, y: current.rect.y + scrollTop - host.scrollTop } };
  scrollLeft = host.scrollLeft; scrollTop = host.scrollTop;
 }
 /** Retains the exact selected atom across non-document UI events. */
 function sync(): void {
  const next = captureBlockMedia(editor);
  if (next?.doc === target.value?.doc && next?.pos === target.value?.pos && editable === editor.isEditable) return;
  editable = editor.isEditable;
  target.value = next;
  // Editable media use the object frame; reading mode keeps the normal selection
  // fill because no resize frame is mounted. The product owns this style token.
  if (next && editable) viewport.value.style.setProperty("--qk-block-selection-fill", "transparent");
  else viewport.value.style.removeProperty("--qk-block-selection-fill");
  if (next) schedule(); else { frame.value = null; observer?.disconnect(); observed = null; }
 }
 /** @param event - Right-click selects the clicked object before opening its controls. */
 function context(event: MouseEvent): void {
  if (!(event.target instanceof Element) || !event.target.closest("[data-qk-block-media]")) return;
  const hit = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (hit && editor.isEditable) { event.preventDefault(); sync(); schedule(); }
 }
 onMounted(() => { observer = new ResizeObserver(schedule); editor.on("transaction", sync); editor.on("update", sync); viewport.value.addEventListener("scroll", scroll, { passive: true }); viewport.value.addEventListener("contextmenu", context); window.addEventListener("resize", schedule); sync(); });
 onBeforeUnmount(() => { viewport.value.style.removeProperty("--qk-block-selection-fill"); observer?.disconnect(); editor.off("transaction", sync); editor.off("update", sync); viewport.value.removeEventListener("scroll", scroll); viewport.value.removeEventListener("contextmenu", context); window.removeEventListener("resize", schedule); if (request !== undefined) cancelAnimationFrame(request); });
 return { target, frame, maximumWidth };
}
