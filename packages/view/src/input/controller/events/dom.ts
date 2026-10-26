import type {
  QuireBeforeInputEvent,
  QuireClipboardEvent,
  QuireCompositionInputEvent,
  QuireKeyboardInputEvent
} from "../../types";

/**
 * Creates a synthetic keyboard event for beforeinput fallbacks.
 *
 * @param key - KeyboardEvent key value.
 * @param options - Optional modifier facts for the synthetic key.
 * @returns DOM-light keyboard event.
 */
export function createSyntheticKeyboardEvent(
  key: string,
  options: { readonly shiftKey?: boolean | undefined } = {}
): QuireKeyboardInputEvent {
  return {
    key,
    keyCode: keyCodeForKey(key),
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: options.shiftKey ?? false
  };
}

/**
 * Creates a DOM-light InputEvent with the methods expected by PM plugins.
 *
 * @param event - Canvas beforeinput event.
 * @returns InputEvent-compatible object.
 */
export function createBeforeInputEvent(event: QuireBeforeInputEvent): Event {
  let defaultPrevented = false;

  return {
    ...event,
    type: "beforeinput",
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: () => {
      defaultPrevented = true;
      event.preventDefault?.();
    }
  } as unknown as Event;
}

/**
 * Creates a DOM-light ClipboardEvent for PM-compatible paste handlers.
 *
 * @param event - Canvas clipboard event payload.
 * @returns ClipboardEvent-compatible object.
 */
export function createClipboardEvent(event: QuireClipboardEvent): ClipboardEvent {
  let defaultPrevented = false;

  return {
    type: "paste",
    clipboardData: event.clipboardData ?? null,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: () => {
      defaultPrevented = true;
      event.preventDefault?.();
    }
  } as unknown as ClipboardEvent;
}

/**
 * Creates a DOM-light KeyboardEvent with browser-compatible key fields.
 *
 * @param event - Canvas keyboard event.
 * @returns KeyboardEvent-compatible object.
 */
export function createKeyboardEvent(event: QuireKeyboardInputEvent): KeyboardEvent {
  const keyCode = event.keyCode ?? keyCodeForKey(event.key);

  return {
    ...event,
    keyCode,
    which: keyCode,
    code: codeForKey(event.key),
    altKey: event.altKey ?? false,
    ctrlKey: event.ctrlKey ?? false,
    isComposing: event.isComposing ?? false,
    metaKey: event.metaKey ?? false,
    shiftKey: event.shiftKey ?? false,
    preventDefault: event.preventDefault ?? (() => {})
  } as unknown as KeyboardEvent;
}

/**
 * Creates a DOM-light CompositionEvent consumed by PM plugin hooks.
 *
 * @param type - Composition event type.
 * @param event - Canvas composition event payload.
 * @param isComposing - Whether the synthetic view is currently composing.
 * @returns CompositionEvent-compatible object.
 */
export function createCompositionEvent(
  type: "compositionstart" | "compositionupdate" | "compositionend",
  event: QuireCompositionInputEvent | undefined,
  isComposing: boolean
): CompositionEvent {
  return {
    type,
    data: event?.data ?? "",
    isComposing,
    preventDefault: () => {}
  } as unknown as CompositionEvent;
}

/**
 * Resolves legacy KeyboardEvent keyCode values for editing keys.
 *
 * @param key - KeyboardEvent key value.
 * @returns Legacy keyCode value.
 */
function keyCodeForKey(key: string): number {
  switch (key) {
    case "Backspace":
      return 8;
    case "Enter":
      return 13;
    case "Delete":
      return 46;
    case "Home":
      return 36;
    case "End":
      return 35;
    case "PageUp":
      return 33;
    case "PageDown":
      return 34;
    case "ArrowLeft":
      return 37;
    case "ArrowRight":
      return 39;
    case "ArrowUp":
      return 38;
    case "ArrowDown":
      return 40;
    default:
      return key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
  }
}

/**
 * Resolves common KeyboardEvent code values for editing keys.
 *
 * @param key - KeyboardEvent key value.
 * @returns KeyboardEvent code value.
 */
function codeForKey(key: string): string {
  switch (key) {
    case "Backspace":
    case "Enter":
    case "Delete":
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return key;
    default:
      return key.length === 1 ? `Key${key.toUpperCase()}` : "";
  }
}
