import { onBeforeUnmount, ref, watch } from "vue";
import type { Ref } from "vue";

/**
 * Owns the reactive pointer gate for one mounted selection Popup Menu.
 *
 * @param resolveRoot - Resolves the current Classic Editor product root.
 * @param settle - Receives pointerup success or pointercancel after View settles.
 * @returns Reactive flag that stays true throughout a document pointer gesture.
 */
export function useClassicEditorSelectionPopupPointerGate(
  resolveRoot: () => HTMLElement | undefined,
  settle: (completed: boolean) => void
): Readonly<Ref<boolean>> {
  const inProgress = ref(false);
  let release: (() => void) | undefined;

  watch(resolveRoot, (root) => {
    release?.();
    release = undefined;
    inProgress.value = false;
    if (root === undefined) return;
    release = bindClassicEditorSelectionPopupPointerLifecycle(
      root,
      () => {
        inProgress.value = true;
      },
      (completed) => {
        inProgress.value = false;
        settle(completed);
      }
    );
  }, { immediate: true });

  onBeforeUnmount(() => release?.());
  return inProgress;
}

/**
 * Binds the document-pointer lifecycle that gates the text-selection Popup Menu.
 *
 * View continues publishing live selection transactions during a drag. Classic
 * only delays its product surface until the pointer gesture reaches a terminal
 * event, keeping selection rendering and collaboration updates synchronous.
 *
 * @param root - Classic Editor product root containing the active View.
 * @param start - Called when a primary document pointer gesture begins.
 * @param end - Called after the matching terminal event finishes dispatching.
 * @returns Cleanup that releases root, document, and window listeners.
 */
export function bindClassicEditorSelectionPopupPointerLifecycle(
  root: HTMLElement,
  start: () => void,
  end: (completed: boolean) => void
): () => void {
  const ownerDocument = root.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  let activePointerId: number | null = null;
  let released = false;

  /** @param event - Captured pointerdown within the product root. */
  function handlePointerDown(event: PointerEvent): void {
    if (
      activePointerId !== null
      || event.button !== 0
      || !isDocumentViewPointerTarget(event.target, root)
    ) return;
    activePointerId = event.pointerId;
    start();
  }

  /** @param event - Matching pointerup or pointercancel from the owner document. */
  function handlePointerEnd(event: PointerEvent): void {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    const completed = event.type === "pointerup";
    queueMicrotask(() => {
      if (!released) end(completed);
    });
  }

  root.addEventListener("pointerdown", handlePointerDown, true);
  ownerDocument.addEventListener("pointerup", handlePointerEnd, true);
  ownerDocument.addEventListener("pointercancel", handlePointerEnd, true);
  ownerWindow?.addEventListener("pointerup", handlePointerEnd, true);
  ownerWindow?.addEventListener("pointercancel", handlePointerEnd, true);

  return (): void => {
    released = true;
    root.removeEventListener("pointerdown", handlePointerDown, true);
    ownerDocument.removeEventListener("pointerup", handlePointerEnd, true);
    ownerDocument.removeEventListener("pointercancel", handlePointerEnd, true);
    ownerWindow?.removeEventListener("pointerup", handlePointerEnd, true);
    ownerWindow?.removeEventListener("pointercancel", handlePointerEnd, true);
  };
}

/**
 * Accepts only the mounted View's document interaction plane.
 *
 * @param target - Native pointer target.
 * @param root - Product root used to reject sibling editors.
 * @returns Whether the pointer can begin document text selection.
 */
function isDocumentViewPointerTarget(
  target: EventTarget | null,
  root: HTMLElement
): boolean {
  const ElementConstructor = root.ownerDocument.defaultView?.Element;
  if (ElementConstructor === undefined || !(target instanceof ElementConstructor)) {
    return false;
  }
  const view = target.closest("[data-qk-view]");
  if (root.contains(target) && target.closest(".qk-classic-editor__touch-selection")) return true;
  return view !== null
    && root.contains(view)
    && target.closest("[data-qk-overlays]") === null;
}
