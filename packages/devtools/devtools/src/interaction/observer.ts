import type {
  QuireDevtoolsInteractionInput,
  QuireDevtoolsMount
} from "../types";
import { describeEventTarget, isIgnoredInteraction } from "./event-target";
import { observeQuireDevtoolsPointerDrag } from "./pointer-drag";

/** Options used by the browser interaction observer. */
export interface QuireDevtoolsInteractionObserverOptions {
  /**
   * Records one browser interaction start.
   *
   * @param input - Interaction metadata produced from a browser event.
   */
  readonly record: (input: QuireDevtoolsInteractionInput) => void;
}

/**
 * Observes editor-host browser events that can start an input-to-render trace.
 *
 * @param element - Host element whose descendant events should be traced.
 * @param options - Observer callbacks.
 * @returns Mounted observer handle.
 */
export function observeQuireDevtoolsInteractions(
  element: HTMLElement,
  options: QuireDevtoolsInteractionObserverOptions
): QuireDevtoolsMount {
  const onBeforeInput = (event: Event): void => {
    if (isIgnoredInteraction(event.target)) return;
    const inputEvent = event as InputEvent;

    options.record({
      source: "beforeinput",
      label: inputEvent.inputType || "beforeinput",
      ...(inputEvent.inputType ? { inputType: inputEvent.inputType } : {}),
      target: describeEventTarget(event.target)
    });
  };
  const onCompositionStart = (event: Event): void => {
    if (isIgnoredInteraction(event.target)) return;
    options.record({
      source: "compositionstart",
      label: "composition start",
      target: describeEventTarget(event.target)
    });
  };
  const onCompositionEnd = (event: Event): void => {
    if (isIgnoredInteraction(event.target)) return;
    options.record({
      source: "compositionend",
      label: "composition end",
      target: describeEventTarget(event.target)
    });
  };
  const onKeydown = (event: Event): void => {
    if (isIgnoredInteraction(event.target)) return;
    const keyboardEvent = event as KeyboardEvent;

    if (!shouldTraceKeydown(keyboardEvent)) {
      return;
    }

    options.record({
      source: "keydown",
      label: keyboardEvent.key,
      key: keyboardEvent.key,
      target: describeEventTarget(event.target)
    });
  };
  const onPointerDown = (event: Event): void => {
    if (isIgnoredInteraction(event.target)) return;
    options.record({
      source: "pointerdown",
      label: "click to caret",
      target: describeEventTarget(event.target)
    });
  };
  const listenerOptions = { capture: true } as const;
  const pointerDrag = observeQuireDevtoolsPointerDrag(element, options.record);

  element.addEventListener("beforeinput", onBeforeInput, listenerOptions);
  element.addEventListener("compositionstart", onCompositionStart, listenerOptions);
  element.addEventListener("compositionend", onCompositionEnd, listenerOptions);
  element.addEventListener("keydown", onKeydown, listenerOptions);
  element.addEventListener("pointerdown", onPointerDown, listenerOptions);

  return {
    destroy: () => {
      pointerDrag.destroy();
      element.removeEventListener("beforeinput", onBeforeInput, listenerOptions);
      element.removeEventListener("compositionstart", onCompositionStart, listenerOptions);
      element.removeEventListener("compositionend", onCompositionEnd, listenerOptions);
      element.removeEventListener("keydown", onKeydown, listenerOptions);
      element.removeEventListener("pointerdown", onPointerDown, listenerOptions);
    }
  };
}

/**
 * Checks whether a keydown should start its own trace.
 *
 * Printable text keys are normally followed by `beforeinput`, which is the more
 * precise start marker. Navigation keys and shortcuts still need keydown traces.
 *
 * @param event - Keyboard event to classify.
 * @returns True when the keydown should be traced.
 */
function shouldTraceKeydown(event: KeyboardEvent): boolean {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  return event.key.length !== 1;
}
