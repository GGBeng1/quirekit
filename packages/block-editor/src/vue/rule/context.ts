import { onBeforeUnmount, onMounted, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import type { EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { captureBlockRule } from "../../rule/commands";
import type { BlockRuleTarget } from "../../rule/types";

/** @param editor - Selection owner. @returns Current rule and its client-space anchor; scrolling is owned by the shared overlay. */
export function useBlockRuleContext(editor: Editor) {
  const target = shallowRef<BlockRuleTarget | null>(null);
  const anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
  let frame: number | undefined;
  /** @returns Geometry of the one selected rule, never a document-wide query. */
  function measure(): EditorUIAnchoredOverlayAnchor | null {
    frame = undefined;
    const dom = target.value && editor.view.nodeDOM?.(target.value.pos);
    const box = dom?.nodeType === 1 ? (dom as HTMLElement).getBoundingClientRect() : null;
    anchor.value = box ? { x: box.left, y: box.top, rects: [{ x: box.left, y: box.top, width: box.width, height: box.height }] } : null;
    return anchor.value;
  }
  /** Projects only a changed document/selection/permission; identical notifications reuse the target. */
  function sync(): void {
    const next = editor.isEditable ? captureBlockRule(editor) : null;
    if (next?.doc === target.value?.doc && next?.pos === target.value?.pos) return;
    target.value = next;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    if (next) frame = requestAnimationFrame(measure);
    else anchor.value = null;
  }
  onMounted(() => { editor.on("transaction", sync); editor.on("update", sync); sync(); });
  onBeforeUnmount(() => { editor.off("transaction", sync); editor.off("update", sync); if (frame !== undefined) cancelAnimationFrame(frame); });
  return { target, anchor, measure };
}
