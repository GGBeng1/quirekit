import { FakeSvgEventListeners } from "./events";
import { FakeSvgMountNode } from "./node";
import { queryFakeSvgDescendants } from "./query";
import { getFakeSvgBoundingClientRect } from "./rect";
import type { FakeSvgMountDocument } from "./document";

/** Fake element used by mounted SVG view tests. */
export class FakeSvgMountElement extends FakeSvgMountNode {
  /** Dataset assigned by runtime code. */
  readonly dataset: Record<string, string | undefined> = {};
  /** Inline style assigned by runtime code. */
  readonly style: Record<string, string | undefined> = {};
  /** Attributes assigned by runtime code. */
  readonly attributes: Record<string, string | undefined> = {};
  /** SVG className shape used by browser SVG elements. */
  readonly className: string | { baseVal: string };
  /** Whether focus has been requested on this element. */
  focused = false;
  private readonly listeners = new FakeSvgEventListeners();

  /**
   * Creates a fake element.
   *
   * @param tagName - Element tag name.
   * @param ownerDocument - Fake owner document.
   * @param svgElement - Whether this element should emulate SVG className.
   * @param nodeType - DOM nodeType exposed for PM DOMSerializer compatibility.
   */
  constructor(
    tagName: string,
    ownerDocument: FakeSvgMountDocument,
    svgElement: boolean,
    nodeType = 1
  ) {
    super(tagName, ownerDocument, nodeType);
    this.className = svgElement ? { baseVal: "" } : "";
  }

  /**
   * Clones this fake node for widget decoration tests.
   *
   * @param deep - Whether child nodes should be cloned.
   * @returns Cloned fake element.
   */
  cloneNode(deep = false): FakeSvgMountElement {
    const clone = new FakeSvgMountElement(
      this.tagName,
      this.ownerDocument,
      typeof this.className !== "string",
      this.nodeType
    );

    clone.textContent = this.textContent;
    clone.innerHTML = this.innerHTML;
    clone.value = this.value;
    clone.namespace = this.namespace;
    Object.assign(clone.dataset, this.dataset);
    Object.assign(clone.style, this.style);
    Object.assign(clone.attributes, this.attributes);

    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }

    return clone;
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
   * Assigns a namespaced attribute value.
   *
   * @param namespace - Attribute namespace URI.
   * @param name - Attribute name.
   * @param value - Attribute value.
   */
  setAttributeNS(namespace: string, name: string, value: string): void {
    this.attributes[`${namespace} ${name}`] = value;
  }

  /**
   * Reads an attribute value.
   *
   * @param name - Attribute name.
   * @returns Attribute value when assigned, or null.
   */
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  /**
   * Returns assigned attribute names with browser Element semantics.
   *
   * @returns Attribute names in insertion order.
   */
  getAttributeNames(): string[] {
    return Object.keys(this.attributes);
  }

  /**
   * Removes an attribute value.
   *
   * @param name - Attribute name.
   */
  removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  /**
   * Finds fake descendants for overlay synchronization tests.
   *
   * @param selector - CSS selector requested by runtime code.
   * @returns Matching fake descendants.
   */
  querySelectorAll(selector: string): FakeSvgMountElement[] {
    return queryFakeSvgDescendants(this, selector);
  }

  /**
   * Registers a fake DOM event listener.
   *
   * @param type - Event type.
   * @param listener - Event listener.
   */
  addEventListener(type: string, listener: EventListener): void {
    this.listeners.add(type, listener);
  }

  /**
   * Removes a fake DOM event listener.
   *
   * @param type - Event type.
   * @param listener - Event listener.
   */
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.remove(type, listener);
  }

  /**
   * Dispatches a fake DOM event to registered listeners.
   *
   * @param event - Event-like object to dispatch.
   * @returns Whether dispatch completed.
   */
  dispatchEvent(event: Event): boolean {
    return this.listeners.dispatch(this, event);
  }

  /**
   * Reads a deterministic display rectangle for mounted SVG tests.
   *
   * @returns DOMRect-like surface rectangle.
   */
  getBoundingClientRect(): DOMRect {
    return getFakeSvgBoundingClientRect(this);
  }

  /**
   * Reads deterministic SVG text width for browser-backed measurer tests.
   *
   * @returns Fake rendered text length.
   */
  getComputedTextLength(): number {
    return this.textContent.length * 11;
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
  }

  /**
   * Attempts to capture a pointer in fake DOM tests.
   *
   * @param pointerId - Browser pointer identifier.
   */
  setPointerCapture(pointerId: number): void {
    void pointerId;
  }

  /**
   * Checks whether this fake element owns a pointer capture.
   *
   * @param pointerId - Browser pointer identifier.
   * @returns Always false in the fake DOM.
   */
  hasPointerCapture(pointerId: number): boolean {
    void pointerId;
    return false;
  }

  /**
   * Releases a fake pointer capture.
   *
   * @param pointerId - Browser pointer identifier.
   */
  releasePointerCapture(pointerId: number): void {
    void pointerId;
  }
}
