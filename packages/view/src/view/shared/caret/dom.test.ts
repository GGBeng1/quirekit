import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MountedDomCaret } from "./dom";
import type { MountedDomCaretPlacement } from "./types";

/** Minimal fake element used by the DOM caret tests. */
class FakeCaretElement {
  readonly children: FakeCaretElement[] = [];
  readonly style: FakeCaretStyle = createFakeCaretStyle();
  readonly dataset: Record<string, string | undefined> = {};
  className = "";
  private parent: FakeCaretElement | null = null;

  /**
   * Appends a child element.
   *
   * @param child - Child element to append.
   * @returns Appended child element.
   */
  appendChild(child: FakeCaretElement): FakeCaretElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /** Removes this element from its parent. */
  remove(): void {
    if (!this.parent) {
      return;
    }

    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
}

/** Fake inline style object that records property writes. */
interface FakeCaretStyle {
  /** Property values written during the test, grouped by property name. */
  readonly writes: Record<string, string[]>;
  /** CSS property values assigned by the caret controller. */
  [property: string]: string | Record<string, string[]> | undefined;
}

/**
 * Creates a fake inline style object that behaves like a writable record.
 *
 * @returns Fake style declaration with write history.
 */
function createFakeCaretStyle(): FakeCaretStyle {
  const writes: Record<string, string[]> = {};

  return new Proxy({ writes } as FakeCaretStyle, {
    /**
     * Records style assignment history before applying the write.
     *
     * @param target - Fake style object receiving the assignment.
     * @param property - Style property being assigned.
     * @param value - Assigned CSS value.
     * @returns Whether the property write succeeded.
     */
    set(target, property, value) {
      if (typeof property === "string" && property !== "writes") {
        (writes[property] ??= []).push(String(value));
      }

      return Reflect.set(target, property, value);
    }
  });
}

/** Minimal fake document with an optional reduced-motion preference. */
class FakeCaretDocument {
  readonly defaultView: { matchMedia(query: string): { readonly matches: boolean } } | undefined;

  /**
   * Creates a fake document.
   *
   * @param reducedMotion - Whether the window reports a reduced-motion preference.
   */
  constructor(reducedMotion?: boolean) {
    this.defaultView = reducedMotion === undefined ? undefined : {
      matchMedia: (query) => ({
        matches: reducedMotion && query === "(prefers-reduced-motion: reduce)"
      })
    };
  }

