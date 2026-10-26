/** Browser event handlers owned by a mounted input binding. */
export interface QuireMountedInputEventHandlers {
  /**
   * Handles browser beforeinput events.
   *
   * @param event - Browser beforeinput event.
   */
  readonly beforeinput: (event: Event) => void;
  /**
   * Handles browser keydown events.
   *
   * @param event - Browser keydown event.
   */
  readonly keydown: (event: Event) => void;
  /**
   * Handles browser keyup events used as selection-gesture completion boundaries.
   *
   * @param event - Browser keyup event.
   */
  readonly keyup: (event: Event) => void;
  /**
   * Handles browser input events.
   *
   * @param event - Browser input event.
   */
  readonly input: (event: Event) => void;
  /**
   * Handles IME compositionstart events.
   *
   * @param event - Browser compositionstart event.
   */
  readonly compositionstart: (event: Event) => void;
  /**
   * Handles IME compositionupdate events.
   *
   * @param event - Browser compositionupdate event.
   */
  readonly compositionupdate: (event: Event) => void;
  /**
   * Handles IME compositionend events.
   *
   * @param event - Browser compositionend event.
   */
  readonly compositionend: (event: Event) => void;
  /**
   * Handles copy events.
   *
   * @param event - Browser copy event.
   */
  readonly copy: (event: Event) => void;
  /**
   * Handles cut events.
   *
   * @param event - Browser cut event.
   */
  readonly cut: (event: Event) => void;
  /**
   * Handles paste events.
   *
   * @param event - Browser paste event.
   */
  readonly paste: (event: Event) => void;
  /**
   * Handles focus events.
   *
   * @param event - Browser focus event.
   */
  readonly focus: (event: FocusEvent) => void;
  /**
   * Handles blur events.
   *
   * @param event - Browser blur event.
   */
  readonly blur: (event: FocusEvent) => void;
}

/** Input proxy event names with handlers owned by a mounted binding. */
const mountedInputProxyEventNames = [
  "beforeinput",
  "keydown",
  "keyup",
  "input",
  "compositionstart",
  "compositionupdate",
  "compositionend",
  "copy",
  "cut",
  "paste",
  "focus",
  "blur"
] as const;

/**
 * Binds browser input events to the hidden input proxy.
 *
 * @param inputProxy - Textarea input proxy owned by the mounted view.
 * @param handlers - Event handlers bound to the mounted input lifecycle.
 * @param observe - Optional native-session observer run before JS event routing.
 * @param route - Optional coordinator around the existing handler.
 * @returns Cleanup function for all bound input proxy listeners.
 */
export function bindQuireMountedInputProxyEventListeners(
  inputProxy: HTMLTextAreaElement,
  handlers: QuireMountedInputEventHandlers,
  observe?: (event: Event) => void,
  route?: (event: Event, handle: () => void) => void
): () => void {
  const removeListeners: Array<() => void> = [];

  for (const type of mountedInputProxyEventNames) {
    const handler = handlers[type] as EventListener;
    const listener: EventListener = (event) => {
      observe?.(event);
      if (route) route(event, () => handler(event));
      else handler(event);
    };

    inputProxy.addEventListener(type, listener);
    removeListeners.push(() => {
      inputProxy.removeEventListener(type, listener);
    });
  }

  return () => {
    for (const removeListener of removeListeners.splice(0)) {
      removeListener();
    }
  };
}
