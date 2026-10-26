import { watch, type Ref } from "vue";
import { NodeSelection } from "@quirekit/pm";
import type { RichContentSurface } from "../../rich-content/types";

const observers = new WeakMap<Document, ReturnType<typeof createObserver>>();

/** @param document - Parent browsing context. @returns One indexed focus observer shared by its previews. */
function createObserver(document: Document) {
  const window = document.defaultView!, frames = new Map<Element, () => void>();
  let pending: number | undefined;
  let candidate: Element | undefined, request: number | undefined;
  /** Ends the transient gap observer when the pointer leaves, focus arrives, or its owner disappears. */
  function stop(): void {
    if (request !== undefined) window.cancelAnimationFrame(request);
    candidate = undefined; request = undefined;
  }
  /**
   * Switching guest windows, or removing a focused guest, may emit no parent focus event. While the
   * pointer is over that one unfocused frame, inspect activeElement once per frame until entry.
   */
  function follow(): void {
    request = undefined;
    if (!candidate?.isConnected || !frames.has(candidate) || !document.hasFocus()) { stop(); return; }
    const active = document.activeElement;
    if (active === candidate) { const callback = frames.get(candidate); stop(); callback?.(); }
    else request = window.requestAnimationFrame(follow);
  }
  /** @param event - Pointer crossing between the parent document and a guest container. */
  function enter(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (!target || !frames.has(target)) return;
    if (document.activeElement !== target) {
      stop(); candidate = target; request = window.requestAnimationFrame(follow);
    }
  }
  /** @param event - Leaving a guest must not leave an idle focus poll running. */
  function leave(event: PointerEvent): void { if (event.target === candidate) stop(); }
  /** Resolves only the active container; guest documents stay inaccessible across the sandbox boundary. */
  function activate(): void {
    if (pending !== undefined) { window.clearTimeout(pending); pending = undefined; }
    if (!document.hasFocus()) { stop(); return; }
    const frame = document.activeElement;
    if (frame === candidate || frame?.tagName !== "IFRAME") stop();
    if (frame?.isConnected) frames.get(frame)?.();
  }
  /** Focus may still be on body during window blur; inspect it once after the browser completes its focus steps. */
  function blur(): void { pending ??= window.setTimeout(activate, 0); }
  window.addEventListener("blur", blur);
  document.addEventListener("focusin", activate);
  document.addEventListener("pointerover", enter); document.addEventListener("pointerout", leave);
  return { frames,
    /** Releases the shared listeners when no preview remains. */
    destroy(): void {
      if (pending !== undefined) window.clearTimeout(pending);
      stop();
      window.removeEventListener("blur", blur); document.removeEventListener("focusin", activate);
      document.removeEventListener("pointerover", enter); document.removeEventListener("pointerout", leave);
      observers.delete(document);
    }
  };
}

/**
 * Observes a guest gaining focus without intercepting its first click or reading its DOM.
 * @param frame - Exact live browsing-context container.
 * @param activate - Host selection action, responsible for current permission and identity checks.
 * @returns Idempotent release, including any queued work after the last preview leaves.
 */
export function observeWebPreviewActivation(frame: HTMLIFrameElement, activate: () => void): () => void {
  const document = frame.ownerDocument;
  if (!document.defaultView) return () => {};
  let observer = observers.get(document);
  if (!observer) { observer = createObserver(document); observers.set(document, observer); }
  observer.frames.set(frame, activate);
  return () => {
    if (observer.frames.get(frame) !== activate) return;
    observer.frames.delete(frame);
    if (!observer.frames.size) observer.destroy();
  };
}

/** @param surface - Retained canonical node owner. @param frame - Current iframe, replaced on reload or mode changes. */
export function useWebPreviewActivation(surface: RichContentSurface, frame: Ref<HTMLIFrameElement | undefined>): void {
  watch(frame, (element, _previous, cleanup) => {
    if (!element) return;
    cleanup(observeWebPreviewActivation(element, () => {
      const editor = surface.editor, position = surface.position(), node = surface.snapshot();
      if (!editor.isEditable || !surface.dom.isConnected || position === undefined || node.attrs.mode !== "embed" || editor.state.doc.nodeAt(position) !== node) return;
      const selection = editor.state.pm.selection;
      if (!(selection instanceof NodeSelection && selection.from === position)) editor.commands.setNodeSelection(position);
    }));
  }, { flush: "post" });
}