  /**
   * Creates a fake element.
   *
   * @returns Fake caret element.
   */
  createElement(): FakeCaretElement {
    return new FakeCaretElement();
  }
}

/**
 * Creates a DOM caret over a fresh fake host.
 *
 * @param mode - Optional initial caret mode.
 * @param reducedMotion - Optional reduced-motion preference of the fake window.
 * @returns Caret controller, its element, and the host element.
 */
function createDomCaret(mode?: "blink" | "steady" | "hidden", reducedMotion?: boolean): {
  readonly caret: MountedDomCaret;
  readonly element: FakeCaretElement;
  readonly host: FakeCaretElement;
} {
  const ownerDocument = new FakeCaretDocument(reducedMotion);
  const host = new FakeCaretElement();
  const caret = new MountedDomCaret({
    ownerDocument: ownerDocument as unknown as Document,
    host: host as unknown as HTMLElement,
    className: "qk-test__caret",
    ...(mode === undefined ? {} : { mode })
  });

  return {
    caret,
    element: caret.caretElement as unknown as FakeCaretElement,
    host
  };
}

const placement: MountedDomCaretPlacement = {
  left: 12,
  top: 34,
  width: 2,
  height: 18,
  color: "#0f172a"
};

/**
 * Reads recorded style writes from a fake caret element.
 *
 * @param element - Fake caret element to inspect.
 * @param property - Style property whose write history should be returned.
 * @returns Recorded values assigned to the property.
 */
function readStyleWrites(
  element: FakeCaretElement,
  property: string
): readonly string[] {
  return element.style.writes[property] ?? [];
}

describe("MountedDomCaret", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a pointer-events-none caret element in the host", () => {
    const { element, host } = createDomCaret();

    expect(host.children).toHaveLength(1);
    expect(element.className).toBe("qk-test__caret");
    expect(element.dataset.qkCaret).toBe("");
    expect(element.style.position).toBe("absolute");
    expect(element.style.pointerEvents).toBe("none");
    expect(element.style.display).toBe("none");
  });

  it("positions and blinks the caret while focused and editable", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(true, true, placement);

    expect(element.style.left).toBe("12px");
    expect(element.style.top).toBe("34px");
    expect(element.style.width).toBe("2px");
    expect(element.style.height).toBe("18px");
    expect(element.style.backgroundColor).toBe("#0f172a");
    expect(element.style.display).toBe("block");
    expect(element.style.visibility).toBe("visible");
    expect(element.dataset.qkCaretState).toBe("blink");

    vi.advanceTimersByTime(530);
    expect(element.style.visibility).toBe("hidden");
    vi.advanceTimersByTime(530);
    expect(element.style.visibility).toBe("visible");
  });

  it("never runs an infinite CSS animation for the blink", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(true, true, placement);
    vi.advanceTimersByTime(530);

    expect(readStyleWrites(element, "animation")).toEqual([]);
  });

  it("keeps the blink phase across renders that do not move the caret", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(true, true, placement);
    vi.advanceTimersByTime(530);
    caret.syncAfterRender(true, true, placement);

    expect(element.style.visibility).toBe("hidden");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("shows a steady caret without animation when editable but unfocused", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(false, true, placement);

    expect(element.style.display).toBe("block");
    expect(element.dataset.qkCaretState).toBe("steady");
    vi.advanceTimersByTime(2000);
    expect(element.style.visibility).toBe("visible");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a focused caret steady under a reduced-motion preference", () => {
    const { caret, element } = createDomCaret(undefined, true);

    caret.syncAfterRender(true, true, placement);

    expect(element.dataset.qkCaretState).toBe("steady");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("hides the caret in read-only views", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(true, false, placement);

    expect(element.style.display).toBe("none");
    expect(element.dataset.qkCaretState).toBe("hidden");
  });

  it("never shows the caret in hidden mode", () => {
    const { caret, element } = createDomCaret("hidden");

    caret.syncAfterRender(true, true, placement);

    expect(element.style.display).toBe("none");
  });

  it("hides the caret when the selection has no caret geometry", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(true, true, placement);
    expect(element.style.display).toBe("block");

    caret.syncAfterRender(true, true, undefined);
    expect(element.style.display).toBe("none");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("toggles blinking when focus changes after a render", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(false, true, placement);
    expect(element.dataset.qkCaretState).toBe("steady");

    caret.setFocused(true, true);
    expect(element.dataset.qkCaretState).toBe("blink");

    vi.advanceTimersByTime(530);
    caret.setFocused(false, true);
    expect(element.dataset.qkCaretState).toBe("steady");
    expect(element.style.visibility).toBe("visible");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarts blinking from the shown phase when caret placement changes", () => {
    const { caret, element } = createDomCaret();

    caret.syncAfterRender(true, true, placement);
    vi.advanceTimersByTime(530);
    expect(element.style.visibility).toBe("hidden");

    caret.syncAfterRender(true, true, {
      ...placement,
      left: placement.left + 20
    });

    expect(element.style.visibility).toBe("visible");
    vi.advanceTimersByTime(529);
    expect(element.style.visibility).toBe("visible");
    vi.advanceTimersByTime(1);
    expect(element.style.visibility).toBe("hidden");
  });

  it("stops blinking and removes the caret element on destroy", () => {
    const { caret, host } = createDomCaret();

    caret.syncAfterRender(true, true, placement);
    caret.destroy();

    expect(host.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
