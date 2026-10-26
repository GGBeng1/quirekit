import { FakeCanvasMountContext } from "./context";
import { parseCssPixelValue } from "./css";
import { collectFakeOverlayDescendants } from "./overlays";
import type { FakeCanvasMountDocument } from "./document";

/** Fake element used by mounted canvas view tests. */
export class FakeCanvasMountElement {
  /** Child elements appended to this fake element. */
  readonly children: FakeCanvasMountElement[] = [];
  /** Dataset assigned by runtime code. */
  readonly dataset: Record<string, string | undefined> = {};
  /** Inline style assigned by runtime code. */
  readonly style: Record<string, string | undefined> = {};
  /** Attributes assigned by runtime code. */
  readonly attributes: Record<string, string | undefined> = {};
  /** Canvas backing width assigned by runtime code. */
  width = 0;
  /** Canvas backing height assigned by runtime code. */
  height = 0;
  /** CSS class assigned by runtime code. */
  className = "";
  /** Whether focus has been requested on this element. */
  focused = false;
  /** Textarea value used by input binding tests. */
  value = "";
  /** Start offset of the fake text selection. */
  selectionStart = 0;
  /** End offset of the fake text selection. */
  selectionEnd = 0;
  /** Number of blur requests made on this fake element. */
  blurCallCount = 0;
  /** Horizontal scroll offset read by the editor-owned viewport scroll source. */
  scrollLeft = 0;
  /** Vertical scroll offset read by the editor-owned viewport scroll source. */
  scrollTop = 0;
  /** Visible client width read by the editor-owned viewport scroll source. */
  clientWidth = 0;
  /** Visible client height read by the editor-owned viewport scroll source. */
  clientHeight = 0;
  private readonly context: FakeCanvasMountContext | null;
  private readonly listeners = new Map<string, EventListener[]>();
  private parent: FakeCanvasMountElement | null = null;

  /**
   * Creates a fake element.
   *
   * @param tagName - Element tag name.
   * @param ownerDocument - Fake owner document.
   */
  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeCanvasMountDocument
  ) {
    this.context = tagName === "canvas" ? new FakeCanvasMountContext() : null;
  }

  /** Parent element exposed with browser DOM semantics. */
  get parentElement(): FakeCanvasMountElement | null {
    return this.parent;
  }

  /**
   * Appends a fake child element.
   *
   * @param child - Child element to append.
   * @returns Appended child element.
   */
  appendChild(child: FakeCanvasMountElement): FakeCanvasMountElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /**
   * Assigns an attribute value.
   *
   * @param name - Attribute name.
   * @param value - Attribute value.
   */
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  /**
   * Reads an assigned attribute value.
   *
   * @param name - Attribute name to read.
   * @returns Assigned value, or null when absent.
   */
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  /**
   * Removes an attribute from this fake element.
   *
   * @param name - Attribute name.
   */
  removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  /** Records a focus request. */
  focus(): void {
    this.ownerDocument.activeElement = this;
    this.focused = true;
  }

  /** Records a blur request. */
  blur(): void {
    if (this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = null;
    }

    this.focused = false;
    this.blurCallCount += 1;
  }

  /**
   * Records a textarea selection range.
   *
   * @param start - Selection start offset.
   * @param end - Selection end offset.
   */
  setSelectionRange(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  /**
   * Adds a fake event listener.
   *
   * @param type - Event type to bind.
   * @param listener - Listener to register.
   */
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];

    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  /**
   * Removes a fake event listener.
   *
   * @param type - Event type to unbind.
   * @param listener - Listener to remove.
   */
  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];

    this.listeners.set(
      type,
      listeners.filter((entry) => entry !== listener)
    );
  }

  /**
   * Dispatches a fake event to registered listeners.
   *
   * @param event - Event-like payload to dispatch.
   * @returns Whether dispatch completed.
   */
  dispatchEvent(event: Event & { type: string }): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }

    return true;
  }

  /**
   * Reads registered listener count for assertions.
   *
   * @param type - Event type to inspect.
   * @returns Number of registered listeners.
   */
  listenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }

  /**
   * Finds descendants that match the limited selectors used by canvas overlays.
   *
   * @param selector - Selector to query.
   * @returns Matching descendant elements.
   */
  querySelectorAll(selector: string): FakeCanvasMountElement[] {
    if (selector !== "[data-quirekit-overlay-id]") {
      return [];
    }

    return collectFakeOverlayDescendants(this);
  }

  /**
   * Returns a DOMRect-like display rectangle for this fake element.
   *
   * @returns Fake client rectangle.
   */
  getBoundingClientRect(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  } {
    const parentRect = this.parent?.getBoundingClientRect();
    return {
      left: (parentRect?.left ?? 0) - (this.parent?.scrollLeft ?? 0),
      top: (parentRect?.top ?? 0) - (this.parent?.scrollTop ?? 0),
      width: parseCssPixelValue(this.style.width) ?? this.width,
      height: parseCssPixelValue(this.style.height) ?? this.height
    };
  }

  /**
   * Resolves a fake 2D context for canvas elements.
   *
   * @param contextId - Requested context identifier.
   * @returns Fake Canvas 2D context when available.
   */
  getContext(contextId: string): FakeCanvasMountContext | null {
    if (contextId !== "2d") {
      return null;
    }

    return this.context;
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
