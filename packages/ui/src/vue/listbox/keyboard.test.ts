import { describe, expect, it, vi } from "vitest";
import { guardListboxActivation } from "./keyboard";

/**
 * Creates a cancelable native event without requiring a browser test environment.
 *
 * @param key - Browser key value.
 * @param composing - Whether a native composition is in progress.
 * @param keyCode - Legacy composition marker used by some browser input paths.
 * @returns The event supplied to the capture guard and the later machine listener.
 */
function keyEvent(key: string, composing = false, keyCode = 0): KeyboardEvent {
  return Object.assign(new Event("keydown", { cancelable: true }), {
    key, isComposing: composing, keyCode
  }) as KeyboardEvent;
}

describe("Listbox activation boundary", () => {
  it("consumes Space scrolling while delivering exactly one activation to the existing machine", () => {
    const content = new EventTarget();
    const receive = vi.fn();
    content.addEventListener("keydown", event => guardListboxActivation(event as KeyboardEvent, false, false));
    content.addEventListener("keydown", receive);
    const event = keyEvent(" ");
    expect(content.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(receive).toHaveBeenCalledExactlyOnceWith(event);
  });

  it("blocks both activation keys after the highlighted selection becomes disabled", () => {
    const content = new EventTarget();
    let highlightedDisabled = false;
    const receive = vi.fn();
    content.addEventListener("keydown", event => guardListboxActivation(event as KeyboardEvent, false, highlightedDisabled));
    content.addEventListener("keydown", receive);
    content.dispatchEvent(keyEvent("Enter"));
    expect(receive).toHaveBeenCalledTimes(1);
    highlightedDisabled = true;
    for (const key of ["Enter", " "]) {
      const event = keyEvent(key);
      expect(content.dispatchEvent(event)).toBe(false);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(receive).toHaveBeenCalledTimes(1);
    highlightedDisabled = false;
    content.dispatchEvent(keyEvent("Enter"));
    expect(receive).toHaveBeenCalledTimes(2);
  });

  it("respects host cancellation and native composition without cancelling composition defaults", () => {
    for (const key of ["Enter", " "]) {
      for (const event of [keyEvent(key, true), keyEvent(key, false, 229), keyEvent(key)]) {
        const cancelledByHost = !event.isComposing && event.keyCode !== 229;
        if (cancelledByHost) event.preventDefault();
        const content = new EventTarget();
        const receive = vi.fn();
        content.addEventListener("keydown", event => guardListboxActivation(event as KeyboardEvent, false, false));
        content.addEventListener("keydown", receive);
        content.dispatchEvent(event);
        expect(receive).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(cancelledByHost);
      }
    }
  });

  it("leaves ordinary navigation and the global disabled gate to Ark", () => {
    for (const [key, disabled] of [["ArrowDown", false], ["Enter", false], [" ", true]] as const) {
      const content = new EventTarget();
      const receive = vi.fn();
      content.addEventListener("keydown", event => guardListboxActivation(event as KeyboardEvent, disabled, false));
      content.addEventListener("keydown", receive);
      const event = keyEvent(key);
      content.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(receive).toHaveBeenCalledExactlyOnceWith(event);
    }
  });
});
