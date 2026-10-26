import type { QuireRect } from "@quirekit/renderer";
import { createScrollListenerSet } from "./listener-set";
import type { EditorViewportScrollSourceOptions, ScrollSource } from "./types";

/**
 * Creates a scroll source backed by an editor-owned `overflow: auto` viewport.
 *
 * The visible region is read directly from the viewport's scroll offset and
 * client size, so the editor always knows its own scroll position. This is the
 * default model for a self-contained, code-editor-style editor.
 *
 * @param options - The inner viewport element to observe.
 * @returns Scroll source reporting the viewport's visible document region.
 */
export function createEditorViewportScrollSource(
  options: EditorViewportScrollSourceOptions
): ScrollSource {
  const { viewport } = options;
  const listeners = createScrollListenerSet();
  const ownerWindow = viewport.ownerDocument.defaultView;
  const handleChange = (): void => {
    listeners.notify();
  };

  viewport.addEventListener("scroll", handleChange, { passive: true });

  const ResizeObserverCtor = ownerWindow?.ResizeObserver;
  const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(handleChange) : undefined;

  resizeObserver?.observe(viewport);

  return {
    getVisibleRegion(): QuireRect {
      return {
        x: viewport.scrollLeft || 0,
        y: viewport.scrollTop || 0,
        width: viewport.clientWidth || 0,
        height: viewport.clientHeight || 0
      };
    },
    subscribe(listener: () => void): () => void {
      return listeners.add(listener);
    },
    scrollByDocument(deltaY: number): void {
      viewport.scrollTop += deltaY;
    },
    destroy(): void {
      viewport.removeEventListener("scroll", handleChange);
      resizeObserver?.disconnect();
      listeners.clear();
    }
  };
}
