import { onBeforeUnmount, onMounted, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import type { EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { captureNoteTarget } from "../../notes/target";
import type { NoteTarget } from "../../notes/types";

/** @param editor - Selection owner. @returns The active footnote and one client-space anchor; the shared overlay owns scrolling. */
export function useNoteContext(editor: Editor) {
  const target = shallowRef<NoteTarget | null>(null);
  const anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
  let pending = false;
  let releaseGeometry: (() => void) | undefined;
  /** @returns Geometry of the current source end, without scanning other notes or the document. */
  function measure(): EditorUIAnchoredOverlayAnchor | null {
    const dom = target.value && editor.mountedView?.nodeDOM?.(target.value.pos);
    const box = dom?.nodeType === 1 && dom.isConnected ? (dom as HTMLElement).getBoundingClientRect() : null;
    if (target.value && !box) pending = true;
    anchor.value = box ? { x: box.left, y: box.top, rects: [{ x: box.left, y: box.top, width: box.width, height: box.height }] } : null;
    return anchor.value;
  }
  /** Resolves the source only after View commits; undo can restore nodes after the Core notification. */
  function flush(): void {
    if (!pending) return;
    pending = false;
    measure();
  }
  /** Reuses geometry for caret movement within the same note and duplicate transaction/update notifications. */
  function sync(): void {
    const next = captureNoteTarget(editor);
    if (next?.doc === target.value?.doc && next?.pos === target.value?.pos) return;
    target.value = next;
    pending = !!next;
    anchor.value = null;
  }
  /** Binds the current View after a mount or restoration and resolves its initial committed geometry. */
  function mount(): void {
    releaseGeometry?.();
    releaseGeometry = editor.mountedView?.onGeometryUpdate?.(flush);
    sync(); pending = !!target.value; flush();
  }
  /** Releases the old View before it is replaced, without retaining a detached anchor. */
  function unmount(): void {
    releaseGeometry?.(); releaseGeometry = undefined;
    anchor.value = null; pending = !!target.value;
  }
  onMounted(() => {
    editor.on("transaction", sync); editor.on("update", sync);
    editor.on("mount", mount); editor.on("unmount", unmount); mount();
  });
  onBeforeUnmount(() => {
    editor.off("transaction", sync); editor.off("update", sync);
    editor.off("mount", mount); editor.off("unmount", unmount); unmount();
  });
  return { target, anchor, measure };
}
