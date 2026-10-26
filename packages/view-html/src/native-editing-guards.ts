import type { HtmlMountedViewElements } from "./types";

/** Options used to prevent browser-native editing inside HTML mode. */
export interface BindHtmlMountedNativeEditingGuardsOptions {
  /** Elements owned by the mounted HTML view. */
  readonly elements: HtmlMountedViewElements;
  /** Focuses the mounted view input proxy after native edit attempts. */
  readonly focus: () => void;
  /** Routes events through exact NodeView ownership before editor interception. */
  readonly stopEvent: (event: Event) => boolean;
}

/**
 * Prevents retained semantic DOM from becoming a second native editing host.
 *
 * Composition events are accepted only by the shared input proxy. Exact custom
 * NodeView controls may stop ownership first and keep their native behavior.
 *
 * @param options - Mounted elements and focus callback.
 * @returns Cleanup function for all native editing guard listeners.
 */
export function bindHtmlMountedNativeEditingGuards(
  options: BindHtmlMountedNativeEditingGuardsOptions
): () => void {
  const removeListeners: Array<() => void> = [];

  /**
   * Redirects any accidental native editing attempt to the IME input proxy.
   *
   * @param event - Native browser editing event.
   */
  const preventNativeEdit = (event: Event): void => {
    if (options.stopEvent(event)) {
      return;
    }
    event.preventDefault();
    options.focus();
  };

  addHtmlMountedEventListener(
    removeListeners,
    options.elements.contentSurface,
    "beforeinput",
    preventNativeEdit
  );
  addHtmlMountedEventListener(
    removeListeners,
    options.elements.contentSurface,
    "input",
    preventNativeEdit
  );
  addHtmlMountedEventListener(
    removeListeners,
    options.elements.contentSurface,
    "compositionstart",
    preventNativeEdit
  );

  return () => {
    for (const removeListener of removeListeners.splice(0)) {
      removeListener();
    }
  };
}

/**
 * Adds one DOM event listener owned by this mounted native editing guard.
 *
 * @param removeListeners - Listener cleanup registry.
 * @param target - Event target receiving the listener.
 * @param type - Browser event type.
 * @param listener - Event listener to register.
 */
function addHtmlMountedEventListener(
  removeListeners: Array<() => void>,
  target: EventTarget,
  type: string,
  listener: EventListener
): void {
  target.addEventListener(type, listener);
  removeListeners.push(() => {
    target.removeEventListener(type, listener);
  });
}
