import { onBeforeUnmount, shallowRef, watch, type ShallowRef } from "vue";
import type { MsfeEditor } from "@quirekit/msfe-core";

/** Hover state for a popover attached to links inside the editor. */
export interface LinkHover<T> {
  /** Fixed viewport position under the hovered link while the popover is open. */ readonly anchor: ShallowRef<{ left: string; top: string } | null>;
  /** Loaded content for the open popover. */ readonly content: ShallowRef<T | null>;
  /** Keeps the popover while the pointer is inside it. */ readonly keepOpen: () => void;
  /** Closes after a delay so the pointer can move into the popover. */ readonly scheduleClose: () => void;
  /** Closes immediately and cancels a pending load. */ readonly close: () => void;
}

const openDelay = 300, closeDelay = 180;

/**
 * Opens a popover after hovering a matching link. Pointer events are delegated on the editor root, so it
 * does no work while typing and nothing per link.
 * @param editor - Mounted editor whose links are hovered.
 * @param match - Returns the hovered link for an event target, if it belongs to this popover.
 * @param load - Loads content for a link; null keeps the popover closed.
 * @returns Popover state and handlers.
 */
export function useLinkHover<T>(editor: () => MsfeEditor, match: (target: EventTarget | null) => HTMLElement | null,
  load: (link: HTMLElement, signal: AbortSignal) => Promise<T | null>): LinkHover<T> {
  const anchor = shallowRef<{ left: string; top: string } | null>(null);
  const content = shallowRef<T | null>(null);
  let current: HTMLElement | null = null, controller: AbortController | null = null;
  let openTimer: ReturnType<typeof setTimeout> | undefined, closeTimer: ReturnType<typeof setTimeout> | undefined;

  /** @param link - Hovered link; opens after a short delay and only when content loads. */
  function scheduleOpen(link: HTMLElement): void {
    clearTimeout(closeTimer);
    if (link === current) return;
    clearTimeout(openTimer);
    controller?.abort();
    openTimer = setTimeout(async () => {
      if (!link.isConnected) return;
      current = link;
      const request = controller = new AbortController();
      try {
        const loaded = await load(link, request.signal);
        if (current !== link || request.signal.aborted || !loaded || !link.isConnected) return;
        const rect = link.getBoundingClientRect();
        content.value = loaded;
        anchor.value = { left: `${rect.left}px`, top: `${rect.bottom}px` };
      } catch { /* A failed load simply does not open; the next hover retries. */ }
    }, openDelay);
  }

  /** Closes after a delay so the pointer can move into the popover. */
  function scheduleClose(): void {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, closeDelay);
  }

  /** Keeps the popover while the pointer is inside it. */
  function keepOpen(): void { clearTimeout(closeTimer); }

  /** Closes immediately and cancels a pending load. */
  function close(): void {
    clearTimeout(openTimer);
    controller?.abort();
    current = null;
    anchor.value = null;
  }

  /** @param event - Delegated pointer entry. */
  function over(event: PointerEvent): void {
    const link = match(event.target);
    if (link) scheduleOpen(link);
  }

  /** @param event - Delegated pointer exit; moving within the same link keeps it. */
  function out(event: PointerEvent): void {
    if (!match(event.target) || match(event.relatedTarget) === current) return;
    scheduleClose();
  }

  watch(editor, (owner, _previous, cleanup) => {
    const element = owner.element, win = element.ownerDocument.defaultView!;
    element.addEventListener("pointerover", over);
    element.addEventListener("pointerout", out);
    win.addEventListener("scroll", close, { capture: true, passive: true });
    cleanup(() => {
      element.removeEventListener("pointerover", over);
      element.removeEventListener("pointerout", out);
      win.removeEventListener("scroll", close, true);
      close();
    });
  }, { immediate: true });

  onBeforeUnmount(() => { clearTimeout(openTimer); clearTimeout(closeTimer); controller?.abort(); });
  return { anchor, content, keepOpen, scheduleClose, close };
}
